/**
 * HeroGlobe Component (v2 wrapper)
 *
 * Dynamic import for GlobeCanvas so the Three.js + three-globe worker
 * bundle stays off the initial critical path. The R3F main-thread
 * fallback that shipped alongside the previous worker was removed with
 * the polygon-globe rewrite — modern OffscreenCanvas support covers
 * everything we target and the fallback path was carrying its own
 * ~500 KiB of unused code.
 */

'use client';

import dynamic from 'next/dynamic';

const GlobeCanvas = dynamic(
  () => import('../Globe/GlobeCanvas').then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => null,
  }
);

export function HeroGlobe({ mounted, globeLoaded, onGlobeReady }) {
  return (
    <>
      {/* Loading overlay — sits in front of the empty canvas-container
          until the worker posts ready. Fades out when globeLoaded flips
          true. Spec suggested "Initializing WebGL Network…" but preview
          feedback landed on the original brand line. */}
      {!globeLoaded && (
        <div className="globe-loading-text" id="loading" suppressHydrationWarning>
          Welcome to CoreTradeGlobal
        </div>
      )}

      <div
        id="canvas-container"
        style={globeLoaded ? { opacity: 1 } : undefined}
        suppressHydrationWarning
      >
        {mounted && <GlobeCanvas onReady={onGlobeReady} />}
      </div>
    </>
  );
}

export default HeroGlobe;
