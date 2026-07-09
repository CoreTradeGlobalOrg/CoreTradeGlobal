/**
 * Globe rendering worker — v2 (three-globe polygon countries).
 *
 * Reimplements the hero globe on top of `three-globe` while keeping the
 * whole render loop, raycasting, and camera orbit off the main thread on
 * an OffscreenCanvas transferred from GlobeCanvas.jsx. The library is a
 * plain Three.js Object3D so it composes into our existing worker
 * scaffold; no react-globe.gl anywhere.
 *
 * Spec highlights (per CTG Yeni Küre Özellikler.docx):
 *  - Ocean: 1x1 canvas #0a1122 data URL (main thread posts it in on init)
 *  - Continents: matte slate grey #94a3b8, no shine (globeMaterial().color
 *    neutralized to #ffffff)
 *  - Borders: #0a1122 default, #FFD700 gold on hover / click
 *  - Atmosphere: #3b82f6 sky-blue at altitude 0.15
 *  - polygonAltitude locked at 0.01 (no dynamic hover height — spec calls
 *    out that dynamic altitude re-triangulates every hover and stutters)
 *  - polygonsTransitionDuration 0 (no CPU-heavy tween interpolation)
 *  - Custom orbit: enableZoom false, autoRotate on (speed 1.5 desktop,
 *    1.2 mobile), enableRotate desktop-only
 *  - Click a country -> smooth camera pointOfView tween from altitude
 *    2.2 -> 1.5 over 1000 ms, autoRotate off, selected polygon stays gold
 *  - Click ocean / close HUD -> tween back to altitude 2.2, autoRotate
 *    resumes, selection cleared
 *  - Trade routes and land-point dot earth from the previous globe are
 *    intentionally gone (spec rev drops both).
 *
 * three-globe reads window.THREE at module top-level; a worker has no
 * `window`, so we polyfill `globalThis.window = {}` BEFORE the library
 * runs. ES module static imports hoist above every other statement in
 * the module body, so a plain `import ThreeGlobe from 'three-globe'`
 * would execute the library's top-level code before the polyfill line
 * has actually run — that's exactly what killed the first preview
 * build (worker crashed on init with `ReferenceError: window is not
 * defined`, the `ready` postMessage never fired, and the hero stayed
 * on "Initializing WebGL Network…" forever). Loading three-globe with
 * dynamic `await import()` inside `init()` defers its evaluation until
 * after the polyfill has taken effect.
 */

// three-globe's frame-ticker dep calls window.requestAnimationFrame,
// tinycolor2 touches window when detecting global THREE, etc. An empty
// `{}` polyfill leaves those calls throwing "not a function". Aliasing
// `window` to `globalThis` in the worker exposes every DOM-shape API
// the worker actually implements (requestAnimationFrame,
// cancelAnimationFrame, setTimeout, fetch, performance, …) while
// keeping `window.THREE` undefined so three-globe still falls through
// to the imported Three.js classes.
if (typeof globalThis.window === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.window = globalThis;
}

import * as THREE from 'three';

let ThreeGlobe = null;

// ── Runtime state ────────────────────────────────────────────────────────────

let renderer = null;
let scene = null;
let camera = null;
let globe = null;
let raycaster = null;
let ndc = null;

let hoveredCountry = null;
let selectedCountry = null;
let visible = true;
let disposed = false;
let readyPosted = false;
let countriesLoaded = false;
let config = null;

const GLOBE_RADIUS = 100; // three-globe default
const DEFAULT_ALTITUDE = 2.2;
// Spec calls for 1.5 but that read as "sphere fills the frame and you
// can't tell what you clicked on" during preview review. Softer target
// still gives a clear zoom cue without occluding the surrounding ocean.
const CLICK_ALTITUDE = 1.8;

// Orbit camera state — replaces OrbitControls
const orbit = {
  target: new THREE.Vector3(0, 0, 0),
  radius: GLOBE_RADIUS * (1 + DEFAULT_ALTITUDE),
  azimuth: 0,
  polar: Math.PI / 2, // start at equator
  minPolar: 0.1,
  maxPolar: Math.PI - 0.1,
  dragging: false,
  lastX: 0,
  lastY: 0,
  velocityAzimuth: 0,
  velocityPolar: 0,
  damping: 0.05,
  autoRotate: true,
  autoRotateSpeed: 1.5, // desktop default (spec)
  enableRotate: true,
  rotateSpeed: 2 * Math.PI / 400,
};

// Camera pointOfView tween — used for click-to-zoom and reset
let cameraTween = null;

