/**
 * usePageTracking Hook
 *
 * Automatically tracks page views and time on page
 * Integrates with Next.js router for route change detection
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAnalytics } from '@/presentation/contexts/AnalyticsContext';

export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView, isEnabled } = useAnalytics();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isEnabled) return;

    // Build full path with search params
    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    // Track page view
    trackPageView(fullPath, document.title);

    // Mark first render as complete
    isFirstRender.current = false;
  }, [pathname, searchParams, trackPageView, isEnabled]);

  return { pathname, isEnabled };
}

export default usePageTracking;
