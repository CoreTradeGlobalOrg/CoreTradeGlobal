/**
 * Analytics query layer.
 *
 * ANY panel component that needs data calls a function from THIS file.
 * Components never import `firebase/firestore` directly for analytics use
 * — that's the whole point of this layer.
 *
 * Why the indirection: the backend is on a migration path (Firestore →
 * own Postgres backend, keeping Firebase Auth). When that migration
 * flips, only the bodies of these functions change. Every component,
 * every hook, every chart on the analytics dashboard keeps its exact
 * import and call signature. The alternative — components calling
 * Firestore directly — would mean rewriting the whole panel later.
 *
 * All functions return plain-JS objects/arrays. No Firestore snapshots,
 * no server-side references leak out. Timestamps normalised to JS Date.
 */

import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';
import { ROLE_TO_COMPANY_TYPE } from '@/core/constants/companyTypes';

// --- helpers ---------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(days) {
  return new Date(Date.now() - days * MS_PER_DAY);
}

/**
 * Normalise a Firestore Timestamp, JS Date, ISO string, or millis number
 * into a JS Date. Panel code never has to sniff the source shape.
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// --- Overview KPIs ---------------------------------------------------------

/**
 * KPI cards on the Overview screen. Uses Firestore's count aggregation
 * where possible (single billed read per aggregate), falls back to full
 * scans only where a time filter is needed on a field that isn't
 * strictly indexed.
 *
 * @returns {Promise<{
 *   totalMembers: number,
 *   newMembersThisWeek: number,
 *   activeMembers30d: number | null,   // null = tracking not wired yet
 *   totalProducts: number,
 *   activeAds: number,
 *   activeConversations: number,
 *   computedAt: Date,
 * }>}
 */
export async function getOverviewKpis() {
  const weekAgo = Timestamp.fromDate(daysAgo(7));
  const monthAgo = Timestamp.fromDate(daysAgo(30));

  const usersRef = collection(db, COLLECTIONS.USERS);
  const productsRef = collection(db, COLLECTIONS.PRODUCTS);
  const adsRef = collection(db, 'ads');
  const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);

  const [
    totalMembersSnap,
    newMembersSnap,
    activeMembersSnap,
    totalProductsSnap,
    activeAdsSnap,
    activeConversationsSnap,
  ] = await Promise.all([
    getCountFromServer(usersRef),
    getCountFromServer(query(usersRef, where('createdAt', '>=', weekAgo))),
    // lastLoginAt is bumped from AuthContext on every real login-state
    // resolution (throttled). Users still on the pre-tracking corpus
    // will lack the field entirely and get excluded here — acceptable,
    // the field back-fills naturally as they return to the site.
    getCountFromServer(query(usersRef, where('lastLoginAt', '>=', monthAgo))),
    getCountFromServer(productsRef),
    // Ad campaigns store status 'active' | 'scheduled' | 'expired' | 'rejected'.
    getCountFromServer(query(adsRef, where('status', '==', 'active'))),
    getCountFromServer(conversationsRef),
  ]);

  return {
    totalMembers: totalMembersSnap.data().count,
    newMembersThisWeek: newMembersSnap.data().count,
    activeMembers30d: activeMembersSnap.data().count,
    totalProducts: totalProductsSnap.data().count,
    activeAds: activeAdsSnap.data().count,
    activeConversations: activeConversationsSnap.data().count,
    computedAt: new Date(),
  };
}

// --- Members: recent registrations table -----------------------------------

/**
 * Users who registered within the last `days` days, newest first.
 * Full docs are fetched — only a couple hundred rows at current scale,
 * an aggregation query wouldn't give us the fields we need to render.
 */
export async function getRecentMembers({ days = 30 } = {}) {
  const cutoff = Timestamp.fromDate(daysAgo(days));
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where('createdAt', '>=', cutoff));
  const snap = await getDocs(q);

  const rows = snap.docs.map((doc) => {
    const data = doc.data() || {};
    const role = data.role || 'member';
    return {
      id: doc.id,
      displayName: data.displayName || '(no name)',
      email: data.email || '',
      companyName: data.companyName || '',
      country: data.country || '',
      role,
      // companyType is now derived from role, matching the profile card.
      companyType: ROLE_TO_COMPANY_TYPE[role] || null,
      createdAt: toDate(data.createdAt),
      isVerified: !!data.emailVerified && !!data.adminApproved,
      isSuspended: !!data.isSuspended,
    };
  });

  rows.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return rows;
}

// --- Members: profile distribution -----------------------------------------

/**
 * Aggregate distribution buckets for the profile-mix charts. Fetches the
 * full users collection (small at current scale) and groups in memory —
 * cheaper than five separate Firestore aggregation queries.
 *
 * @returns {Promise<{
 *   total: number,
 *   byCountry: Array<{ key: string, count: number }>,   // sorted desc
 *   byCompanyType: Array<{ key: string, count: number }>,
 *   verifiedCount: number,
 *   unverifiedCount: number,
 * }>}
 */
export async function getMemberDistribution() {
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));

  const byCountry = new Map();
  const byCompanyType = new Map();
  let verifiedCount = 0;

  snap.forEach((doc) => {
    const data = doc.data() || {};
    const country = (data.country || 'Unknown').trim() || 'Unknown';
    const role = data.role || 'member';
    const companyType = ROLE_TO_COMPANY_TYPE[role] || 'other';

    byCountry.set(country, (byCountry.get(country) || 0) + 1);
    byCompanyType.set(companyType, (byCompanyType.get(companyType) || 0) + 1);

    if (data.emailVerified && data.adminApproved) verifiedCount += 1;
  });

  const total = snap.size;
  const toSortedArray = (map) =>
    Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

  return {
    total,
    byCountry: toSortedArray(byCountry),
    byCompanyType: toSortedArray(byCompanyType),
    verifiedCount,
    unverifiedCount: total - verifiedCount,
  };
}
