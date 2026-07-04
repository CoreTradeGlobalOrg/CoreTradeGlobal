/**
 * HeroGlobe Component
 *
 * Three.js globe wrapper with loading state for the hero section.
 * Dynamically imports GlobeCanvas to avoid SSR issues and to keep the
 * Three.js + worker bundle off the initial paint's critical path.
 * GlobeCanvas.jsx dispatches to the OffscreenCanvas + Worker path where
 * supported and falls back to the R3F main-thread implementation on
 * older Safari.
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const GlobeCanvas = dynamic(
  () => import('../Globe/GlobeCanvas').then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => null,
  }
);

function GlobeFallback() {
  return (
    <div
      className="w-full h-full"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(10,22,40,0.6) 0%, transparent 70%)',
      }}
    />
  );
}

export function HeroGlobe({ mounted, globeLoaded, onGlobeReady }) {
  return (
    <>
      {/* Globe Loading Text */}
      {!globeLoaded && (
        <div className="globe-loading-text" id="loading" suppressHydrationWarning>
          Welcome to CoreTradeGlobal
        </div>
      )}

      {/* Three.js Canvas Container */}
      <div
        id="canvas-container"
        style={globeLoaded ? { opacity: 1 } : undefined}
        suppressHydrationWarning
      >
        {mounted && (
          <Suspense fallback={<GlobeFallback />}>
            <GlobeCanvas onReady={onGlobeReady} />
          </Suspense>
        )}
      </div>
    </>
  );
}

export default HeroGlobe;
