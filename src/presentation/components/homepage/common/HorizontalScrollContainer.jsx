/**
 * HorizontalScrollContainer Component
 *
 * Reusable horizontal scrolling container with custom scrollbar
 * and navigation arrows
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function HorizontalScrollContainer({
  children,
  className = '',
  showArrows = true,
  gap = '1.5rem',
  itemWidth = 'auto',
  snapAlign = 'start',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Left Arrow */}
      {showArrows && canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-[var(--hp-bg-secondary)] border border-[var(--hp-border)] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:border-[var(--hp-gold)] hover:bg-[var(--hp-bg-secondary)]"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 text-[var(--hp-text-primary)]" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="horizontal-scroll"
        style={{
          gap,
          '--item-width': itemWidth,
          '--snap-align': snapAlign,
        }}
      >
        {children}
      </div>

      {/* Right Arrow */}
      {showArrows && canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-[var(--hp-bg-secondary)] border border-[var(--hp-border)] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:border-[var(--hp-gold)] hover:bg-[var(--hp-bg-secondary)]"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 text-[var(--hp-text-primary)]" />
        </button>
      )}

      {/* Gradient overlays for visual scroll indication */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--hp-bg-primary)] to-transparent pointer-events-none z-[5]" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--hp-bg-primary)] to-transparent pointer-events-none z-[5]" />
      )}
    </div>
  );
}

export default HorizontalScrollContainer;
