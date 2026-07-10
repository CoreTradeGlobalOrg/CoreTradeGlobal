/**
 * Globe rendering worker — v3 (pure three.js, textured sphere).
 *
 * three-globe removed. Just one SphereGeometry + earth texture. Country
 * borders live inside the texture image, so there are only ~2 draw
 * calls per frame instead of ~354. autoRotate + drag orbit only.
 *
 * Perf guardrails:
 *   - 30 FPS cap
 *   - RAF fully stops on visibility=false
 *   - antialias off + mediump on low-end / mobile
 *   - DPR cap 1.0
 */

if (typeof globalThis.window === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.window = globalThis;
}

import * as THREE from 'three';

// Stylized equirectangular map, drawn once into an OffscreenCanvas from
// GeoJSON. Ocean #0a1122, continents #94a3b8, borders #0a1122 — same
// palette as the old three-globe polygon layer.
const COUNTRIES_URL =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson';
const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1024;

let renderer = null;
let scene = null;
let camera = null;
let sphere = null;

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

  // Sphere first with a solid ocean color so something paints instantly.
  // Texture streams in and swaps material.map when ready.
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 48, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x0a1122 });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  startAnimation();
  postReady();

  // Build the stylized map texture off the render path. GeoJSON → 2:1
  // equirectangular OffscreenCanvas → CanvasTexture. One-shot at init,
  // never touched again.
  try {
    const res = await fetch(COUNTRIES_URL);
    const data = await res.json();
    const features = data.features || [];

    const map = new OffscreenCanvas(MAP_WIDTH, MAP_HEIGHT);
    const ctx = map.getContext('2d');

    // Ocean fill
    ctx.fillStyle = '#0a1122';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Continents fill + border stroke
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#0a1122';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    const projX = (lng) => ((lng + 180) / 360) * MAP_WIDTH;
    // NOTE: canvas y grows downward, and we set texture flipY=false
    // below; keep the natural top-is-north mapping here.
    const projY = (lat) => ((90 - lat) / 180) * MAP_HEIGHT;

    const drawRing = (ring) => {
      if (!ring || ring.length === 0) return;
      ctx.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const [lng, lat] = ring[i];
        const x = projX(lng);
        const y = projY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    for (const feat of features) {
      const geom = feat.geometry;
      if (!geom) continue;
      if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) drawRing(ring);
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          for (const ring of poly) drawRing(ring);
        }
      }
    }

    const texture = new THREE.CanvasTexture(map);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    material.map = texture;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  } catch (err) {
    self.postMessage({
      type: 'error',
      where: 'texture',
      message: err && err.message ? err.message : String(err),
    });
  }
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
      orbit.azimuth += dx * orbit.rotateSpeed;
      orbit.polar += -dy * orbit.rotateSpeed;
      orbit.velocityAzimuth = dx * orbit.rotateSpeed;
      orbit.velocityPolar = -dy * orbit.rotateSpeed;
      return;
    }
    if (msg.kind === 'up' || msg.kind === 'cancel') {
      orbit.dragging = false;
      return;
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
