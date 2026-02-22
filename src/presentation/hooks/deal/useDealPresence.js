/**
 * useDealPresence Hook
 *
 * Implements the Firestore heartbeat presence pattern.
 * On mount: writes { viewingDealId, viewingDealSince: serverTimestamp() } to users/{uid}.
 * Every 30s: refreshes viewingDealSince to keep presence alive.
 * On unmount: clears viewingDealId and viewingDealSince.
 *
 * Also subscribes to the OTHER party's user doc to detect if they're viewing.
 * Returns { otherPartyViewing } boolean.
 *
 * Note: if the browser crashes, cleanup won't run. The 60-second staleness window
 * in the CF check (Plan 04) handles this edge case.
 *
 * Source: 02-RESEARCH.md Pattern 7
 */

'use client';

import { useEffect, useState } from 'react';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';

const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
const STALE_THRESHOLD_MS = 60 * 1000;    // 60 seconds — treat as not viewing if older

/**
 * useDealPresence
 *
 * @param {string|null} dealId
 * @param {import('@/domain/entities/Deal').Deal|null} deal - Used to find the other party's UID
 * @returns {{ otherPartyViewing: boolean }}
 */
export function useDealPresence(dealId, deal) {
  const { user } = useAuth();
  const [otherPartyViewing, setOtherPartyViewing] = useState(false);

  const uid = user?.uid;

  // ── Own presence heartbeat ─────────────────────────────────────────────────
  useEffect(() => {
    if (!dealId || !uid) return;

    const userRef = doc(db, 'users', uid);

    // Set presence immediately on mount
    updateDoc(userRef, {
      viewingDealId: dealId,
      viewingDealSince: serverTimestamp(),
    }).catch((err) => {
      // Non-fatal — presence is best-effort
      console.warn('useDealPresence: failed to set viewingDealId', err);
    });

    // Heartbeat interval to keep presence fresh
    const heartbeat = setInterval(() => {
      updateDoc(userRef, {
        viewingDealId: dealId,
        viewingDealSince: serverTimestamp(),
      }).catch((err) => {
        console.warn('useDealPresence: heartbeat failed', err);
      });
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup on unmount (page leave)
    return () => {
      clearInterval(heartbeat);
      updateDoc(userRef, {
        viewingDealId: null,
        viewingDealSince: null,
      }).catch((err) => {
        console.warn('useDealPresence: failed to clear viewingDealId', err);
      });
    };
  }, [dealId, uid]);

  // ── Other party's presence subscription ───────────────────────────────────
  useEffect(() => {
    if (!dealId || !deal || !uid) return;

    // Find the other participant's UID
    const otherUid = deal.buyerId === uid ? deal.sellerId : deal.buyerId;
    if (!otherUid) return;

    const otherUserRef = doc(db, 'users', otherUid);

    const unsub = onSnapshot(
      otherUserRef,
      (snap) => {
        if (!snap.exists()) {
          setOtherPartyViewing(false);
          return;
        }

        const data = snap.data();
        const isViewingThisDeal = data?.viewingDealId === dealId;
        const viewingSince = data?.viewingDealSince;

        // Check staleness: viewingDealSince must be within the last 60 seconds
        const sinceMs = viewingSince?.toMillis?.() ?? null;
        const isRecent = sinceMs != null && (Date.now() - sinceMs) < STALE_THRESHOLD_MS;

        setOtherPartyViewing(isViewingThisDeal && isRecent);
      },
      (err) => {
        console.warn('useDealPresence: other party snapshot error', err);
        setOtherPartyViewing(false);
      }
    );

    return () => unsub();
  }, [dealId, deal?.buyerId, deal?.sellerId, uid]);

  return { otherPartyViewing };
}

export default useDealPresence;
