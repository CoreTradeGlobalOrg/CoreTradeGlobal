'use client';

/**
 * useSafeBack(fallback = '/')
 *
 * "Back" buttons used router.back(), which does nothing useful when the page
 * was opened straight from a link (new tab, shared URL, search result):
 * there is no earlier page of ours in the history. This hook goes back only
 * when we know the previous history entry is on our site, otherwise it
 * navigates to `fallback`.
 *
 * "On our site" = a client-side navigation happened in this tab
 * (NavigationTracker counts them), or the page was loaded from one of our
 * pages (same-origin referrer) and there is history to go back to.
 * document.referrer alone is not enough: client-side navigations never
 * update it.
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const NAV_COUNT_KEY = '__ctgClientNavCount';

/** Mount once in a layout; counts client-side route changes in this tab. */
export function NavigationTracker() {
  const pathname = usePathname();
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    window[NAV_COUNT_KEY] = (window[NAV_COUNT_KEY] || 0) + 1;
  }, [pathname]);
  return null;
}

function cameFromOurSite() {
  if (typeof window === 'undefined') return false;
  if ((window[NAV_COUNT_KEY] || 0) > 0) return true;
  try {
    const sameOrigin = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    return sameOrigin && window.history.length > 1;
  } catch {
    return false;
  }
}

export function useSafeBack(fallback = '/') {
  const router = useRouter();
  return useCallback(() => {
    if (cameFromOurSite()) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}

export default useSafeBack;
