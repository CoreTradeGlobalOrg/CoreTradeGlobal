'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to get responsive data fetch limits with lazy loading support
 * Optimizes Firebase queries by fetching in batches as user scrolls
 *
 * @param {Object} config - Configuration object
 * @param {number} config.mobile - Initial items for mobile screens (< 768px)
 * @param {number} config.tablet - Initial items for tablet screens (768px - 1024px)
 * @param {number} config.desktop - Initial items for desktop screens (> 1024px)
 * @param {number} config.batchSize - How many more items to load on each scroll (default: same as initial)
 * @param {number} config.maxItems - Maximum items to load (default: 50)
 * @returns {{ limit: number, displayCount: number, isReady: boolean, loadMore: function, hasMore: boolean, resetLimit: function }}
 */
export function useResponsiveLimit({
  mobile = 4,
  tablet = 6,
  desktop = 10,
  batchSize = null, // If null, uses initial count as batch size
  maxItems = 50
}) {
  const [currentLimit, setCurrentLimit] = useState(mobile);
  const [displayCount, setDisplayCount] = useState(mobile);
  const [isReady, setIsReady] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const initialCountRef = useRef(mobile);

  useEffect(() => {
    const updateLimit = () => {
      const width = window.innerWidth;
      let initialCount;

      if (width < 768) {
        initialCount = mobile;
      } else if (width < 1024) {
        initialCount = tablet;
      } else {
        initialCount = desktop;
      }

      initialCountRef.current = initialCount;
      setDisplayCount(initialCount);
      setCurrentLimit(initialCount + 2); // Small buffer for filtering
      setHasMore(true);
      setIsReady(true);
    };

    updateLimit();
  }, [mobile, tablet, desktop]);

  // Load more items
  const loadMore = useCallback(() => {
    if (!hasMore) return;

    const batch = batchSize || initialCountRef.current;
    const newDisplayCount = displayCount + batch;

    if (newDisplayCount >= maxItems) {
      setDisplayCount(maxItems);
      setCurrentLimit(maxItems + 3);
      setHasMore(false);
    } else {
      setDisplayCount(newDisplayCount);
      setCurrentLimit(newDisplayCount + 3); // Buffer for filtering
    }
  }, [displayCount, hasMore, batchSize, maxItems]);

  // Reset to initial state
  const resetLimit = useCallback(() => {
    setDisplayCount(initialCountRef.current);
    setCurrentLimit(initialCountRef.current + 2);
    setHasMore(true);
  }, []);

  return {
    limit: currentLimit,
    displayCount,
    isReady,
    loadMore,
    hasMore,
    resetLimit
  };
}

/**
 * Hook to detect when user scrolls near the end of a horizontal container
 * Triggers loadMore callback when scroll reaches threshold
 *
 * @param {React.RefObject} scrollRef - Ref to the scroll container
 * @param {function} loadMore - Callback to load more items
 * @param {boolean} hasMore - Whether there are more items to load
 * @param {number} threshold - Pixels from end to trigger load (default: 100)
 */
export function useScrollLoadMore(scrollRef, loadMore, hasMore, threshold = 100) {
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMore) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const scrollEnd = scrollWidth - clientWidth;

      // If user has scrolled near the end, load more
      if (scrollEnd - scrollLeft < threshold) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollRef, loadMore, hasMore, threshold]);
}

export default useResponsiveLimit;
