/**
 * Globe rendering worker.
 *
 * Runs the entire Three.js scene (renderer, RAF loop, land-point
 * calculation, trade-route spawn/animate, orbit camera) off the main
 * thread on an OffscreenCanvas transferred from GlobeCanvas.jsx. Main
 * thread only forwards pointer/resize/visibility events via
 * postMessage — the parity with the original R3F implementation:
 *
 *   - Water sphere: SphereGeometry(5.95, 32, 32), MeshBasicMaterial
 *     water color 0x0A1628, opacity 0.9, FrontSide
 *   - Land points: sunflower distribution sampled against the earth
 *     specular map at /textures/earth_specular_2048.jpg; dark pixels
 *     (< 50) are land. Positions kept in a Float32Array on a
 *     BufferGeometry rendered with PointsMaterial + procedural circle
 *     texture + additive blending
 *   - Trade routes: spawned randomly (1.5% per frame, capped by
 *     maxRoutes), rendered as TubeGeometry along a quadratic bezier
 *     arc between two land points, with a custom shader that draws a
 *     tapered gold trail (see shaders below)
 *   - Globe + routes both tilted 23.5° on Z and scaled 1.3
 *   - Fog: linear from 20 → 100 units at 0x030e1a
 *
 * Custom OrbitControls parity: enableDamping (0.02), enableZoom /
 * enablePan disabled, enableRotate desktop-only, autoRotate at speed
 * 2.0 (measured in the same units as the original — full rotation
 * every 30s). polar clamped a hair off the poles.
 */

import * as THREE from 'three';

const ROUTE_COLORS = [0xffd700, 0xffd700, 0xfdb931, 0xffe5b4];

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float progress;
  uniform vec3 color;
  varying vec2 vUv;
  void main() {
    float trailLength = 0.45;
    float dist = progress - vUv.x;
    float alpha = 0.0;
    if (dist > 0.0 && dist < trailLength) {
      alpha = smoothstep(trailLength, 0.0, dist);
    }
    gl_FragColor = vec4(color, alpha);
  }
