/**
 * useUserProfile — one-shot fetch of a single user document.
 *
 * Used by the SPONSORED ad pipeline to resolve the sponsor's company
 * info (name, logo, description, country, category) at render time —
 * the ad doc only stores a userId, keeping the display always in sync
 * with the user's live profile so a name change or logo swap flows
 * everywhere the sponsored card appears without a batch backfill.
 */

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'users', userId))
      .then((snap) => {
        if (cancelled) return;
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[useUserProfile] fetch failed:', err);
        setProfile(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { profile, loading };
}
