/**
 * GlobeCanvas — main-thread shell around globe.worker.js (three-globe).
 *
 * Drag orbits, click selects a country (raycast in worker), close (×)
 * or ocean click deselects. Hover raycasting removed for CPU — cursor
 * is grab/grabbing only, no pointer hover state.
 */

'use client';

import { memo, useEffect, useRef, useState } from 'react';

const COUNTRIES_URL =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson';

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
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [dragging, setDragging] = useState(false);

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
    const maxDpr = 1; // hard cap
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

    // Drag-vs-click gate: >5 px travel = drag, otherwise treat click.
    let dragStartX = 0;
    let dragStartY = 0;
    let dragTravel = 0;
    const CLICK_TRAVEL_LIMIT = 5;

    const onDown = (e) => {
      try { container.setPointerCapture(e.pointerId); } catch {}
      const p = relativeCoords(e);
      dragStartX = p.x;
      dragStartY = p.y;
      dragTravel = 0;
      setDragging(true);
      worker.postMessage({ type: 'pointer', kind: 'down', x: p.x, y: p.y });
    };
    const onMove = (e) => {
      const p = relativeCoords(e);
      const dist = Math.hypot(p.x - dragStartX, p.y - dragStartY);
      if (dist > dragTravel) dragTravel = dist;
      worker.postMessage({ type: 'pointer', kind: 'move', x: p.x, y: p.y });
    };
    const onUp = (e) => {
      try { container.releasePointerCapture(e.pointerId); } catch {}
      setDragging(false);
      worker.postMessage({ type: 'pointer', kind: 'up' });
    };
    const onCancel = () => {
      setDragging(false);
      worker.postMessage({ type: 'pointer', kind: 'cancel' });
    };
    const onClick = (e) => {
      if (dragTravel > CLICK_TRAVEL_LIMIT) {
        dragTravel = 0;
        return;
      }
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
  if (supported === false) return null;

  const handleCloseHud = () => {
    setSelectedAdmin(null);
    workerRef.current?.postMessage({ type: 'deselect' });
  };

  // Cursor: grab default, grabbing during drag. No `pointer` state
  // because hover raycasting is off (CPU savings).
  const desktopCursor = dragging ? 'grabbing' : 'grab';
  const wrapperPointer = isMobile
    ? { pointerEvents: 'none', touchAction: 'auto' }
    : { touchAction: 'none', cursor: desktopCursor };

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

export const GlobeCanvas = memo(GlobeCanvasInner);

export default GlobeCanvas;
