'use client';

import { memo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImageZoom } from './ProductImageZoom';

// Minimum horizontal travel to count as a swipe. Anything smaller is
// treated as a tap so the ProductImageZoom hover/tap interaction still
// works. Vertical dominance (|dy| > |dx|) also cancels the swipe so
// the page can still scroll naturally on mobile.
const SWIPE_THRESHOLD = 40;

const ThumbnailImage = memo(function ThumbnailImage({ src, alt }) {
  const [loading, setLoading] = useState(true);
  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B]">
          <div className="w-4 h-4 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img src={src} alt={alt} className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setLoading(false)} />
    </>
  );
});

/**
 * ProductGallery - Main image carousel + thumbnail strip.
 */
export function ProductGallery({ images, currentImageIndex, imageLoading, onNext, onPrev, onThumbnailClick, onImageLoad, productName }) {
  const hasImages = images.length > 0;

  // Touch swipe state — refs (not state) so the handlers don't re-render.
  const touchStartRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!hasImages || images.length < 2) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Ignore mostly-vertical drags so the page still scrolls freely.
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) onNext?.(); // swipe left → next
    else onPrev?.();        // swipe right → prev
  };

  return (
    <>
      {/* Main Image — outer wrapper is relative+overflow-visible so the zoom panel can escape */}
      <div
        className="relative group"
        style={{ height: '500px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Inner glass-card clips the image background but NOT the zoom panel.
            Only the loading state + empty placeholder live in here — the
            chevron controls and image counter chip moved OUT below so
            they always sit on top of ProductImageZoom, which used to
            cover them for tall/portrait images. */}
        <div className="absolute inset-0 glass-card rounded-2xl overflow-hidden">
          {hasImages ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0F1B2B]">
                  <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {/* Hidden img to trigger onImageLoad callback */}
              <img
                src={images[currentImageIndex]}
                alt=""
                className="hidden"
                onLoad={onImageLoad}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 bg-[#0F1B2B]">
              <svg className="w-24 h-24 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* ProductImageZoom renders OUTSIDE the overflow-hidden container so the zoom panel is visible */}
        {hasImages && (
          <ProductImageZoom
            imageSrc={images[currentImageIndex]}
            alt={`${productName} - Image ${currentImageIndex + 1}`}
            className={`transition-all duration-300 ${imageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          />
        )}

        {/* Overlay controls — rendered AFTER ProductImageZoom so they sit
            on top of the image regardless of its aspect ratio. z-20 keeps
            them above the zoom lens indicator (z-10). */}
        {hasImages && images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-[#FFD700] text-white hover:text-[#0F1B2B] rounded-full p-3 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={onNext}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-[#FFD700] text-white hover:text-[#0F1B2B] rounded-full p-3 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white text-sm font-semibold px-4 py-1.5 rounded-full border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-20 pointer-events-none">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto p-2 scrollbar-hide">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => onThumbnailClick(index)}
              className={`flex-shrink-0 w-24 h-24 rounded-xl relative overflow-hidden transition-all duration-200 ${index === currentImageIndex ? 'outline outline-2 outline-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'opacity-60 hover:opacity-100'}`}
            >
              <ThumbnailImage src={img} alt={`Thumbnail ${index + 1}`} />
              {index === currentImageIndex && <div className="absolute inset-0 bg-[#FFD700]/10" />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