// Click guard (spec: 100 ms lock so onGlobeClick doesn't deselect the
// country we just clicked in the same tick).
let justClickedCountryAt = 0;

// Hover raycast throttle. Every pointermove used to fire a full
// intersectObject through the polygon layer, which meant hundreds of
// raycasts per second while the mouse skimmed the sphere. Now the
// worker just stores the latest hover coord and does at most one
// raycast per rAF tick — the CPU savings on the Activity Monitor
// reading are almost entirely from this change.
let pendingHover = null;

// ── Camera / orbit helpers ────────────────────────────────────────────────────

function altitudeToRadius(alt) {
  return GLOBE_RADIUS * (1 + alt);
}

function updateCameraFromOrbit() {
  // Camera position matches three-globe's own polar2Cartesian ordering
  // so that latLngToOrbit's azimuth = lng * π/180 lands the camera
  // directly over the requested country instead of on the antipode.
  //   x = r sin(polar) cos(azimuth) — was sin(azimuth) previously
  //   z = r sin(polar) sin(azimuth) — was cos(azimuth) previously
  const sinPolar = Math.sin(orbit.polar);
  camera.position.set(
    orbit.radius * sinPolar * Math.cos(orbit.azimuth),
    orbit.radius * Math.cos(orbit.polar),
    orbit.radius * sinPolar * Math.sin(orbit.azimuth)
  );
  camera.lookAt(orbit.target);
}

/**
 * Convert lat/lng (degrees) into orbit spherical coords so the camera
 * ends up looking at that country from the requested altitude.
 *
 * three-globe's polar2Cartesian uses phi = (90 - lat)°, theta =
 * (90 - lng)°, and places the point at
 *   x = r sin(phi) cos(theta), y = r cos(phi), z = r sin(phi) sin(theta).
 * Our updateCameraFromOrbit uses my_polar = phi and my_azimuth s.t.
 *   x = r sin(polar) sin(azimuth), y = r cos(polar), z = r sin(polar) cos(azimuth).
 * Matching the two gives azimuth = π/2 - theta = lng * π/180. The
 * previous v1 formula added an extra π/2 offset which put the camera
 * on the *opposite* side of the country — user saw the globe zoom in
 * but the target country was hidden behind the sphere ("kure buyuyor,
 * ulke gorunmuyor").
 */
function latLngToOrbit(lat, lng, altitude) {
  const polar = ((90 - lat) * Math.PI) / 180;
  const azimuth = (lng * Math.PI) / 180;
  const radius = altitudeToRadius(altitude);
  return { azimuth, polar, radius };
}

function startCameraTween(targetAzimuth, targetPolar, targetRadius, durationMs = 1000) {
  cameraTween = {
    startTime: performance.now(),
    duration: durationMs,
    fromAzimuth: orbit.azimuth,
    fromPolar: orbit.polar,
    fromRadius: orbit.radius,
    toAzimuth: targetAzimuth,
    toPolar: targetPolar,
    toRadius: targetRadius,
  };
}

// Ease-in-out cubic — matches OrbitControls' smoothing feel
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function stepCameraTween(now) {
  if (!cameraTween) return;
  const elapsed = now - cameraTween.startTime;
  const t = Math.min(1, elapsed / cameraTween.duration);
  const e = easeInOutCubic(t);

  // Shortest-arc lerp for azimuth so we don't spin the long way round.
  let dAz = cameraTween.toAzimuth - cameraTween.fromAzimuth;
  while (dAz > Math.PI) dAz -= 2 * Math.PI;
  while (dAz < -Math.PI) dAz += 2 * Math.PI;
  orbit.azimuth = cameraTween.fromAzimuth + dAz * e;

  orbit.polar = cameraTween.fromPolar + (cameraTween.toPolar - cameraTween.fromPolar) * e;
  orbit.radius = cameraTween.fromRadius + (cameraTween.toRadius - cameraTween.fromRadius) * e;

  if (t >= 1) cameraTween = null;
}

// ── three-globe polygon color functions ───────────────────────────────────────

function polygonCapColor(d) {
  if (d === selectedCountry) return '#FFD700';
  if (d === hoveredCountry) return '#FFD700';
  return '#94a3b8';
}

function polygonStrokeColor(d) {
  if (d === selectedCountry) return '#FFD700';
  if (d === hoveredCountry) return '#FFD700';
  return '#0a1122';
}

function refreshPolygonColors() {
  if (!globe) return;
  globe.polygonCapColor(polygonCapColor).polygonStrokeColor(polygonStrokeColor);
}

