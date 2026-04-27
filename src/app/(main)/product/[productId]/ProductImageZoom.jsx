'use client';

import { useRef, useState, useCallback } from 'react';

/**
 * ProductImageZoom
 *
 * On desktop (>=1024px), shows a 300x300 zoom panel to the right of the image
 * when the user hovers. Tracks mouse position and updates background-position
 * accordingly. A small dashed-border lens indicator follows the cursor on the
 * source image.
 *
 * On mobile/tablet the component falls back to rendering a plain <img>.
 */
export function ProductImageZoom({ imageSrc, alt, className = '' }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50, lensX: 0, lensY: 0 });

  const LENS_SIZE = 80; // px

  const handleMouseMove = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Clamp to container bounds
    const clampedX = Math.max(0, Math.min(offsetX, rect.width));
    const clampedY = Math.max(0, Math.min(offsetY, rect.height));

    // Background position as percentage
    const bgX = (clampedX / rect.width) * 100;
    const bgY = (clampedY / rect.height) * 100;

    // Lens position (centred on cursor, clamped inside container)
    const lensX = Math.max(0, Math.min(clampedX - LENS_SIZE / 2, rect.width - LENS_SIZE));
    const lensY = Math.max(0, Math.min(clampedY - LENS_SIZE / 2, rect.height - LENS_SIZE));

    setZoom({ active: true, x: bgX, y: bgY, lensX, lensY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setZoom((prev) => ({ ...prev, active: false }));
  }, []);

  if (!imageSrc) return null;

  return (
    <div className="relative w-full h-full flex">
      {/* Source image container */}
      <div
        ref={containerRef}
        className="relative w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-contain p-4 transition-all duration-300 ${className}`}
        />

        {/* Lens indicator — desktop only */}
        {zoom.active && (
          <div
            className="hidden lg:block absolute pointer-events-none border-2 border-dashed border-[#FFD700]/80 rounded-sm"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              left: zoom.lensX,
              top: zoom.lensY,
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {/* Zoom panel — desktop only, shown on hover */}
      {zoom.active && (
        <div
          className="hidden lg:block absolute left-[calc(100%+12px)] top-0 w-[300px] h-[300px] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden shadow-2xl z-30 pointer-events-none"
          style={{
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: '200%',
            backgroundPosition: `${zoom.x}% ${zoom.y}%`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0F1B2B',
          }}
        />
      )}
    </div>
  );
}

export default ProductImageZoom;
