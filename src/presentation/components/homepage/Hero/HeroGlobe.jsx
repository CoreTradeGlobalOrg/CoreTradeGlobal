/**
 * HeroGlobe Component
 *
 * Three.js globe wrapper with loading state for the hero section.
 *
 * PERF PREVIEW BRANCH — GlobeCanvas is short-circuited on this branch to
 * measure the Three.js chunk's real cost against a Lighthouse run. The
 * dynamic import is left in the module so the code still tree-shakes and
 * reads normally; the guard just prevents the render call that triggers
 * the fetch. Canvas container stays in the DOM so mobile layout height
 * (320px reservation) matches the with-globe branch; onGlobeReady fires
 * on mount so the "Welcome to CoreTradeGlobal" loading text doesn't
 * stick around. Delete this branch to revert; do not merge to
 * development / main.
 */

'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';

const GlobeCanvas = dynamic(
  () => import('../Globe/GlobeCanvas').then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => null,
  }
);

// PERF PREVIEW — flip to false to re-enable the Three.js globe on this branch.
const GLOBE_ENABLED = false;

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
  // With the globe disabled there's nothing to wait for — resolve the
  // ready callback immediately so HeroSection hides the loading text
  // and the canvas-container fades to opacity 1.
  useEffect(() => {
    if (!GLOBE_ENABLED && mounted && !globeLoaded) {
      onGlobeReady?.();
    }
  }, [mounted, globeLoaded, onGlobeReady]);

  return (
    <>
      {/* Globe Loading Text */}
      {!globeLoaded && GLOBE_ENABLED && (
        <div className="globe-loading-text" id="loading" suppressHydrationWarning>
          Welcome to CoreTradeGlobal
        </div>
      )}

      {/* Three.js Canvas Container */}
      <div
        id="canvas-container"
        style={globeLoaded || !GLOBE_ENABLED ? { opacity: 1 } : undefined}
        suppressHydrationWarning
      >
        {mounted && GLOBE_ENABLED && (
          <Suspense fallback={<GlobeFallback />}>
            <GlobeCanvas onReady={onGlobeReady} />
          </Suspense>
        )}
      </div>
    </>
  );
}

export default HeroGlobe;