`;

let renderer = null;
let scene = null;
let camera = null;
let globeGroup = null;
let routesGroup = null;
let landPositions = null;
let config = null;
let visible = true;
let disposed = false;
let readyPosted = false;

// Orbit camera state — replaces @react-three/drei OrbitControls
const orbit = {
  target: new THREE.Vector3(0, 0, 0),
  radius: 0,
  azimuth: 0,
  polar: Math.PI / 4,
  minPolar: 0.1,
  maxPolar: Math.PI - 0.1,
  dragging: false,
  lastX: 0,
  lastY: 0,
  velocityAzimuth: 0,
  velocityPolar: 0,
  damping: 0.02,
  autoRotate: true,
  autoRotateSpeed: 2.0,
  enableRotate: true,
  // matches drei's default: 2*PI over clientHeight px for a full turn
  rotateSpeed: 2 * Math.PI / 400,
};

const routes = [];

// ── Scene helpers ─────────────────────────────────────────────────────────────

function createCircleTexture() {
  const size = 64;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

async function loadEarthMapPoints(url, pointCount, globeRadius) {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(1024, 512);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, 1024, 512);
  const imageData = ctx.getImageData(0, 0, 1024, 512);
  const { width, height, data } = imageData;
  bitmap.close?.();

  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < pointCount; i++) {
    const y = 1 - (i / (pointCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    const u = 0.5 + Math.atan2(x, z) / (2 * Math.PI);
    const v = 0.5 - Math.asin(y) / Math.PI;
    const px = Math.floor(u * width);
    const py = Math.floor(v * height);
    const idx = (py * width + px) * 4;

    // Specular map: bright = ocean, dark = land
    const isLand = data[idx] < 50;
    if (isLand) {
      const vx = x;
      const vy = y;
      const vz = z;
      // Normalize + scale to globeRadius + 0.05 (slightly above the water sphere)
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const scale = (globeRadius + 0.05) / len;
      points.push(vx * scale, vy * scale, vz * scale);
    }
  }

  return new Float32Array(points);
}

function spawnRoute() {
  if (!landPositions || landPositions.length < 6) return null;

  const count = landPositions.length / 3;
  const idx1 = Math.floor(Math.random() * count) * 3;
  let idx2 = Math.floor(Math.random() * count) * 3;
  while (idx1 === idx2) idx2 = Math.floor(Math.random() * count) * 3;

  const vStart = new THREE.Vector3(
    landPositions[idx1],
    landPositions[idx1 + 1],
    landPositions[idx1 + 2]
  );
  const vEnd = new THREE.Vector3(
    landPositions[idx2],
    landPositions[idx2 + 1],
    landPositions[idx2 + 2]
  );

  const dist = vStart.distanceTo(vEnd);
  // Match original minimum-distance floor so trails traverse a meaningful arc
  if (dist < 2.5) return null;

  const mid = vStart.clone().add(vEnd).multiplyScalar(0.5);
  const alt = mid.length() + dist * 0.45;
  mid.normalize().multiplyScalar(alt);

  const curve = new THREE.QuadraticBezierCurve3(vStart, mid, vEnd);
  const tubeGeo = new THREE.TubeGeometry(curve, config.tubeSegments, 0.07, 6, false);

  const color = new THREE.Color(ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)]);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      progress: { value: 0.0 },
      color: { value: color },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(tubeGeo, material);
  const speed = 0.0015 + Math.random() * 0.0015;

  return { mesh, speed, progress: 0 };
}

function updateCameraFromOrbit() {
  const sinPolar = Math.sin(orbit.polar);
  camera.position.set(
    orbit.radius * sinPolar * Math.sin(orbit.azimuth),
    orbit.radius * Math.cos(orbit.polar),
    orbit.radius * sinPolar * Math.cos(orbit.azimuth)
  );
  camera.lookAt(orbit.target);
}

// ── RAF loop ──────────────────────────────────────────────────────────────────

let lastFrameTime = 0;

function animate(t) {
  if (disposed) return;
  requestAnimationFrame(animate);
  if (!visible || !renderer || !scene || !camera) return;

  const dt = lastFrameTime === 0 ? 1 / 60 : Math.min(0.1, (t - lastFrameTime) / 1000);
  lastFrameTime = t;

  // Auto-rotate: full turn every (60 / autoRotateSpeed) seconds — parity
  // with drei's OrbitControls autoRotateSpeed convention.
  if (orbit.autoRotate && !orbit.dragging) {
    orbit.azimuth += ((2 * Math.PI) / 60) * orbit.autoRotateSpeed * dt;
  }

  // Damping — decay leftover drag velocity
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

  // Route spawn — 1.5% per frame, cap = config.maxRoutes
  if (landPositions && routes.length < config.maxRoutes && Math.random() > 0.985) {
    const r = spawnRoute();
    if (r) {
      routes.push(r);
      routesGroup.add(r.mesh);
    }
  }

  // Route animate + cleanup
  for (let i = routes.length - 1; i >= 0; i--) {
    const r = routes[i];
    r.progress += r.speed;
    if (r.mesh.material.uniforms) {
      r.mesh.material.uniforms.progress.value = r.progress;
    }
    if (r.progress > 1.5) {
      routesGroup.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
      routes.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

// ── init ──────────────────────────────────────────────────────────────────────

async function init({ canvas, width, height, dpr, isMobile }) {
  config = {
    globeRadius: 6,
    pointCount: isMobile ? 4000 : 8000,
    pointSize: isMobile ? 0.28 : 0.22,
    pointColor: 0xffffff,
    waterColor: 0x0a1628,
    mapUrl: '/textures/earth_specular_2048.jpg',
    maxRoutes: isMobile ? 4 : 8,
    tubeSegments: isMobile ? 32 : 64,
    // Original camera was at (0, y, z) with y == z ∈ {22, 35} — distance from
    // origin y*sqrt(2), polar angle 45° from +Y. Preserve both so the initial
    // framing matches R3F exactly.
    cameraRadius: (isMobile ? 22 : 35) * Math.SQRT2,
    isMobile,
    maxDpr: isMobile ? 1.5 : 2,
  };

  orbit.radius = config.cameraRadius;
  orbit.polar = Math.PI / 4;
  orbit.azimuth = 0;
  orbit.enableRotate = !isMobile;
  orbit.velocityAzimuth = 0;
  orbit.velocityPolar = 0;

  const clampedDpr = Math.min(dpr, config.maxDpr);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: isMobile ? 'default' : 'high-performance',
  });
  renderer.setPixelRatio(clampedDpr);
  // width/height passed in are already the physical pixel dims computed on the
  // main thread. Set false so Three doesn't multiply by pixelRatio again.
  renderer.setSize(width / clampedDpr, height / clampedDpr, false);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x030e1a, 20, 100);

  const aspect = width / height;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  updateCameraFromOrbit();

  globeGroup = new THREE.Group();
  globeGroup.rotation.z = (23.5 * Math.PI) / 180;
  globeGroup.scale.setScalar(1.3);
  scene.add(globeGroup);

  const waterGeo = new THREE.SphereGeometry(5.95, 32, 32);
  const waterMat = new THREE.MeshBasicMaterial({
    color: config.waterColor,
    transparent: true,
    opacity: 0.9,
    side: THREE.FrontSide,
  });
  globeGroup.add(new THREE.Mesh(waterGeo, waterMat));

  routesGroup = new THREE.Group();
  routesGroup.rotation.z = (23.5 * Math.PI) / 180;
  routesGroup.scale.setScalar(1.3);
  scene.add(routesGroup);

  // Start the RAF loop immediately so the water sphere paints as soon as
  // possible; land points and routes attach when their async data lands.
  requestAnimationFrame(animate);

  try {
    landPositions = await loadEarthMapPoints(
      config.mapUrl,
      config.pointCount,
      config.globeRadius
    );
  } catch (err) {
    // Fetch or decode failed — still signal ready so the loading text hides
    // and the water sphere stays visible.
    postReady();
    return;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(landPositions, 3));

  const pointsMat = new THREE.PointsMaterial({
    size: config.pointSize,
    color: config.pointColor,
    map: createCircleTexture(),
    transparent: true,
    opacity: 1.0,
    alphaTest: 0.05,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
  globeGroup.add(pointsMesh);

  postReady();
}

function postReady() {
  if (readyPosted) return;
  readyPosted = true;
  self.postMessage({ type: 'ready' });
}

// ── Message dispatch ──────────────────────────────────────────────────────────

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
    if (!orbit.enableRotate) return;
    if (msg.kind === 'down') {
      orbit.dragging = true;
      orbit.lastX = msg.x;
      orbit.lastY = msg.y;
      orbit.velocityAzimuth = 0;
      orbit.velocityPolar = 0;
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
      return;
    }
    if (msg.kind === 'up' || msg.kind === 'cancel') {
      orbit.dragging = false;
      return;
    }
  }

  if (msg.type === 'visibility') {
    visible = !!msg.visible;
    // Reset dt so a paused-then-resumed frame doesn't jump the auto-rotate
    lastFrameTime = 0;
    return;
  }

  if (msg.type === 'dispose') {
    disposed = true;
    for (const r of routes) {
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    }
    routes.length = 0;
    renderer?.dispose();
    return;
  }
});