// ── Raycasting ───────────────────────────────────────────────────────────────

/**
 * Cast a ray from screen coords through the camera and return the
 * first three-globe polygon GeoJSON feature hit, or null.
 *
 * three-globe wraps every polygon in an internal singlePolygon object
 * shaped { id, data: <feature>, capColor, geoJson, ... } and attaches
 * the wrapper on the polygon Group as `group.__data`. The Group's
 * children are the actual meshes the raycaster returns, so we walk
 * parents from the hit mesh until we find the wrapper, then unwrap to
 * the source feature at `.data`. Fall through to the raw wrapper if
 * `.properties` is somehow already at the top level (defensive — this
 * covers other three-globe layer types that skip the wrapper).
 */
function pickPolygonAt(cssX, cssY, cssWidth, cssHeight) {
  if (!globe) return null;
  ndc.x = (cssX / cssWidth) * 2 - 1;
  ndc.y = -(cssY / cssHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(globe, true);
  for (const hit of hits) {
    let node = hit.object;
    while (node) {
      const bound = node.__data;
      if (bound) {
        // Wrapper shape from three-globe polygon digest
        if (bound.data && bound.data.properties) return bound.data;
        // Raw feature (in case three-globe internals change)
        if (bound.properties) return bound;
      }
      node = node.parent;
    }
  }
  return null;
}

// ── RAF loop ─────────────────────────────────────────────────────────────────

let lastFrameTime = 0;

function animate(t) {
  if (disposed) return;
  requestAnimationFrame(animate);
  if (!visible || !renderer || !scene || !camera) return;

  const dt = lastFrameTime === 0 ? 1 / 60 : Math.min(0.1, (t - lastFrameTime) / 1000);
  lastFrameTime = t;

  // Camera tween wins over auto-rotate + damping while active.
  if (cameraTween) {
    stepCameraTween(t);
  } else {
    if (orbit.autoRotate && !orbit.dragging) {
      orbit.azimuth += ((2 * Math.PI) / 60) * orbit.autoRotateSpeed * dt;
    }
    if (orbit.enableRotate && !orbit.dragging) {
      orbit.azimuth += orbit.velocityAzimuth;
      orbit.polar += orbit.velocityPolar;
      orbit.velocityAzimuth *= 1 - orbit.damping;
      orbit.velocityPolar *= 1 - orbit.damping;
      if (Math.abs(orbit.velocityAzimuth) < 1e-5) orbit.velocityAzimuth = 0;
      if (Math.abs(orbit.velocityPolar) < 1e-5) orbit.velocityPolar = 0;
    }
  }

  if (orbit.polar < orbit.minPolar) orbit.polar = orbit.minPolar;
  if (orbit.polar > orbit.maxPolar) orbit.polar = orbit.maxPolar;

  updateCameraFromOrbit();

  // Flush the coalesced hover raycast — at most once per frame.
  if (pendingHover && countriesLoaded && !orbit.dragging) {
    const { x, y, cssWidth, cssHeight } = pendingHover;
    pendingHover = null;
    const hit = pickPolygonAt(x, y, cssWidth, cssHeight);
    if (hit !== hoveredCountry) {
      hoveredCountry = hit;
      refreshPolygonColors();
      self.postMessage({ type: 'hoverChanged', hovering: !!hit });
    }
  }

  // three-globe drives its own internal ticks via its animation system;
  // we just render each frame.
  renderer.render(scene, camera);
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init(msg) {
  try {
    await _initInner(msg);
  } catch (err) {
    // Surface the failure back to the main thread so the hero can drop
    // the loading text instead of hanging on it forever. The message
    // string is minimally-formatted so a console.error on the main side
    // is enough to diagnose.
    self.postMessage({
      type: 'error',
      where: 'init',
      message: err && err.message ? err.message : String(err),
    });
  }
}

async function _initInner({ canvas, width, height, dpr, isMobile }) {
  config = {
    isMobile,
    maxDpr: isMobile ? 1.5 : 2,
    // Detect low-end hardware inside worker via navigator.hardwareConcurrency.
    isLowEnd:
      isMobile ||
      (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4),
  };

  orbit.autoRotate = true;
  orbit.autoRotateSpeed = isMobile ? 1.2 : 1.5;
  orbit.enableRotate = !isMobile;
  orbit.velocityAzimuth = 0;
  orbit.velocityPolar = 0;
  orbit.radius = altitudeToRadius(DEFAULT_ALTITUDE);
  orbit.polar = Math.PI / 2;
  orbit.azimuth = 0;

  const clampedDpr = Math.min(dpr, config.maxDpr);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    precision: config.isLowEnd ? 'mediump' : 'highp',
  });
  renderer.setClearColor(0x0f1b2b, 1);
  renderer.setPixelRatio(clampedDpr);
  renderer.setSize(width / clampedDpr, height / clampedDpr, false);

  scene = new THREE.Scene();

  const aspect = width / height;
  // FOV 40 (from 50 -> 45 -> 40 across preview iterations). Each drop
  // shrinks the sphere's screen footprint at the same orbit distance
  // without touching the spec's altitude values.
  camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 5000);
  updateCameraFromOrbit();

  raycaster = new THREE.Raycaster();
  ndc = new THREE.Vector2();

  // Dynamic import — deferred until this point so our window polyfill
  // above is already in effect. Static import would evaluate three-globe
  // BEFORE the polyfill line runs (ES module import hoisting) and throw.
  if (!ThreeGlobe) {
    const mod = await import('three-globe');
    ThreeGlobe = mod.default || mod.ThreeGlobe || mod;
  }

  // Spec's original approach was `.globeImageUrl(<1x1 #0a1122 data URL>)`
  // to give the ocean a solid deep-navy fill without downloading any
  // external texture. Inside a worker three-globe's texture loader
  // still routes through Three.js's ImageLoader, which does
  // `document.createElement('img')` and blows up with
  // "ReferenceError: document is not defined". Same visual outcome is
  // available one step earlier by never handing three-globe a URL and
  // just setting the sphere material's base color directly — no
  // texture path involved, no document touched, ocean paints as a
  // solid #0a1122.
  globe = new ThreeGlobe()
    .showAtmosphere(true)
    .atmosphereColor('#3b82f6')
    .atmosphereAltitude(0.15);

  const mat = globe.globeMaterial();
  if (mat) {
    mat.map = null;
    if (mat.color) mat.color.set('#0a1122');
    mat.needsUpdate = true;
  }

  scene.add(globe);

  // Kick off the RAF loop immediately so the ocean sphere paints as
  // soon as three-globe's texture resolves. Countries stream in when
  // the main thread posts them.
  requestAnimationFrame(animate);

  postReady();
}

