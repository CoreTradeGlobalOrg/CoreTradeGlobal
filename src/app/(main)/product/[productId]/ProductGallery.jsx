'use client';

import { memo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImageZoom } from './ProductImageZoom';

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

  return (
    <>
      {/* Main Image */}
      <div className="relative glass-card rounded-2xl overflow-hidden group" style={{ height: '500px' }}>
        {hasImages ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F1B2B]">
                <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <ProductImageZoom
              imageSrc={images[currentImageIndex]}
              alt={`${productName} - Image ${currentImageIndex + 1}`}
              className={`transition-all duration-300 ${imageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            />
            {/* Hidden img to trigger onImageLoad callback */}
            <img
              src={images[currentImageIndex]}
              alt=""
              className="hidden"
              onLoad={onImageLoad}
            />
            {images.length > 1 && (
              <>
                <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-[#FFD700] text-white hover:text-[#0F1B2B] rounded-full p-3 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-[#FFD700] text-white hover:text-[#0F1B2B] rounded-full p-3 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white/90 text-sm font-medium px-4 py-1.5 rounded-full border border-white/10">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 bg-[#0F1B2B]">
            <svg className="w-24 h-24 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
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
