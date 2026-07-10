/**
 * Globe rendering worker — v2.2 (drag + click, no hover).
 *
 * three-globe polygon countries on OffscreenCanvas. Drag orbits the
 * camera; click picks a country via raycast, tweens the camera in, and
 * paints it gold. Hover raycasting is intentionally OFF — that was the
 * main CPU sink (hundreds of raycasts/sec on mouse move). Click
 * raycasts only fire once per click.
 *
 * Perf guardrails kept from v2.1:
 *   - 30 FPS cap
 *   - `startAnimation` / `stopAnimation` gated by visibility
 *   - antialias off + `mediump` precision on low-end / mobile
 *   - polygonAltitude 0.01, transition duration 0, cap curvature 2
 *   - DPR cap 1.0
 *   - three-globe internal ticker paused
 */

if (typeof globalThis.window === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.window = globalThis;
}

import * as THREE from 'three';

let ThreeGlobe = null;

let renderer = null;
let scene = null;
let camera = null;
let globe = null;
let raycaster = null;
let ndc = null;

let selectedCountry = null;
let visible = true;
let disposed = false;
let readyPosted = false;
let countriesLoaded = false;
let config = null;

const GLOBE_RADIUS = 100;
const DEFAULT_ALTITUDE = 4.2;
const CLICK_ALTITUDE = 1.8;

const orbit = {
  target: new THREE.Vector3(0, 0, 0),
  radius: GLOBE_RADIUS * (1 + DEFAULT_ALTITUDE),
  azimuth: 0,
  polar: Math.PI / 2,
  minPolar: 0.1,
  maxPolar: Math.PI - 0.1,
  dragging: false,
  lastX: 0,
  lastY: 0,
  velocityAzimuth: 0,
  velocityPolar: 0,
  damping: 0.05,
  autoRotate: true,
  autoRotateSpeed: 1.5,
  enableRotate: true,
  rotateSpeed: (2 * Math.PI) / 400,
};

let cameraTween = null;
let justClickedCountryAt = 0;

function altitudeToRadius(alt) {
  return GLOBE_RADIUS * (1 + alt);
}

function updateCameraFromOrbit() {
  const sinPolar = Math.sin(orbit.polar);
  camera.position.set(
    orbit.radius * sinPolar * Math.cos(orbit.azimuth),
    orbit.radius * Math.cos(orbit.polar),
    orbit.radius * sinPolar * Math.sin(orbit.azimuth)
  );
  camera.lookAt(orbit.target);
}

