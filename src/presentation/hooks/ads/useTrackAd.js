/**
 * useTrackAd(adId, slot)
 *
 * Fires `trackAdImpression` when the returned ref becomes at least ~50%
 * visible (once per mount, so every page load counts), and exposes a
 * `trackClick` function to fire `trackAdClick` on every tap.
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || impressionFired.current) return;
          impressionFired.current = true;
          observer.disconnect();
          if (cancelled) return;

          try {
            const fn = httpsCallable(getFunctionsInstance(), 'trackAdImpression');
            fn({ adId, slot }).catch((err) => {
              console.warn('trackAdImpression call failed:', err?.message || err);
            });
          } catch (err) {
            console.warn('trackAdImpression setup failed:', err?.message || err);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => {
      cancelled = true;
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