function postReady() {
  if (readyPosted) return;
  readyPosted = true;
  self.postMessage({ type: 'ready' });
}

// ── Message dispatch ─────────────────────────────────────────────────────────

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'init') {
    init(msg);
    return;
  }
  if (!renderer) return;

  if (msg.type === 'setCountries') {
    if (!globe) return;
    globe
      .polygonsData(msg.countries || [])
      .polygonCapColor(polygonCapColor)
      .polygonStrokeColor(polygonStrokeColor)
      .polygonAltitude(0.01)
      .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
      .polygonsTransitionDuration(0);
    countriesLoaded = true;
    return;
  }

  if (msg.type === 'resize') {
    const clampedDpr = Math.min(msg.dpr, config.maxDpr);
    renderer.setPixelRatio(clampedDpr);
    renderer.setSize(msg.width / clampedDpr, msg.height / clampedDpr, false);
    camera.aspect = msg.width / msg.height;
    camera.updateProjectionMatrix();
    return;
  }

  if (msg.type === 'pointer') {
    if (msg.kind === 'down') {
      if (orbit.enableRotate) {
        orbit.dragging = true;
        orbit.lastX = msg.x;
        orbit.lastY = msg.y;
        orbit.velocityAzimuth = 0;
        orbit.velocityPolar = 0;
      }
      return;
    }
    if (msg.kind === 'move' && orbit.dragging) {
      const dx = msg.x - orbit.lastX;
      const dy = msg.y - orbit.lastY;
      orbit.lastX = msg.x;
      orbit.lastY = msg.y;
      const deltaAz = -dx * orbit.rotateSpeed;
      const deltaPolar = -dy * orbit.rotateSpeed;
      orbit.azimuth += deltaAz;
      orbit.polar += deltaPolar;
      orbit.velocityAzimuth = deltaAz;
      orbit.velocityPolar = deltaPolar;
      cameraTween = null; // manual drag cancels any pending zoom tween
      return;
    }
    if (msg.kind === 'up' || msg.kind === 'cancel') {
      orbit.dragging = false;
      return;
    }
    if (msg.kind === 'hover') {
      // Coalesce — actual raycast happens on the next rAF tick.
      pendingHover = {
        x: msg.x,
        y: msg.y,
        cssWidth: msg.cssWidth,
        cssHeight: msg.cssHeight,
      };
      return;
    }
    if (msg.kind === 'click') {
      if (!countriesLoaded) return;
      const hit = pickPolygonAt(msg.x, msg.y, msg.cssWidth, msg.cssHeight);

      if (hit) {
        // Zoomed in on a country, the visible surface is dominated by
        // that country — any misclick near its edge falls on the same
        // cap and the raycast picks it again. Re-running the tween on
        // the same target then reads as "camera stayed put but flashed
        // funny" and the user can't tell if the click did anything.
        // Ignore re-clicks of the currently-selected country; to switch
        // to another the user first deselects via ocean click or the
        // HUD × button, which zooms back to altitude 2.2 so distant
        // countries are visible and pickable again.
        if (hit === selectedCountry) {
          justClickedCountryAt = performance.now();
          return;
        }

        // Country click — engage lock so the trailing globe click doesn't
        // deselect within the same event cluster.
        justClickedCountryAt = performance.now();
        selectedCountry = hit;
        orbit.autoRotate = false;
        refreshPolygonColors();

        // Camera pointOfView tween — center on the hit country.
        const centroid = polygonCentroid(hit);
        if (centroid) {
          const target = latLngToOrbit(centroid.lat, centroid.lng, CLICK_ALTITUDE);
          startCameraTween(target.azimuth, target.polar, target.radius, 1000);
        }

        self.postMessage({
          type: 'countrySelected',
          admin: hit.properties?.ADMIN || hit.properties?.name || 'Unknown',
        });
      } else {
        // Ocean click — respect the 100 ms guard.
        if (performance.now() - justClickedCountryAt < 100) return;
        if (selectedCountry) {
          selectedCountry = null;
          orbit.autoRotate = true;
          refreshPolygonColors();
          startCameraTween(orbit.azimuth, orbit.polar, altitudeToRadius(DEFAULT_ALTITUDE), 1000);
          self.postMessage({ type: 'countryDeselected' });
        }
      }
      return;
    }
  }

  if (msg.type === 'deselect') {
    if (selectedCountry) {
      selectedCountry = null;
      orbit.autoRotate = true;
      refreshPolygonColors();
      startCameraTween(orbit.azimuth, orbit.polar, altitudeToRadius(DEFAULT_ALTITUDE), 1000);
    }
    return;
  }

  if (msg.type === 'visibility') {
    visible = !!msg.visible;
    lastFrameTime = 0;
    return;
  }

  if (msg.type === 'dispose') {
    disposed = true;
    renderer?.dispose();
    return;
  }
});

