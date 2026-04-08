/**
 * HeroGlobe Component
 *
 * Three.js globe wrapper with loading state for the hero section.
 * Dynamically imports GlobeCanvas to avoid SSR issues.
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

/**
 * @param {Object} props
 * @param {boolean} props.mounted - Whether component is mounted on client
 * @param {boolean} props.globeLoaded - Whether globe has finished loading
 */
export function HeroGlobe({ mounted, globeLoaded }) {
  return (
    <>
      {/* Globe Loading Text - hides when globe is loaded */}
      <div
        className="globe-loading-text"
        id="loading"
        style={{
          opacity: globeLoaded ? 0 : 0.9,
          transition: 'opacity 0.5s ease-out',
          pointerEvents: globeLoaded ? 'none' : 'auto',
        }}
      >
        Welcome to CoreTradeGlobal
      </div>

      {/* Three.js Canvas Container */}
      <div id="canvas-container" style={{ opacity: globeLoaded ? 1 : 0 }}>
        {mounted && <GlobeCanvas />}
      </div>
    </>
  );
}

export default HeroGlobe;
