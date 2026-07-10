/**
 * GlobeCanvas — main-thread shell around globe.worker.js (three-globe).
 *
 * Owns:
 *   - canvas mount + transferControlToOffscreen
 *   - GeoJSON fetch (deferred 600 ms, module-level shared cache)
 *   - Resize / visibility forwarding
 *
 * Zero-interaction mode: hover / click / tooltip disabled; raycaster off
 * in the worker. Idle CPU drops to ~0 while cursor moves over the sphere.
 */

'use client';

import { memo, useEffect, useRef, useState } from 'react';

const COUNTRIES_URL =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson';

// Module-level shared cache — desktop + mobile mounts (and any remount)
// reuse the same parsed FeatureCollection instead of re-downloading and
// re-parsing. Halves the network + RAM cost across device-mode swaps.
let countriesPromise = null;
function loadCountries() {
  if (!countriesPromise) {
    countriesPromise = fetch(COUNTRIES_URL)
      .then((res) => res.json())
      .then((data) => data.features || [])
      .catch((err) => {
        countriesPromise = null;
        throw err;
      });
  }
  return countriesPromise;
}

function supportsOffscreen() {
  if (typeof window === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  const proto = HTMLCanvasElement && HTMLCanvasElement.prototype;
  return !!proto && typeof proto.transferControlToOffscreen === 'function';
}

function GlobeCanvasInner({ className = '', onReady }) {
  const [supported, setSupported] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    setSupported(supportsOffscreen());
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (supported !== true) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;
    // DPR cap: 1.25 desktop / 1.15 mobile. Retina + 4K default to 2-3x,
    // which drives GPU fill rate through the roof for zero visual gain
    // on a slowly-rotating sphere. Tight cap = -60–70 % pixels shaded.
    const maxDpr = isMobile ? 1.15 : 1.25;
    const clampedDpr = Math.min(dpr, maxDpr);
    const physicalWidth = Math.floor(cssWidth * clampedDpr);
    const physicalHeight = Math.floor(cssHeight * clampedDpr);
    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    let offscreen;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch {
      setSupported(false);
      return;
    }

    const worker = new Worker(new URL('./globe.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const fireReadyOnce = () => {
      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        onReadyRef.current?.();
      }
    };

    const handleMessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'ready') {
        fireReadyOnce();
      } else if (msg.type === 'error') {
        // eslint-disable-next-line no-console
        console.error(`[globe worker error @ ${msg.where}]`, msg.message);
        fireReadyOnce();
      }
    };
    const handleWorkerError = (e) => {
      // eslint-disable-next-line no-console
      console.error('[globe worker fatal]', e.message || e);
      fireReadyOnce();
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleWorkerError);
    worker.addEventListener('messageerror', handleWorkerError);

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

    // Deferred GeoJSON — 600 ms after mount so FCP/LCP paint first.
    const fetchTimer = setTimeout(async () => {
      try {
        const features = await loadCountries();
        worker.postMessage({ type: 'setCountries', countries: features });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Globe GeoJSON fetch failed:', err);
      }
    }, 600);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // Sub-pixel jitter guard — floor + 5 px threshold prevents Retina
      // resize loops (582.33 <-> 582 oscillation).
      const rawW = entry.contentRect.width;
      const rawH = entry.contentRect.height;
      const w = Math.max(1, Math.floor(rawW));
      const h = Math.max(1, Math.floor(rawH));
      const prevW = parseInt(canvas.style.width, 10) || 0;
      if (Math.abs(prevW - w) < 5) return;
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

    const io = new IntersectionObserver(
      ([entry]) => {
        worker.postMessage({ type: 'visibility', visible: entry.isIntersecting });
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    return () => {
      clearTimeout(fetchTimer);
      worker.postMessage({ type: 'dispose' });
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
      ro.disconnect();
      io.disconnect();
    };
  }, [supported, isMobile]);

  if (supported === null) return null;
  if (supported === false) return null;

  // Zero-interaction mode — pointerEvents off across the board so the
  // canvas never blocks page scroll or eats hover on siblings.
  return (
    <div
      ref={containerRef}
      className={`globe-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        touchAction: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

export const GlobeCanvas = memo(GlobeCanvasInner);

export default GlobeCanvas;
