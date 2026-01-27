/**
 * GlobeCanvas Component
 *
 * 3D animated globe using Three.js
 * Shows a rotating earth with land points (from map texture) and animated trade routes
 * Optimized for performance on mobile devices.
 */

'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const ROUTE_COLORS = [0xFFD700, 0xD4AF37, 0xFDB931, 0xFFE5B4]; // Premium Gold tones

// Water sphere component
function WaterSphere({ waterColor }) {
  return (
    <mesh>
      <sphereGeometry args={[5.95, 32, 32]} />
      <meshBasicMaterial
        color={waterColor}
        transparent
        opacity={0.9}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// Land points component - consumes pre-calculated points
function LandPoints({ positions, pointSize, pointColor }) {
  const pointsRef = useRef();

  // Create circle texture for points
  const circleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }, []);

  if (!positions || !circleTexture) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        color={pointColor}
        map={circleTexture}
        transparent
        opacity={1.0}
        alphaTest={0.05}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Globe group with tilt
function GlobeGroup({ landPositions, config }) {
  const groupRef = useRef();

  return (
    <group ref={groupRef} rotation={[0, 0, 23.5 * (Math.PI / 180)]} scale={1.3}>
      <WaterSphere waterColor={config.waterColor} />
      <LandPoints
        positions={landPositions}
        pointSize={config.pointSize}
        pointColor={config.pointColor}
      />
    </group>
  );
}

// Plane Routes Component
function PlaneRoutes({ landPositions, config }) {
  const groupRef = useRef();
  const [activeRoutes, setActiveRoutes] = useState([]);
  const routesRef = useRef([]);

  // Shader
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
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

  // Spawn a route between two random land points
  const spawnRoute = () => {
    if (!landPositions || landPositions.length < 6) return null;

    // landPositions is a Float32Array [x,y,z, x,y,z...]
    // We need to pick two random indices (divisible by 3)
    const count = landPositions.length / 3;
    const idx1 = Math.floor(Math.random() * count) * 3;
    let idx2 = Math.floor(Math.random() * count) * 3;

    // Ensure distinct points and decent distance
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

    // Minimum distance check: prevent short hops
    // Globe diameter is ~12. Min dist 2.5 ensures at least ~20% of globe traversal
    if (dist < 2.5) return null;

    // Apply scaling to match globe group scale (1.3)
    // Actually the points are already scaled by radius in generation, BUT the GlobeGroup is scaled 1.3
    // PlaneRoutes is a sibling of GlobeGroup, so we should apply the same transform logic or
    // put PlaneRoutes INSIDE GlobeGroup.
    // Wait, GlobeGroup has rotation. PlaneRoutes needs to rotate with the globe?
    // In previous code, Scene had OrbitControls rotating the CAMERA? No, OrbitControls rotates camera around scene.
    // If GlobeGroup has static rotation [0,0,23.5], PlaneRoutes should likely share that context to align points.
    // Ideally, PlaneRoutes should be a child of the group that rotates, or apply same rotation.
    // FOR NOW: I will inject PlaneRoutes INTO GlobeGroup logic or just apply the same rotation to a group wrapper.

    // Arch Logic
    const mid = vStart.clone().add(vEnd).multiplyScalar(0.5);
    // Lower arc height for more graceful look
    const alt = mid.length() + (dist * 0.45);
    mid.normalize().multiplyScalar(alt);

    const curve = new THREE.QuadraticBezierCurve3(vStart, mid, vEnd);
    // Reduce segments on mobile for performance
    const tubeGeo = new THREE.TubeGeometry(curve, config.tubeSegments, 0.07, 6, false);

    const color = new THREE.Color(ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)]);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0.0 },
        color: { value: color }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(tubeGeo, material);

    // Slow down speed: 0.0015 to 0.003 range
    const speed = 0.0015 + (Math.random() * 0.0015);

    return { mesh, speed, progress: 0 };
  };

  useFrame(() => {
    if (!landPositions) return;

    // Spawning: Limited by maxRoutes from config
    if (routesRef.current.length < config.maxRoutes) {
      if (Math.random() > 0.985) { // Very rare spawn chance (1.5% per frame)
        const newRoute = spawnRoute();
        if (newRoute) {
          routesRef.current.push(newRoute);
          setActiveRoutes(prev => [...prev, newRoute]);
        }
      }
    }

    // Animate
    routesRef.current.forEach(route => {
      route.progress += route.speed;
      if (route.mesh.material.uniforms) {
        route.mesh.material.uniforms.progress.value = route.progress;
      }
    });

    // Cleanup
    const keeping = [];
    let changed = false;
    routesRef.current.forEach(r => {
      if (r.progress <= 1.5) {
        keeping.push(r);
      } else {
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        changed = true;
      }
    });

    if (changed) {
      routesRef.current = keeping;
      setActiveRoutes([...keeping]);
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, 23.5 * (Math.PI / 180)]} scale={1.3}>
      {/* Applied same rotation/scale as GlobeGroup to ensure alignment */}
      {activeRoutes.map((route, i) => (
        <primitive key={i} object={route.mesh} />
      ))}
    </group>
  );
}

