/**
 * useActiveAd(type)
 *
 * Returns the currently-active ad for a given placement type or null
 * when nothing is running. Real-time via onSnapshot so if an admin
 * pauses or edits from the /admin dashboard the change is reflected on
 * the visitor's screen without a refresh.
 *
 * Selection logic:
 *   - Only ads with status === 'active' compete for the slot
 *   - startDate <= now <= endDate is the additional client-side filter
 *     (Firestore rules already gate visibility to public reads; we
 *     could push the date range into the query but every admin action
 *     already sets `status` so we lean on that + a cheap local check)
 *   - Highest `priority` wins ties (default 0). Weekly booking makes
 *     collisions rare, but priority is the tiebreaker of last resort.
 *
 * Impression tracking is intentionally *not* fired from here — call
 * the `useTrackAdImpression` hook from the injection point once the
 * ad actually renders in-viewport, so background/hidden tab loads
 * don't inflate the counter.
 */

'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { AD_STATUSES } from '@/core/constants/adTypes';

// Shared subscription that returns every currently-active ad of a
// type, sorted by priority (highest first) then by startDate (newest
// first) as a stable tiebreaker. Reused by both `useActiveAd` (which
// picks the top one) and `useActiveAds` (which returns the full list
// — the Carousel placement uses this so up to 8 sponsored cards can
// share the same week).
function subscribeActiveAds(type, onData, onError) {
  const q = query(
    collection(db, 'ads'),
    where('type', '==', type),
    where('status', '==', AD_STATUSES.ACTIVE)
  );

  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const candidates = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => {
          const startMs = a.startDate?.toDate?.().getTime?.() ?? 0;
          const endMs = a.endDate?.toDate?.().getTime?.() ?? 0;
          return now >= startMs && now <= endMs;
        })
        .sort((a, b) => {
          const pDiff = (b.priority ?? 0) - (a.priority ?? 0);
          if (pDiff !== 0) return pDiff;
          const aStart = a.startDate?.toDate?.().getTime?.() ?? 0;
          const bStart = b.startDate?.toDate?.().getTime?.() ?? 0;
          return bStart - aStart;
        });
      onData(candidates);
    },
    (err) => {
      console.warn(`ads snapshot error (type=${type}):`, err);
      onError?.(err);
    }
  );
}

export function useActiveAd(type) {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type) {
      setAd(null);
      setLoading(false);
      return undefined;
    }

    const unsub = subscribeActiveAds(
      type,
      (candidates) => {
        setAd(candidates[0] || null);
        setLoading(false);
      },
      () => {
        setAd(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [type]);

  return { ad, loading };
}

/**
 * useActiveAds(type, { limit } = {})
 *
 * Plural variant — returns every currently-active ad for a type as
 * an array (sorted highest priority first, newest first as tiebreak).
 * Cap the array length with `limit` when the placement has a fixed
 * number of slots (e.g. the 3D Featured Companies carousel caps at
 * 8 sponsored cards per week to match the admin form's overlap cap).
 */
export function useActiveAds(type, { limit } = {}) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type) {
      setAds([]);
      setLoading(false);
      return undefined;
    }

    const unsub = subscribeActiveAds(
      type,
      (candidates) => {
        setAds(typeof limit === 'number' ? candidates.slice(0, limit) : candidates);
        setLoading(false);
      },
      () => {
        setAds([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [type, limit]);

  return { ads, loading };
}

export default useActiveAd;
