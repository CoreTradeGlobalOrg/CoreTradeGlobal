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
import { ROLE_TO_COMPANY_TYPE } from '@/core/constants/companyTypes';

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
// --- Microsoft Clarity identify() -----------------------------------------

// Session-scoped throttle so we don't spam Clarity's identify API on every
// auth-state fire. Once per session per uid is plenty — the identifier
// persists across page-loads via Clarity's own storage.
const IDENTIFIED_UIDS = new Set();

/**
 * Tag the current Clarity session with the user's identity and a few
 * custom dimensions. Enables per-user session filtering in the Clarity
 * dashboard and per-user session-recording links from the admin panel.
 *
 * Safe to call:
 *   - Before the Clarity tag has finished loading (queued via clarity.q)
 *   - Multiple times per uid (deduplicated in-memory)
 *   - Without a user (no-op)
 *   - On the server (no-op, gated on `typeof window`)
 *
 * @param {{
 *   uid: string,
 *   email?: string,
 *   role?: string,
 *   country?: string,
 *   emailVerified?: boolean,
 *   adminApproved?: boolean,
 *   createdAt?: Date | string | number,
 * }} user
 */
export function identifyClarity(user) {
  if (typeof window === 'undefined') return;
  if (!user?.uid) return;
  if (IDENTIFIED_UIDS.has(user.uid)) return;

  // Clarity's snippet shape is:
  //   window.clarity = window.clarity || function () { (window.clarity.q ||= []).push(arguments); };
  // so calls before the tag loads land in the queue and replay when the
  // real function is installed. Nothing to guard against here.
  const clarity = window.clarity;
  if (typeof clarity !== 'function') return;

  IDENTIFIED_UIDS.add(user.uid);

  try {
    // identify signature: (customId, customSessionId?, customPageId?, friendlyName?)
    clarity('identify', user.uid, undefined, undefined, user.email || undefined);

    // Custom tags — become filterable dimensions in the Clarity UI.
    // Skip nullish values to keep the tag list tidy.
    const role = user.role || 'member';
    const companyType = ROLE_TO_COMPANY_TYPE[role] || 'other';
    const verified = !!user.emailVerified && !!user.adminApproved;

    clarity('set', 'membership', 'registered');
    clarity('set', 'role', role);
    clarity('set', 'companyType', companyType);
    clarity('set', 'verified', verified ? 'yes' : 'no');
    if (user.country) clarity('set', 'country', user.country);
    if (user.createdAt) {
      const iso =
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : typeof user.createdAt?.toDate === 'function'
            ? user.createdAt.toDate().toISOString()
            : new Date(user.createdAt).toISOString();
      clarity('set', 'joinDate', iso.slice(0, 10)); // yyyy-mm-dd, day-level
    }
  } catch (err) {
    // Never bubble — this feeds analytics, not the app.
    // eslint-disable-next-line no-console
    console.warn('[analytics:tracking] identifyClarity failed:', err?.message || err);
  }
}

/**
 * Build the deep link that opens Clarity's recordings view filtered
 * down to a single user. Consumed by admin-side per-user "Clarity'de
 * gör" buttons.
 *
 * Returns null when the project id env var is missing so the calling
 * code can hide the button rather than emit a broken link.
 */
export function clarityUserRecordingsUrl(uid) {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId || !uid) return null;
  return `https://clarity.microsoft.com/projects/view/${projectId}/impressions?CustomUserId=${encodeURIComponent(uid)}`;
}

// --- Firestore user tracking -----------------------------------------------

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
