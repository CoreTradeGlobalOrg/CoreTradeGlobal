/**
 * useSponsoredHeroAd
 *
 * The vanilla useActiveAd(SPONSORED) only returns an ad when
 * `startDate <= now <= endDate`. Sponsored packages are sold one full
 * calendar month at a time, so a purchase made on Sept 28 that starts
 * Oct 1 is stuck in `SCHEDULED` status for a few days — hero renders
 * the "Book Your Spot" placeholder in the meantime, which is jarring
 * for both the buyer (they just paid, expected to see themselves live)
 * and other visitors (a spot that was clearly bought reads as vacant).
 *
 * This hook is the hero-specific relaxation: it returns the sponsored
 * ad that's either currently active OR scheduled to start within the
 * next 45 days. The homepage hero and the mobile hero cards mount it
 * so a paid campaign shows up the moment admin marks it paid, framed
 * as an upcoming reservation rather than a live one until start day.
 *
 * Anything further out (or expired) is ignored — this is a "next
 * reservation" surface, not a history feed.
 */

'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { AD_TYPES, AD_STATUSES } from '@/core/constants/adTypes';

const LOOKAHEAD_MS = 45 * 24 * 60 * 60 * 1000;

export function useSponsoredHeroAd() {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'ads'),
      where('type', '==', AD_TYPES.SPONSORED),
      where('status', 'in', [AD_STATUSES.ACTIVE, AD_STATUSES.SCHEDULED, AD_STATUSES.PAUSED]),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const cutoff = now + LOOKAHEAD_MS;
        // Keep ads that either overlap today or start inside the
        // lookahead window; sort ACTIVE first, then earliest-start next.
        const candidates = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .map((a) => ({
            ...a,
            _start: a.startDate?.toDate?.().getTime?.() ?? 0,
            _end: a.endDate?.toDate?.().getTime?.() ?? 0,
          }))
          .filter((a) => a._end >= now && a._start <= cutoff);

        candidates.sort((a, b) => {
          const aActive = a._start <= now && a._end >= now ? 0 : 1;
          const bActive = b._start <= now && b._end >= now ? 0 : 1;
          if (aActive !== bActive) return aActive - bActive;
          return a._start - b._start;
        });

        setAd(candidates[0] || null);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[useSponsoredHeroAd] listen failed:', err);
      },
    );
    return () => unsub();
  }, []);

  return ad;
}
