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

// --- Growth: monthly registrations + MoM -----------------------------------

/**
 * Format a Date to `yyyy-mm` in the local timezone. Growth buckets
 * key by calendar month; using UTC would slice a Turkish evening
 * registration into the previous month.
 */
function toMonthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d);
}

/**
 * Growth panel dataset. One users read, everything derived in memory
 * — cheaper than five separate aggregation queries and lets us
 * cross-tab (country × month, companyType × month) without paying
 * per-slice.
 *
 * @param {{ monthlyTarget?: number, monthsBack?: number }} args
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   thisMonthKey: string,
 *   thisMonthCount: number,
 *   lastMonthCount: number,
 *   momPercent: number | null,             // % change vs previous full month
 *   momentum: 'accelerating' | 'steady' | 'slowing' | 'insufficient',
 *   monthlyTarget: number,
 *   targetProgressPercent: number,
 *   monthlySeries: Array<{ month: string, count: number, cumulative: number }>,
 *   dailySeriesLast90: Array<{ date: string, count: number, cumulative: number }>,
 *   forecastNext30: number,                // rough linear projection
 *   countryDelta: Array<{
 *     country: string, thisMonth: number, lastMonth: number, delta: number,
 *   }>,
 *   companyTypeSeries: Array<{
 *     companyType: string, series: Array<{ month: string, count: number }>,
 *   }>,
 * }>}
 */
export async function getGrowthMetrics({ monthlyTarget = 30, monthsBack = 12 } = {}) {
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));
  const now = new Date();
  const thisMonthKey = toMonthKey(now);
  const lastMonthKey = shiftMonth(thisMonthKey, -1);

  // Build the last N months window (oldest → newest) so bar charts read
  // left-to-right in chronological order.
  const monthKeys = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    monthKeys.push(shiftMonth(thisMonthKey, -i));
  }

  const monthCounts = new Map(monthKeys.map((k) => [k, 0]));
  const countryThisMonth = new Map();
  const countryLastMonth = new Map();
  // companyType → monthKey → count
  const companyTypeMonthly = new Map();

  // Daily series for the last 90 days for a smoother trend curve.
  const startOfLast90 = new Date(now.getTime() - 89 * MS_PER_DAY);
  startOfLast90.setHours(0, 0, 0, 0);
  const startOfLast90Time = startOfLast90.getTime();
  const dailyCounts = new Map(); // yyyy-mm-dd → count

  const rows = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const createdAt = toDate(data.createdAt);
    if (!createdAt) return; // skip users with no createdAt (legacy import gap)

    rows.push({ createdAt, data });

    const monthKey = toMonthKey(createdAt);
    if (monthCounts.has(monthKey)) {
      monthCounts.set(monthKey, monthCounts.get(monthKey) + 1);
    }

    const role = data.role || 'member';
    const companyType = ROLE_TO_COMPANY_TYPE[role] || 'other';
    if (!companyTypeMonthly.has(companyType)) {
      companyTypeMonthly.set(companyType, new Map(monthKeys.map((k) => [k, 0])));
    }
    const ctMap = companyTypeMonthly.get(companyType);
    if (ctMap.has(monthKey)) ctMap.set(monthKey, ctMap.get(monthKey) + 1);

    const country = (data.country || 'Unknown').trim() || 'Unknown';
    if (monthKey === thisMonthKey) {
      countryThisMonth.set(country, (countryThisMonth.get(country) || 0) + 1);
    } else if (monthKey === lastMonthKey) {
      countryLastMonth.set(country, (countryLastMonth.get(country) || 0) + 1);
    }

    if (createdAt.getTime() >= startOfLast90Time) {
      const dayKey = (() => {
        const y = createdAt.getFullYear();
        const m = String(createdAt.getMonth() + 1).padStart(2, '0');
        const day = String(createdAt.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })();
      dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
    }
  });

  // Turn the monthly counts into a series with a running cumulative
  // that seeds from "everyone registered before the window".
  const totalBeforeWindow = rows.filter(
    (r) => toMonthKey(r.createdAt) < monthKeys[0],
  ).length;

  let running = totalBeforeWindow;
  const monthlySeries = monthKeys.map((month) => {
    const count = monthCounts.get(month) || 0;
    running += count;
    return { month, count, cumulative: running };
  });

  // Daily zero-filled series for the last 90 days with cumulative.
  const dailySeriesLast90 = [];
  let dailyRunning = rows.filter(
    (r) => r.createdAt.getTime() < startOfLast90Time,
  ).length;
  for (let i = 0; i < 90; i++) {
    const d = new Date(startOfLast90Time + i * MS_PER_DAY);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    const count = dailyCounts.get(key) || 0;
    dailyRunning += count;
    dailySeriesLast90.push({ date: key, count, cumulative: dailyRunning });
  }

  const thisMonthCount = monthCounts.get(thisMonthKey) || 0;
  const lastMonthCount = monthCounts.get(lastMonthKey) || 0;

  // MoM percent: standard percent change. When lastMonth is zero and
  // thisMonth is positive, "infinite" isn't a useful number for the
  // UI — return null and let the panel render "—".
  let momPercent = null;
  if (lastMonthCount > 0) {
    momPercent = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
  } else if (thisMonthCount === 0 && lastMonthCount === 0) {
    momPercent = 0;
  }

  // Momentum reads the slope over the last three full months (skip the
  // current in-progress month so partial data doesn't skew it).
  const closedMonths = monthlySeries.slice(0, -1);
  const lastThree = closedMonths.slice(-3).map((r) => r.count);
  let momentum = 'insufficient';
  if (lastThree.length === 3) {
    const [a, b, c] = lastThree;
    if (c > b && b >= a) momentum = 'accelerating';
    else if (c < b && b <= a) momentum = 'slowing';
    else momentum = 'steady';
  }

  const targetProgressPercent =
    monthlyTarget > 0
      ? Math.min(Math.round((thisMonthCount / monthlyTarget) * 100), 999)
      : 0;

  // Forecast: average of the last 30 days × 30. Simple and honest —
  // marketplace registrations are noisy so anything fancier would
  // over-fit at this scale.
  const last30 = dailySeriesLast90.slice(-30);
  const last30Avg = last30.reduce((s, r) => s + r.count, 0) / (last30.length || 1);
  const forecastNext30 = Math.round(last30Avg * 30);

  // Country delta: union of this-month and last-month countries, sorted
  // by this-month count desc.
  const countrySet = new Set([...countryThisMonth.keys(), ...countryLastMonth.keys()]);
  const countryDelta = Array.from(countrySet)
    .map((country) => {
      const tm = countryThisMonth.get(country) || 0;
      const lm = countryLastMonth.get(country) || 0;
      return { country, thisMonth: tm, lastMonth: lm, delta: tm - lm };
    })
    .sort((a, b) => b.thisMonth - a.thisMonth || b.delta - a.delta);

  // Company type series: per-type array-of-months. Only emit types that
  // actually appear in the window.
  const companyTypeSeries = Array.from(companyTypeMonthly.entries())
    .map(([companyType, mMap]) => ({
      companyType,
      series: monthKeys.map((month) => ({ month, count: mMap.get(month) || 0 })),
    }))
    .filter((row) => row.series.some((r) => r.count > 0))
    .sort((a, b) => {
      const sumA = a.series.reduce((s, r) => s + r.count, 0);
      const sumB = b.series.reduce((s, r) => s + r.count, 0);
      return sumB - sumA;
    });

  return {
    snapshotAt: new Date(),
    total: snap.size,
    thisMonthKey,
    thisMonthCount,
    lastMonthCount,
    momPercent,
    momentum,
    monthlyTarget,
    targetProgressPercent,
    monthlySeries,
    dailySeriesLast90,
    forecastNext30,
    countryDelta,
    companyTypeSeries,
  };
}

