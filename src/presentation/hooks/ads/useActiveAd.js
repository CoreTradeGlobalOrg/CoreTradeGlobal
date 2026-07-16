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

export function useActiveAd(type) {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type) {
      setAd(null);
      setLoading(false);
      return undefined;
    }

    const q = query(
      collection(db, 'ads'),
      where('type', '==', type),
      where('status', '==', AD_STATUSES.ACTIVE)
    );

    const unsub = onSnapshot(
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
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

        setAd(candidates[0] || null);
        setLoading(false);
      },
      (err) => {
        console.warn('useActiveAd snapshot error:', err);
        setAd(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [type]);

  return { ad, loading };
}

export default useActiveAd;
