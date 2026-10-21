/**
 * useTrackAd(adId, slot)
 *
 * Fires `trackAdImpression` once the returned ref has stayed at least 50%
 * visible for 1 continuous second (the IAB / MRC viewable-impression
 * rule; once per mount, so every page load counts), and exposes a
 * `trackClick` function to fire `trackAdClick` on every tap. Before
 * 2026-10-21 an impression counted the moment the ad was 50% visible,
 * so counts from that period run a little higher.
 *
 * `slot` names the placement for the per-slot report:
 * 'hero_product' | 'hero_company' | 'showcase' | 'products_list'.
 *
 * Both callables fail-soft — a network error must never break the ad.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/core/config/firebase.config';

const VIEWABLE_MS = 1000;

export function useTrackAd(adId, slot) {
  const nodeRef = useRef(null);
  const impressionFired = useRef(false);

  const setRef = useCallback((node) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    if (!adId || typeof window === 'undefined') return undefined;
    const node = nodeRef.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;

    let cancelled = false;
    let viewTimer = null;

    const fireImpression = () => {
      viewTimer = null;
      if (cancelled || impressionFired.current) return;
      impressionFired.current = true;
      observer.disconnect();
      try {
        const fn = httpsCallable(getFunctionsInstance(), 'trackAdImpression');
        fn({ adId, slot }).catch((err) => {
          console.warn('trackAdImpression call failed:', err?.message || err);
        });
      } catch (err) {
        console.warn('trackAdImpression setup failed:', err?.message || err);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (impressionFired.current) return;
          // 0.49: the ratio reported at the 0.5 threshold can round just under it.
          if (entry.isIntersecting && entry.intersectionRatio >= 0.49) {
            if (!viewTimer) viewTimer = setTimeout(fireImpression, VIEWABLE_MS);
          } else if (viewTimer) {
            // Scrolled away (or hidden) before a full second: not viewable.
            clearTimeout(viewTimer);
            viewTimer = null;
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => {
      cancelled = true;
      if (viewTimer) clearTimeout(viewTimer);
      observer.disconnect();
    };
  }, [adId, slot]);

  const trackClick = useCallback(() => {
    if (!adId) return;
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'trackAdClick');
      fn({ adId, slot }).catch((err) => {
        console.warn('trackAdClick call failed:', err?.message || err);
      });
    } catch (err) {
      console.warn('trackAdClick setup failed:', err?.message || err);
    }
  }, [adId, slot]);

  return { setRef, trackClick };
}

export default useTrackAd;
