/**
 * Client-side analytics write helpers.
 *
 * These functions bump user-scoped tracking fields in Firestore that
 * feed the analytics dashboard (Active-30d KPI, engagement scoring
 * later on). They are always fire-and-forget from the caller's
 * perspective — a tracking failure must never block auth, navigation,
 * or any user-facing flow.
 */

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';

// Local throttle key. onAuthStateChanged fires far more often than a
// human logs in (page refresh, token rotation, tab focus). Guard the
// Firestore write behind a small localStorage record so we bump at
// most once per hour per browser tab — the KPI resolution is daily
// anyway, so hourly is plenty precise.
const LOCAL_KEY = 'analytics:lastLoginBumpTs';
const MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function readLastBump() {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeLastBump(ts) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, String(ts));
  } catch {
    // Ignore storage quota / privacy-mode failures.
  }
}

/**
 * Bump `lastLoginAt` on the user document. Throttled to at most one
 * Firestore write per hour per browser. Safe to call on every auth
 * state resolution — the guard makes it cheap.
 *
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function bumpLastLoginAt(uid) {
  if (!uid) return;

  const now = Date.now();
  const last = readLastBump();
  if (last && now - last < MIN_INTERVAL_MS) return;

  // Optimistic: mark local timestamp BEFORE the write so a second
  // concurrent auth-state fire doesn't race in a duplicate write.
  writeLastBump(now);

  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      lastLoginAt: serverTimestamp(),
    });
  } catch (err) {
    // Roll the local marker back so we retry on the next opportunity.
    writeLastBump(last);
    // eslint-disable-next-line no-console
    console.warn('[analytics:tracking] bumpLastLoginAt failed:', err?.message || err);
  }
}