// ── Polygon centroid ─────────────────────────────────────────────────────────

/**
 * Best-guess visual center of a GeoJSON polygon feature.
 *
 * Preview review flagged the camera aiming a hair off from the country
 * it just latched onto. Root cause is the naive averaging fallback:
 * outer-ring vertex mean is wrong for countries with a jagged silhouette
 * (Canada, Norway), a huge low-density interior (Russia), or coordinates
 * that wrap the anti-meridian (Russia again, USA + Alaska, Fiji) — the
 * lng average pulls the point to some empty spot in the Pacific.
 *
 * Natural Earth's admin-0 dataset ships explicit label-placement coords
 * on every feature: `properties.LABEL_X`, `properties.LABEL_Y`. Those
 * are hand-tuned by cartographers to sit over the country's visual
 * centre. Prefer them. Fall back to LON / LAT, then to the outer-ring
 * mean as a last resort so a foreign GeoJSON without label props still
 * works.
 */
function polygonCentroid(feature) {
  const p = feature.properties || {};

  const labelLat = Number(p.LABEL_Y ?? p.label_y ?? p.LAT ?? p.lat);
  const labelLng = Number(p.LABEL_X ?? p.label_x ?? p.LON ?? p.lon ?? p.LONG ?? p.long);
  if (Number.isFinite(labelLat) && Number.isFinite(labelLng)) {
    return { lat: labelLat, lng: labelLng };
  }

  const geom = feature.geometry;
  if (!geom) return null;
  let ring;
  if (geom.type === 'Polygon') {
    ring = geom.coordinates[0];
  } else if (geom.type === 'MultiPolygon') {
    // Pick the polygon with the most vertices as a rough "largest".
    let best = null;
    for (const poly of geom.coordinates) {
      if (!best || poly[0].length > best[0].length) best = poly;
    }
    ring = best ? best[0] : null;
  }
  if (!ring || ring.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}