function latLngToOrbit(lat, lng, altitude) {
  const polar = ((90 - lat) * Math.PI) / 180;
  const azimuth = ((90 - lng) * Math.PI) / 180;
  return { azimuth, polar, radius: altitudeToRadius(altitude) };
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

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function stepCameraTween(now) {
  if (!cameraTween) return;
  const elapsed = now - cameraTween.startTime;
  const t = Math.min(1, elapsed / cameraTween.duration);
  const e = easeInOutCubic(t);

  let dAz = cameraTween.toAzimuth - cameraTween.fromAzimuth;
  while (dAz > Math.PI) dAz -= 2 * Math.PI;
  while (dAz < -Math.PI) dAz += 2 * Math.PI;
  orbit.azimuth = cameraTween.fromAzimuth + dAz * e;
  orbit.polar = cameraTween.fromPolar + (cameraTween.toPolar - cameraTween.fromPolar) * e;
  orbit.radius = cameraTween.fromRadius + (cameraTween.toRadius - cameraTween.fromRadius) * e;

  if (t >= 1) cameraTween = null;
}

function polygonCapColor(d) {
  return d === selectedCountry ? '#FFD700' : '#94a3b8';
}
function polygonStrokeColor(d) {
  return d === selectedCountry ? '#FFD700' : '#0a1122';
}
function refreshPolygonColors() {
  if (!globe) return;
  globe.polygonCapColor(polygonCapColor).polygonStrokeColor(polygonStrokeColor);
}

// ── Raycasting (click only) ─────────────────────────────────────────────────

function pickPolygonAt(cssX, cssY, cssWidth, cssHeight) {
  if (!globe) return null;
  ndc.x = (cssX / cssWidth) * 2 - 1;
  ndc.y = -(cssY / cssHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(globe, true);

  // Rays pass through the opaque sphere; cutoff at camera-to-origin
  // distance so far-hemisphere caps don't pick.
  const nearHemisphereMaxDistance = camera.position.length();
  // Reject cap side walls — only accept ray hits near the top face.
  const CAP_TOP_MIN_RADIUS = GLOBE_RADIUS * (1 + 0.008);

  for (const hit of hits) {
    if (hit.distance > nearHemisphereMaxDistance) break;
    const isCapTopHit = hit.point.length() >= CAP_TOP_MIN_RADIUS;

    let node = hit.object;
    while (node) {
      const bound = node.__data;
      if (bound) {
        if (!isCapTopHit) break;
        if (bound.data && bound.data.properties) return bound.data;
        if (bound.properties) return bound;
      }
      node = node.parent;
    }
  }
  return null;
}

// ── RAF loop ────────────────────────────────────────────────────────────────

let lastFrameTime = 0;
let rafId = null;
const MIN_FRAME_MS = 1000 / 30;
let lastRenderedAt = 0;

function animate(t) {
  if (disposed) return;
  rafId = requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;

  if (t - lastRenderedAt < MIN_FRAME_MS) return;
  lastRenderedAt = t;

  const dt = lastFrameTime === 0 ? 1 / 30 : Math.min(0.1, (t - lastFrameTime) / 1000);
  lastFrameTime = t;

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
  renderer.render(scene, camera);
}

function startAnimation() {
  if (rafId !== null || disposed) return;
  lastRenderedAt = 0;
  lastFrameTime = 0;
  rafId = requestAnimationFrame(animate);
}

function stopAnimation() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ── Init ────────────────────────────────────────────────────────────────────

async function init(msg) {
  try {
    await _initInner(msg);
  } catch (err) {
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
    maxDpr: 1,
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
    antialias: !config.isLowEnd,
    alpha: false,
    powerPreference: 'high-performance',
    precision: config.isLowEnd ? 'mediump' : 'highp',
  });
  renderer.setClearColor(0x0f1b2b, 1);
  renderer.setPixelRatio(clampedDpr);
  renderer.setSize(width / clampedDpr, height / clampedDpr, false);

  scene = new THREE.Scene();

  const aspect = width / height;
  camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 5000);
  updateCameraFromOrbit();

  raycaster = new THREE.Raycaster();
  ndc = new THREE.Vector2();

  if (!ThreeGlobe) {
    const mod = await import('three-globe');
    ThreeGlobe = mod.default || mod.ThreeGlobe || mod;
  }

  globe = new ThreeGlobe({ waitForGlobeReady: false, animateIn: false })
    .showAtmosphere(true)
    .atmosphereColor('#3b82f6')
    .atmosphereAltitude(0.15);
  if (typeof globe.pauseAnimation === 'function') globe.pauseAnimation();

  const mat = globe.globeMaterial();
  if (mat) {
    mat.map = null;
    if (mat.color) mat.color.set('#0a1122');
    mat.needsUpdate = true;
  }

  scene.add(globe);
  startAnimation();
  postReady();
}

function postReady() {
  if (readyPosted) return;
  readyPosted = true;
  self.postMessage({ type: 'ready' });
}

// ── Polygon centroid ────────────────────────────────────────────────────────

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

// ── Message dispatch ────────────────────────────────────────────────────────

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
      .polygonCapCurvatureResolution(2)
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
      const deltaAz = dx * orbit.rotateSpeed;
      const deltaPolar = -dy * orbit.rotateSpeed;
      orbit.azimuth += deltaAz;
      orbit.polar += deltaPolar;
      orbit.velocityAzimuth = deltaAz;
      orbit.velocityPolar = deltaPolar;
      cameraTween = null;
      return;
    }
    if (msg.kind === 'up' || msg.kind === 'cancel') {
      orbit.dragging = false;
      return;
    }
    if (msg.kind === 'click') {
      if (!countriesLoaded) return;
      const hit = pickPolygonAt(msg.x, msg.y, msg.cssWidth, msg.cssHeight);

      if (hit) {
        if (hit === selectedCountry) return;
        // Highlight only — no camera tween, autoRotate stays on. Sphere
        // keeps spinning while the country stays gold.
        selectedCountry = hit;
        refreshPolygonColors();
        self.postMessage({
          type: 'countrySelected',
          admin: hit.properties?.ADMIN || hit.properties?.name || 'Unknown',
        });
      } else if (selectedCountry) {
        selectedCountry = null;
        refreshPolygonColors();
        self.postMessage({ type: 'countryDeselected' });
      }
      return;
    }
  }

  if (msg.type === 'deselect') {
    if (selectedCountry) {
      selectedCountry = null;
      refreshPolygonColors();
    }
    return;
  }

  if (msg.type === 'visibility') {
    visible = !!msg.visible;
    if (visible) startAnimation();
    else stopAnimation();
    return;
  }

  if (msg.type === 'dispose') {
    disposed = true;
    stopAnimation();
    renderer?.dispose();
    return;
  }
});
