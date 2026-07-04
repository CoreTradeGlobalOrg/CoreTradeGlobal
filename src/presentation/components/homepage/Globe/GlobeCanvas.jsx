/**
 * GlobeCanvas — thin main-thread shell around globe.worker.js.
 *
 * The heavy Three.js render + trade-route physics run in a Web Worker
 * on an OffscreenCanvas transferred from here. This file mounts a
 * canvas element, hands its offscreen twin to the worker, and forwards
 * three streams of events:
 *
 *   - resize:      ResizeObserver → { type: 'resize', width, height, dpr }
 *   - visibility:  IntersectionObserver → pauses the worker RAF loop when
 *                  the hero scrolls out (matches the original R3F path)
 *   - pointer:     desktop drag → { type: 'pointer', kind, x, y } — the
 *                  worker runs a hand-rolled OrbitControls equivalent
 *
 * Browsers without OffscreenCanvas + transferControlToOffscreen fall
 * back to GlobeCanvasFallback (the original @react-three/fiber
 * implementation) via dynamic import so its bundle doesn't ship on
 * the worker path.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const GlobeCanvasFallback = dynamic(
  () => import('./GlobeCanvasFallback').then((m) => m.GlobeCanvas),
  { ssr: false, loading: () => null }
);

function supportsOffscreen() {
  if (typeof window === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  const proto = HTMLCanvasElement && HTMLCanvasElement.prototype;
  return !!proto && typeof proto.transferControlToOffscreen === 'function';
}

export function GlobeCanvas({ className = '', onReady }) {
  // null = detecting, true = worker path, false = fallback path
  const [pathMode, setPathMode] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);

  // Keep the callback ref current without re-mounting the worker
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Detect capability + mobile size
  useEffect(() => {
    setPathMode(supportsOffscreen());
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Boot the worker path
  useEffect(() => {
    if (pathMode !== true) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const dpr = window.devicePixelRatio || 1;
    const maxDpr = isMobile ? 1.5 : 2;
    const clampedDpr = Math.min(dpr, maxDpr);

    // Physical pixel intrinsic size for the canvas backing store.
    const physicalWidth = Math.floor(cssWidth * clampedDpr);
    const physicalHeight = Math.floor(cssHeight * clampedDpr);
    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    let offscreen;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch (err) {
      // A canvas can only be transferred once. If a stale one is passed
      // (StrictMode double-effect in dev), fall back for this session.
      setPathMode(false);
      return;
    }

    const worker = new Worker(new URL('./globe.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const handleMessage = (e) => {
      if (e.data?.type === 'ready' && !readyFiredRef.current) {
        readyFiredRef.current = true;
        onReadyRef.current?.();
      }
    };
    worker.addEventListener('message', handleMessage);

    worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width: physicalWidth,
        height: physicalHeight,
        dpr: clampedDpr,
        isMobile,
      },
      [offscreen]
    );

    // Resize plumbing — forward CSS pixel size + dpr, the worker converts.
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(1, entry.contentRect.width);
      const h = Math.max(1, entry.contentRect.height);
      const currentDpr = window.devicePixelRatio || 1;
      const currentClamped = Math.min(currentDpr, maxDpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      worker.postMessage({
        type: 'resize',
        width: Math.floor(w * currentClamped),
        height: Math.floor(h * currentClamped),
        dpr: currentClamped,
      });
    });
    ro.observe(container);

    // Pause the render loop when the hero scrolls out — matches the
    // frameloop: isVisible ? 'always' : 'never' from the R3F path.
    const io = new IntersectionObserver(
      ([entry]) => {
        worker.postMessage({ type: 'visibility', visible: entry.isIntersecting });
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    // Pointer drag → forward to worker's orbit controller (desktop only).
    const forwardPointer = (kind) => (e) => {
      const r = container.getBoundingClientRect();
      worker.postMessage({
        type: 'pointer',
        kind,
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      });
    };
    const onDown = (e) => {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // pointer capture is best-effort — some pointer types reject it
      }
      forwardPointer('down')(e);
    };
    const onMove = forwardPointer('move');
    const onUp = (e) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // capture may have already been released by the browser
      }
      forwardPointer('up')(e);
    };
    const onCancel = forwardPointer('cancel');

    if (!isMobile) {
      container.addEventListener('pointerdown', onDown);
      container.addEventListener('pointermove', onMove);
      container.addEventListener('pointerup', onUp);
      container.addEventListener('pointercancel', onCancel);
    }

    return () => {
      worker.postMessage({ type: 'dispose' });
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
      ro.disconnect();
      io.disconnect();
      if (!isMobile) {
        container.removeEventListener('pointerdown', onDown);
        container.removeEventListener('pointermove', onMove);
        container.removeEventListener('pointerup', onUp);
        container.removeEventListener('pointercancel', onCancel);
      }
    };
  }, [pathMode, isMobile]);

  // Detection hasn't run yet — matches the original mounted-guard behavior
  // (no canvas paints before we know the path).
  if (pathMode === null) return null;

  if (pathMode === false) {
    return <GlobeCanvasFallback className={className} onReady={onReady} />;
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={isMobile ? { pointerEvents: 'none', touchAction: 'auto' } : { touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default GlobeCanvas;
