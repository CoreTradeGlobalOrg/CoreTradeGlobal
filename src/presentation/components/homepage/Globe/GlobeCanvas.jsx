/**
 * GlobeCanvas — main-thread shell around globe.worker.js (three-globe).
 *
 * Owns:
 *   - canvas mount + transferControlToOffscreen
 *   - GeoJSON fetch (deferred 600 ms per spec) and post to worker
 *   - Pointer / resize / visibility forwarding
 *   - "Selected Region" HUD overlay reacting to worker messages
 *
 * The whole render loop, raycasting, polygon country mesh, atmosphere,
 * and camera orbit run inside the worker on an OffscreenCanvas — main
 * thread only forwards events and paints the HUD.
 *
 * OffscreenCanvas is required. Older Safari (< 16.4) hits this path via
 * the same feature-detect and lands on a null render — the fallback R3F
 * globe was removed with this rewrite. Adding one back is a future
 * option if the analytics show non-trivial Safari-16-and-earlier
 * traffic; for now the audience is on modern engines.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

const COUNTRIES_URL =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson';

function supportsOffscreen() {
  if (typeof window === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  const proto = HTMLCanvasElement && HTMLCanvasElement.prototype;
  return !!proto && typeof proto.transferControlToOffscreen === 'function';
}

export function GlobeCanvas({ className = '', onReady }) {
  const [supported, setSupported] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

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
    const maxDpr = isMobile ? 1.5 : 2;
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
      } else if (msg.type === 'countrySelected') {
        setSelectedAdmin(msg.admin);
      } else if (msg.type === 'countryDeselected') {
        setSelectedAdmin(null);
      } else if (msg.type === 'error') {
        // Worker's init caught the exception itself — log for diagnosis
        // and still fire ready so the hero drops the loading text
        // instead of stalling forever.
        // eslint-disable-next-line no-console
        console.error(`[globe worker error @ ${msg.where}]`, msg.message);
        fireReadyOnce();
      }
    };
    const handleWorkerError = (e) => {
      // Fatal error the worker never caught — surface it and unblock UI.
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

    // Deferred GeoJSON fetch — spec says 600 ms after mount to keep FCP /
    // LCP clear. Main thread fetches (network is the same source either
    // way) then posts the feature collection to the worker.
    const fetchTimer = setTimeout(async () => {
      try {
        const res = await fetch(COUNTRIES_URL);
        const data = await res.json();
        worker.postMessage({ type: 'setCountries', countries: data.features || [] });
      } catch (err) {
        // Non-fatal — the ocean sphere still renders. Log for observability
        // once we wire a proper sink.
        // eslint-disable-next-line no-console
        console.warn('Globe GeoJSON fetch failed:', err);
      }
    }, 600);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // Sub-pixel jitter guard per spec — floor + 5 px threshold prevents
      // a Retina resize loop.
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

    const relativeCoords = (e) => {
      const r = container.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };

    const onDown = (e) => {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // pointer capture is best-effort; some pointer types reject it
      }
      const p = relativeCoords(e);
      worker.postMessage({ type: 'pointer', kind: 'down', x: p.x, y: p.y });
    };
    const onMove = (e) => {
      const p = relativeCoords(e);
      // Two-in-one: drag update + hover raycast. Worker distinguishes by
      // its own dragging flag.
      worker.postMessage({ type: 'pointer', kind: 'move', x: p.x, y: p.y });
      if (!isMobile) {
        worker.postMessage({
          type: 'pointer',
          kind: 'hover',
          x: p.x,
          y: p.y,
          cssWidth: p.w,
          cssHeight: p.h,
        });
      }
    };
    const onUp = (e) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // capture may already be released by the browser
      }
      worker.postMessage({ type: 'pointer', kind: 'up' });
    };
    const onCancel = () => worker.postMessage({ type: 'pointer', kind: 'cancel' });
    const onClick = (e) => {
      const p = relativeCoords(e);
      worker.postMessage({
        type: 'pointer',
        kind: 'click',
        x: p.x,
        y: p.y,
        cssWidth: p.w,
        cssHeight: p.h,
      });
    };

    if (!isMobile) {
      container.addEventListener('pointerdown', onDown);
      container.addEventListener('pointermove', onMove);
      container.addEventListener('pointerup', onUp);
      container.addEventListener('pointercancel', onCancel);
      container.addEventListener('click', onClick);
    }

    return () => {
      clearTimeout(fetchTimer);
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
        container.removeEventListener('click', onClick);
      }
    };
  }, [supported, isMobile]);

  if (supported === null) return null;
  if (supported === false) {
    // No fallback path in v2 — canvas ships nothing, hero still paints
    // its slogan / search / CTA over the same reserved space.
    return null;
  }

  const handleCloseHud = () => {
    setSelectedAdmin(null);
    workerRef.current?.postMessage({ type: 'deselect' });
  };

  // On mobile the wrapper opts out of pointer events so touch-scrolling
  // through the hero doesn't get eaten by the canvas (spec).
  const wrapperPointer = isMobile ? { pointerEvents: 'none', touchAction: 'auto' } : { touchAction: 'none' };

  return (
    <div
      ref={containerRef}
      className={`globe-container ${className}`}
      style={{ position: 'relative', width: '100%', height: '100%', ...wrapperPointer }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Selected Region HUD — bottom-left overlay per spec */}
      {selectedAdmin && !isMobile && (
        <div className="globe-selected-hud" role="status" aria-live="polite">
          <div className="globe-selected-hud-row">
            <span className="globe-selected-hud-eyebrow">Selected Region</span>
            <button
              type="button"
              className="globe-selected-hud-close"
              onClick={handleCloseHud}
              aria-label="Clear selection"
            >
              ×
            </button>
          </div>
          <div className="globe-selected-hud-name">{selectedAdmin}</div>
        </div>
      )}
    </div>
  );
}

export default GlobeCanvas;
