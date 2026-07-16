/**
 * useTrackAd(adId)
 *
 * Fires `trackAdImpression` when the returned ref becomes at least ~50%
 * visible for the first time in this session, and exposes a `trackClick`
 * function to fire `trackAdClick` when the user actually taps the ad.
 *
 * The Cloud Function does its own per-client cooldown (30 min for
 * impressions, 5 min for clicks) so it's safe to fire more than once.
 * The session-guard here just avoids the round-trip when we already
 * know we counted this ad on this page load.
 *
 * Both callables fail-soft — a network error must never break the ad.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/core/config/firebase.config';

export function useTrackAd(adId) {
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
            fn({ adId }).catch((err) => {
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
  }, [adId]);

  const trackClick = useCallback(() => {
    if (!adId) return;
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'trackAdClick');
      fn({ adId }).catch((err) => {
        console.warn('trackAdClick call failed:', err?.message || err);
      });
    } catch (err) {
      console.warn('trackAdClick setup failed:', err?.message || err);
    }
  }, [adId]);

  return { setRef, trackClick };
}

export default useTrackAd;