// Scene setup
function Scene({ isMobile }) {
  const { camera } = useThree();
  const [landPositions, setLandPositions] = useState(null);

  // Dynamic Config based on device
  const config = useMemo(() => ({
    globeRadius: 6,
    pointCount: isMobile ? 2000 : 4000, // Adjusted for land-only density
    pointSize: isMobile ? 0.35 : 0.28,
    pointColor: 0xFFFFFF,
    waterColor: 0x0A1628,
    mapUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    maxRoutes: isMobile ? 4 : 8, // Further reduced for a cleaner look
    tubeSegments: isMobile ? 32 : 64
  }), [isMobile]);

  useEffect(() => {
    camera.position.z = 35;
    camera.position.y = 35;
  }, [camera]);

  // Generate Land Points
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 512, 256);
      const imageData = ctx.getImageData(0, 0, 512, 256);
      const { width, height, data } = imageData;

      const points = [];
      const phi = Math.PI * (3 - Math.sqrt(5));

      for (let i = 0; i < config.pointCount; i++) {
        const y = 1 - (i / (config.pointCount - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * i;
        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;

        // Map to UV
        const u = 0.5 + Math.atan2(x, z) / (2 * Math.PI);
        const v = 0.5 - Math.asin(y) / Math.PI;
        const px = Math.floor(u * width);
        const py = Math.floor(v * height);
        const idx = (py * width + px) * 4;

        // Check if pixel is land (In specular map: Ocean is white/bright, Land is dark)
        // We want dark pixels (< 50)
        const isLand = data[idx] < 50;

        if (isLand) {
          const vec = new THREE.Vector3(x, y, z);
          vec.normalize().multiplyScalar(config.globeRadius + 0.05);
          points.push(vec.x, vec.y, vec.z);
        }
      }

      setLandPositions(new Float32Array(points));
    };

    // Fallback moved to inline or separate handling if needed, keeping concise here.
    img.src = config.mapUrl;
  }, [config]);

  return (
    <>
      <fog attach="fog" args={[0x030e1a, 20, 100]} />
      <GlobeGroup landPositions={landPositions} config={config} />
      {landPositions && <PlaneRoutes landPositions={landPositions} config={config} />}
      <OrbitControls
        enableDamping={true}
        dampingFactor={0.02}
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={2}
      />
    </>
  );
}

export function GlobeCanvas({ className = '' }) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: isMobile ? 'default' : 'high-performance',
        }}
        dpr={isMobile ? [1, 1.5] : [1, 2]} // Cap DPR on mobile
        frameloop="always"
      >
        <Scene isMobile={isMobile} />
      </Canvas>
    </div>
  );
}

export default GlobeCanvas;
