/**
 * Globe rendering worker — v2.1 (zero-interaction mode).
 *
 * three-globe polygon countries on an OffscreenCanvas. Only an
 * autoRotate loop — no raycasting, no hover, no click, no drag. All
 * pointer / selection code was removed to eliminate raycaster cost and
 * to let the main-thread wrapper drop pointerEvents entirely.
 *
 * Performance guardrails baked in:
 *   - 60 FPS hard cap (halves work on 120/144 Hz displays)
 *   - `startAnimation` / `stopAnimation` gated by IntersectionObserver
 *     visibility posts — rAF fully stops when hero is offscreen
 *   - antialias off + `mediump` precision on low-end / mobile
 *   - polygonAltitude locked at 0.01, transition duration 0 (no
 *     geometry re-triangulation)
 *
 * three-globe reads window.THREE at module top-level so we polyfill
 * `globalThis.window = globalThis` BEFORE anything else. Dynamic import
 * of three-globe inside init() defers evaluation past the polyfill.
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

let visible = true;
let disposed = false;
let readyPosted = false;
let config = null;

const GLOBE_RADIUS = 100;
const DEFAULT_ALTITUDE = 4.2;

const orbit = {
  target: new THREE.Vector3(0, 0, 0),
  radius: GLOBE_RADIUS * (1 + DEFAULT_ALTITUDE),
  azimuth: 0,
  polar: Math.PI / 2,
  autoRotate: true,
  autoRotateSpeed: 1.5,
};

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

function polygonCapColor() { return '#94a3b8'; }
function polygonStrokeColor() { return '#0a1122'; }

// ── RAF loop ────────────────────────────────────────────────────────────────

let lastFrameTime = 0;
let rafId = null;

// 60 FPS cap. Default rAF on 90/120/144 Hz displays renders more frames
// than the eye needs on a slow-rotating sphere.
const MIN_FRAME_MS = 1000 / 60;
let lastRenderedAt = 0;

function animate(t) {
  if (disposed) return;
  rafId = requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;

  if (t - lastRenderedAt < MIN_FRAME_MS) return;
  lastRenderedAt = t;

  const dt = lastFrameTime === 0 ? 1 / 60 : Math.min(0.1, (t - lastFrameTime) / 1000);
  lastFrameTime = t;

  if (orbit.autoRotate) {
    orbit.azimuth += ((2 * Math.PI) / 60) * orbit.autoRotateSpeed * dt;
  }

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
    maxDpr: isMobile ? 1.15 : 1.25,
    isLowEnd:
      isMobile ||
      (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4),
  };

  orbit.autoRotate = true;
  orbit.autoRotateSpeed = isMobile ? 1.2 : 1.5;
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

  if (!ThreeGlobe) {
    const mod = await import('three-globe');
    ThreeGlobe = mod.default || mod.ThreeGlobe || mod;
  }

  // Ocean color set via material — avoids three-globe's ImageLoader
  // path which would `document.createElement('img')` and crash in a
  // worker context.
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
  startAnimation();
  postReady();
}

function postReady() {
  if (readyPosted) return;
  readyPosted = true;
  self.postMessage({ type: 'ready' });
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
      .polygonsTransitionDuration(0);
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