// --- Members: activity + churn snapshot ------------------------------------

/**
 * Buckets a user into one of five activity states based on
 * `daysSinceLogin`. Names are used by both the activity view and the
 * churn view so the two panels never disagree.
 */
export function activityBucket(daysSinceLogin) {
  if (daysSinceLogin === null || daysSinceLogin === undefined) return 'never';
  if (daysSinceLogin <= 7) return 'active7d';
  if (daysSinceLogin <= 30) return 'active30d';
  if (daysSinceLogin <= 60) return 'dormant30to60';
  if (daysSinceLogin <= 90) return 'churn60to90';
  return 'churn90plus';
}

/**
 * Single read of every user document with derived activity fields per
 * row. Both the Activity table (3.3) and the Churn Risk table (3.4)
 * feed off this — one Firestore round-trip serves both views.
 *
 * @returns {Promise<{
 *   total: number,
 *   snapshotAt: Date,
 *   rows: Array<{
 *     uid: string,
 *     displayName: string,
 *     email: string,
 *     companyName: string,
 *     country: string,
 *     role: string,
 *     lastLoginAt: Date | null,
 *     daysSinceLogin: number | null,
 *     bucket: 'active7d'|'active30d'|'dormant30to60'|'churn60to90'|'churn90plus'|'never',
 *     isVerified: boolean,
 *     isSuspended: boolean,
 *     createdAt: Date | null,
 *   }>,
 *   counts: Record<string, number>,   // bucket -> count
 * }>}
 */
export async function getMemberActivitySnapshot() {
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));
  const now = Date.now();

  const counts = {
    active7d: 0,
    active30d: 0,
    dormant30to60: 0,
    churn60to90: 0,
    churn90plus: 0,
    never: 0,
  };

  const rows = snap.docs.map((doc) => {
    const data = doc.data() || {};
    const lastLoginAt = toDate(data.lastLoginAt);
    const daysSinceLogin = lastLoginAt
      ? Math.floor((now - lastLoginAt.getTime()) / MS_PER_DAY)
      : null;
    const bucket = activityBucket(daysSinceLogin);
    counts[bucket] += 1;

    return {
      uid: doc.id,
      displayName: data.fullName || data.displayName || '(no name)',
      email: data.email || '',
      companyName: data.companyName || '',
      country: data.country || '',
      role: data.role || 'member',
      lastLoginAt,
      daysSinceLogin,
      bucket,
      isVerified: !!data.emailVerified && !!data.adminApproved,
      isSuspended: !!data.isSuspended,
      createdAt: toDate(data.createdAt),
    };
  });

  return {
    total: snap.size,
    snapshotAt: new Date(),
    rows,
    counts,
  };
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
