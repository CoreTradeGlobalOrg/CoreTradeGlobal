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

// --- Alert Center (Bölüm 11) ----------------------------------------------

/**
 * Alert levels ordered by severity. UI colours + display labels
 * are derived from this in one place.
 */
export const ALERT_LEVELS = ['critical', 'high', 'medium', 'low'];

export const ALERT_LEVEL_META = {
  critical: { label: 'Critical', color: '#EF4444', order: 0 },
  high: { label: 'High', color: '#F97316', order: 1 },
  medium: { label: 'Medium', color: '#F59E0B', order: 2 },
  low: { label: 'Low', color: '#3B82F6', order: 3 },
};

/**
 * Aggregate alert center — collects warnings from every other panel
 * into one prioritised list. First pass reads live from the same
 * queries the individual sections use; a persisted `alerts` table
 * with snooze/acknowledge lands when the engagement + backend work
 * follows.
 *
 * Rules (severity in parens):
 *   - Deal in shipment >30 days (critical)
 *   - Ad past end date but still 'active' (critical)
 *   - Member churn — 60+ days silent, not suspended (critical)
 *   - Ad ending in ≤3 days (high)
 *   - Team-log missing ≥3 days for an admin (high)
 *   - RFQ open >7 days with no quotes (high)
 *   - Deal negotiating >5 days (high)
 *   - Member dormant 30-60 days (medium)
 *   - Profile with a required field missing (medium)
 *   - Team-log missing 1-2 days (medium)
 *   - Active RFQ (informational, low)
 *
 * Each alert carries: id, level, category, title, detail, actor,
 * ageDays, actionHref (deep link into the section that owns the
 * signal).
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   counts: Record<'critical'|'high'|'medium'|'low', number>,
 *   alerts: Array<{
 *     id: string,
 *     level: string,
 *     category: string,
 *     title: string,
 *     detail: string,
 *     actor: string,
 *     ageDays: number|null,
 *     actionHref: string|null,
 *   }>,
 * }>}
 */
export async function getAlertCenter() {
  // Reuse the source-of-truth queries so alert logic stays in one
  // place per signal. Parallel fetch since none of them depend on
  // each other.
  const [
    activity,
    ads,
    profile,
    tradeFlow,
    missingTeamLog,
  ] = await Promise.all([
    getMemberActivitySnapshot(),
    getAdsPerformance(),
    getProfileCompleteness(),
    getTradeFlowMetrics(),
    (async () => {
      // Lazy import to avoid a circular reference through teamLog.js —
      // it also imports getDocs and would otherwise hit the query
      // module in an unhealthy order.
      const mod = await import('./teamLog');
      return mod.getMissingEntryWarnings({ days: 3 });
    })(),
  ]);

  const alerts = [];
  let nextId = 0;
  const pushAlert = (level, category, title, detail, opts = {}) => {
    alerts.push({
      id: `${category}-${nextId++}`,
      level,
      category,
      title,
      detail,
      actor: opts.actor || '',
      ageDays: opts.ageDays ?? null,
      actionHref: opts.actionHref || null,
    });
  };

  // --- Trade flow: stalled deals ---
  for (const s of tradeFlow.stalled) {
    if (s.type === 'deal') {
      const isShipment = s.label.startsWith('In shipment');
      pushAlert(
        isShipment ? 'critical' : 'high',
        'trade-flow',
        isShipment ? 'Shipment stalled' : 'Negotiation stalled',
        s.label,
        {
          actor: s.actor,
          ageDays: s.ageDays,
          actionHref: '/admin/analytics#trade-flow',
        },
      );
    } else if (s.type === 'rfq') {
      pushAlert('high', 'trade-flow', 'RFQ with no quotes', s.label, {
        actor: s.actor,
        ageDays: s.ageDays,
        actionHref: '/admin/analytics#trade-flow',
      });
    }
  }

  // --- Ads: past-due + ending soon ---
  for (const row of ads.stalePastEnd) {
    pushAlert('critical', 'ads', 'Ad past end date but still active', row.companyName, {
      actor: row.companyName,
      ageDays: row.daysOverdue,
      actionHref: '/admin?tab=ad-campaigns',
    });
  }
  for (const row of ads.endingSoon) {
    pushAlert(
      'high',
      'ads',
      row.daysRemaining === 0 ? 'Ad ends today' : 'Ad ending soon',
      row.daysRemaining === 0
        ? `${row.companyName} campaign closes today`
        : `${row.companyName} — ${row.daysRemaining} days remaining`,
      {
        actor: row.companyName,
        ageDays: null,
        actionHref: '/admin?tab=ad-campaigns',
      },
    );
  }

  // --- Members: churn + dormant ---
  for (const row of activity.rows) {
    if (row.isSuspended) continue;
    if (row.bucket === 'churn90plus') {
      pushAlert('critical', 'members', 'Critical churn (90+ days silent)', row.email || row.displayName, {
        actor: row.displayName,
        ageDays: row.daysSinceLogin,
        actionHref: '/admin/analytics#members',
      });
    } else if (row.bucket === 'churn60to90') {
      pushAlert('high', 'members', 'Churn risk (60-90 days silent)', row.email || row.displayName, {
        actor: row.displayName,
        ageDays: row.daysSinceLogin,
        actionHref: '/admin/analytics#members',
      });
    } else if (row.bucket === 'dormant30to60') {
      pushAlert('medium', 'members', 'Dormant member (30-60 days silent)', row.email || row.displayName, {
        actor: row.displayName,
        ageDays: row.daysSinceLogin,
        actionHref: '/admin/analytics#members',
      });
    }
  }

  // --- Team log: missing entries ---
  for (const w of missingTeamLog) {
    if (w.severity === 'red') {
      pushAlert(
        'high',
        'team-log',
        w.daysSince === null ? 'Team member never logged' : 'Team log silence (3+ days)',
        w.displayName,
        {
          actor: w.displayName,
          ageDays: w.daysSince,
          actionHref: '/admin/analytics#team-log',
        },
      );
    } else if (w.severity === 'amber') {
      pushAlert('medium', 'team-log', 'Team log missed', w.displayName, {
        actor: w.displayName,
        ageDays: w.daysSince,
        actionHref: '/admin/analytics#team-log',
      });
    }
  }

  // --- Profile: required-field gaps ---
  for (const row of profile.rows) {
    if (row.isSuspended) continue;
    if (row.missingRequiredCount > 0) {
      pushAlert(
        'medium',
        'profile',
        `Profile missing ${row.missingRequiredCount} required field${row.missingRequiredCount === 1 ? '' : 's'}`,
        `${row.percent}% complete · ${row.companyName || row.email}`,
        {
          actor: row.displayName,
          ageDays: null,
          actionHref: '/admin/analytics#profile',
        },
      );
    }
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  alerts.forEach((a) => {
    counts[a.level] = (counts[a.level] || 0) + 1;
  });

  // Level severity first, then oldest-age first inside a level, then
  // category alphabetical for stability.
  alerts.sort((a, b) => {
    const lvlDiff = ALERT_LEVEL_META[a.level].order - ALERT_LEVEL_META[b.level].order;
    if (lvlDiff !== 0) return lvlDiff;
    const ageDiff = (b.ageDays ?? 0) - (a.ageDays ?? 0);
    if (ageDiff !== 0) return ageDiff;
    return a.category.localeCompare(b.category);
  });

  return {
    snapshotAt: new Date(),
    counts,
    alerts,
  };
}

// --- Profile completeness (Bölüm 10) ---------------------------------------

/**
 * Field-weight registry that drives the profile-completeness score.
 * Total must sum to 100 so the UI's percent is a real percent.
 *
 * A field counts as "filled" when the accessor returns a truthy,
 * non-empty value. Truthy is per-field-defined below so
 * companyDocuments (array) and verified (bool) don't false-positive
 * on `!undefined === true`.
 *
 * The `required` flag is surfaced as "kritik eksik" in the UI — the
 * three fields the registration form actually mandates. Everything
 * else is optional but scored.
 */
export const PROFILE_FIELDS = [
  {
    key: 'companyName',
    label: 'Firma adı',
    weight: 5,
    required: true,
    accessor: (d) => (d.companyName || '').trim() !== '',
  },
  {
    key: 'phone',
    label: 'Telefon',
    weight: 5,
    required: true,
    accessor: (d) => (d.phone || '').trim() !== '',
  },
  {
    key: 'companyCategory',
    label: 'Sektör',
    weight: 8,
    required: true,
    accessor: (d) => (d.companyCategory || '').trim() !== '',
  },
  {
    key: 'name',
    label: 'Ad soyad',
    weight: 4,
    accessor: (d) =>
      (d.firstName || '').trim() !== '' && (d.lastName || '').trim() !== '',
  },
  {
    key: 'companyLogo',
    label: 'Logo',
    weight: 12,
    accessor: (d) => (d.companyLogo || '').trim() !== '',
  },
  {
    key: 'about',
    label: 'Firma açıklaması',
    weight: 15,
    accessor: (d) => (d.about || '').trim().length >= 40,
  },
  {
    key: 'companyWebsite',
    label: 'Web sitesi',
    weight: 8,
    accessor: (d) => (d.companyWebsite || '').trim() !== '',
  },
  {
    key: 'linkedinProfile',
    label: 'LinkedIn',
    weight: 5,
    accessor: (d) => (d.linkedinProfile || '').trim() !== '',
  },
  {
    key: 'country',
    label: 'Ülke',
    weight: 5,
    accessor: (d) => (d.country || '').trim() !== '',
  },
  {
    key: 'position',
    label: 'Pozisyon',
    weight: 5,
    accessor: (d) => (d.position || '').trim() !== '',
  },
  {
    key: 'companyDocuments',
    label: 'KYC / firma belgeleri',
    weight: 18,
    accessor: (d) => Array.isArray(d.companyDocuments) && d.companyDocuments.length > 0,
  },
  {
    key: 'verified',
    label: 'Verified (email + admin onayı)',
    weight: 10,
    accessor: (d) => !!d.emailVerified && !!d.adminApproved,
  },
];

// Guard: weights must sum to 100 or the UI's percent lies.
if (
  PROFILE_FIELDS.reduce((s, f) => s + f.weight, 0) !== 100 &&
  process.env.NODE_ENV !== 'production'
) {
  // eslint-disable-next-line no-console
  console.warn(
    '[analytics:profile] PROFILE_FIELDS weights do not sum to 100',
    PROFILE_FIELDS.reduce((s, f) => s + f.weight, 0),
  );
}

export function profileSegment(percent) {
  if (percent >= 80) return 'strong';
  if (percent >= 40) return 'medium';
  return 'weak';
}

/**
 * Scan every user document and derive a completeness score plus the
 * missing-field list per row. Also emits sector-level averages so the
 * admin sees which segments trail the pack.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   averagePercent: number,
 *   counts: { weak: number, medium: number, strong: number },
 *   rows: Array<{
 *     uid: string,
 *     displayName: string,
 *     email: string,
 *     companyName: string,
 *     country: string,
 *     companyCategory: string,
 *     percent: number,
 *     segment: 'weak' | 'medium' | 'strong',
 *     missingFields: Array<{ key: string, label: string, weight: number, required: boolean }>,
 *     missingRequiredCount: number,
 *     score: number,             // raw weighted sum
 *     isSuspended: boolean,
 *   }>,
 *   sectorAverages: Array<{ sector: string, average: number, count: number }>,
 * }>}
 */
export async function getProfileCompleteness() {
  // Fetch users AND categories in parallel. user.companyCategory stores
  // the category document ID — not the display name — so without this
  // lookup the sector column renders raw Firestore IDs.
  const [usersSnap, categoriesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.CATEGORIES)),
  ]);

  const categoryIdToName = new Map();
  categoriesSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.name) categoryIdToName.set(doc.id, data.name);
  });

  // Some legacy users may have the raw name saved instead of the id
  // (or a value that matches nothing). Resolve gracefully: try the
  // id-map, fall back to the raw value, then to 'Unknown'.
  const resolveSector = (raw) => {
    const value = (raw || '').trim();
    if (!value) return 'Unknown';
    return categoryIdToName.get(value) || value;
  };

  let sumPercent = 0;
  const counts = { weak: 0, medium: 0, strong: 0 };
  const sectorAgg = new Map(); // sector -> { total: number, count: number }

  const rows = usersSnap.docs.map((doc) => {
    const data = doc.data() || {};
    let score = 0;
    const missingFields = [];

    for (const field of PROFILE_FIELDS) {
      if (field.accessor(data)) {
        score += field.weight;
      } else {
        missingFields.push({
          key: field.key,
          label: field.label,
          weight: field.weight,
          required: !!field.required,
        });
      }
    }

    const percent = Math.round(score); // weights sum to 100 so score IS percent
    const segment = profileSegment(percent);
    counts[segment] += 1;
    sumPercent += percent;

    const sector = resolveSector(data.companyCategory);
    if (!sectorAgg.has(sector)) sectorAgg.set(sector, { total: 0, count: 0 });
    const agg = sectorAgg.get(sector);
    agg.total += percent;
    agg.count += 1;

    return {
      uid: doc.id,
      displayName: data.fullName || data.displayName || '(no name)',
      email: data.email || '',
      companyName: data.companyName || '',
      country: data.country || '',
      companyCategory: sector,
      percent,
      segment,
      missingFields,
      missingRequiredCount: missingFields.filter((f) => f.required).length,
      score,
      isSuspended: !!data.isSuspended,
    };
  });

  const sectorAverages = Array.from(sectorAgg.entries())
    .map(([sector, agg]) => ({
      sector,
      average: agg.count > 0 ? Math.round(agg.total / agg.count) : 0,
      count: agg.count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    snapshotAt: new Date(),
    total: rows.length,
    averagePercent: rows.length > 0 ? Math.round(sumPercent / rows.length) : 0,
    counts,
    rows,
    sectorAverages,
  };
}

// --- Trade Flow Map (Bölüm 19) ---------------------------------------------

/**
 * Deal-status → funnel-stage mapping. The platform's DEAL_STATUS
 * (negotiating / accepted / contract_approved / providers_selected /
 * delivered / rejected / expired / withdrawn) collapses into five
 * forward-flow stages plus one "dropped" bucket so the funnel reads
 * as a real progression rather than a status dump.
 */
const DEAL_STAGE_MAP = {
  negotiating: 'negotiation',
  accepted: 'accepted',
  contract_approved: 'accepted',
  providers_selected: 'in_shipment',
  delivered: 'delivered',
  rejected: 'dropped',
  expired: 'dropped',
  withdrawn: 'dropped',
};

export const TRADE_FLOW_STAGES = [
  { id: 'rfq_active', label: 'Active RFQ', source: 'request' },
  { id: 'negotiation', label: 'Negotiating', source: 'deal' },
  { id: 'accepted', label: 'Accepted / Contract', source: 'deal' },
  { id: 'in_shipment', label: 'In Shipment', source: 'deal' },
  { id: 'delivered', label: 'Delivered', source: 'deal' },
];

/**
 * Everything the Trade Flow panel needs, in one shot:
 *   - Funnel counts across the 5 forward stages
 *   - Terminal state counts (rejected / expired / withdrawn) so the
 *     drop rate is visible
 *   - This-month delivered count and delivered-this-month value
 *     placeholder (deal snapshots don't carry stable pricing so we
 *     only surface count until that lands)
 *   - Active deal roster (one row per non-terminal deal) with
 *     seller / buyer names + countries resolved
 *   - Country trade routes (seller → buyer country) with counts
 *   - Stalled-deal list — negotiations older than 5 days, in-shipment
 *     older than 30 days, active RFQs older than 7 days
 *   - Time-in-stage averages when a deal has enough statusHistory
 *     to derive one; skipped gracefully when it doesn't
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   funnel: Record<string, number>,
 *   deliveredThisMonth: number,
 *   dropped: { rejected: number, expired: number, withdrawn: number, total: number },
 *   totals: { deals: number, requests: number },
 *   conversion: { rfqToDeal: number|null, negoToAccepted: number|null, overallDeliver: number|null },
 *   averages: { negotiationDays: number|null, shipmentDays: number|null },
 *   activeDeals: Array<{ ... }>,
 *   routes: Array<{ sellerCountry: string, buyerCountry: string, count: number }>,
 *   stalled: Array<{ id, type, label, ageDays, actor }>,
 * }>}
 */
export async function getTradeFlowMetrics() {
  const [dealsSnap, requestsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.DEALS)),
    getDocs(collection(db, COLLECTIONS.REQUESTS)),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  // uid → { companyName, country } lookup for the seller/buyer joins.
  const userLookup = new Map();
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    userLookup.set(doc.id, {
      companyName: data.companyName || data.displayName || data.email || doc.id,
      country: (data.country || '').trim() || 'Unknown',
    });
  });

  const now = Date.now();
  const monthStart = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  })();

  const funnel = {
    rfq_active: 0,
    negotiation: 0,
    accepted: 0,
    in_shipment: 0,
    delivered: 0,
  };
  const dropped = { rejected: 0, expired: 0, withdrawn: 0, total: 0 };
  const routeCounts = new Map(); // "seller|buyer" -> count
  const activeDeals = [];
  const stalled = [];
  let deliveredThisMonth = 0;

  // Track duration samples for the two long-running stages.
  const negotiationDurations = [];
  const shipmentDurations = [];

  // --- deals ---
  dealsSnap.forEach((doc) => {
    const data = doc.data() || {};
    const status = data.status || 'negotiating';
    const stage = DEAL_STAGE_MAP[status] || 'dropped';
    const createdAt = toDate(data.createdAt);
    const updatedAt = toDate(data.updatedAt);
    const ageDays = createdAt
      ? Math.floor((now - createdAt.getTime()) / MS_PER_DAY)
      : null;

    if (stage === 'dropped') {
      dropped[status] = (dropped[status] || 0) + 1;
      dropped.total += 1;
      return;
    }

    funnel[stage] += 1;

    const seller = userLookup.get(data.sellerId);
    const buyer = userLookup.get(data.buyerId);
    const sellerCountry = seller?.country || 'Unknown';
    const buyerCountry = buyer?.country || 'Unknown';

    // Delivered this month uses updatedAt as the delivery moment
    // (there isn't a dedicated deliveredAt field). Good-enough
    // approximation while the funnel is still small.
    if (stage === 'delivered' && updatedAt && updatedAt.getTime() >= monthStart) {
      deliveredThisMonth += 1;
    }

    // Duration samples — only when we can pin both endpoints.
    if (stage === 'accepted' && createdAt && updatedAt) {
      negotiationDurations.push((updatedAt.getTime() - createdAt.getTime()) / MS_PER_DAY);
    }
    if (stage === 'delivered' && createdAt && updatedAt) {
      shipmentDurations.push((updatedAt.getTime() - createdAt.getTime()) / MS_PER_DAY);
    }

    if (stage !== 'delivered') {
      // Active roster — anything short of delivered still needs eyes on it.
      activeDeals.push({
        id: doc.id,
        stage,
        stageLabel: TRADE_FLOW_STAGES.find((s) => s.id === stage)?.label || stage,
        status,
        productName: data.productName || '(no product)',
        seller: seller?.companyName || 'Unknown',
        sellerCountry,
        buyer: buyer?.companyName || 'Unknown',
        buyerCountry,
        createdAt,
        updatedAt,
        ageDays,
      });

      // Stall thresholds per the plan: negotiating >5d, in_shipment >30d.
      if (stage === 'negotiation' && ageDays !== null && ageDays > 5) {
        stalled.push({
          id: doc.id,
          type: 'deal',
          label: `Negotiating for ${ageDays} days`,
          ageDays,
          actor: `${seller?.companyName || 'Seller'} ↔ ${buyer?.companyName || 'Buyer'}`,
        });
      }
      if (stage === 'in_shipment' && ageDays !== null && ageDays > 30) {
        stalled.push({
          id: doc.id,
          type: 'deal',
          label: `In shipment for ${ageDays} days`,
          ageDays,
          actor: `${seller?.companyName || 'Seller'} ↔ ${buyer?.companyName || 'Buyer'}`,
        });
      }
    }

    // Trade route tally (only successful flow contributes so a
    // rejected deal doesn't get counted as a real route).
    const routeKey = `${sellerCountry}|${buyerCountry}`;
    routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + 1);
  });

  // --- requests (RFQs) ---
  requestsSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.status !== 'active') return;
    funnel.rfq_active += 1;

    const createdAt = toDate(data.createdAt);
    const ageDays = createdAt
      ? Math.floor((now - createdAt.getTime()) / MS_PER_DAY)
      : null;
    if (ageDays !== null && ageDays > 7 && (data.quoteCount || 0) === 0) {
      const buyer = userLookup.get(data.userId);
      stalled.push({
        id: doc.id,
        type: 'rfq',
        label: `RFQ open for ${ageDays} days, no quotes`,
        ageDays,
        actor: buyer?.companyName || 'Unknown buyer',
      });
    }
  });

  // Sorted route list, top routes first.
  const routes = Array.from(routeCounts.entries())
    .map(([key, count]) => {
      const [sellerCountry, buyerCountry] = key.split('|');
      return { sellerCountry, buyerCountry, count };
    })
    .sort((a, b) => b.count - a.count);

  activeDeals.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));
  stalled.sort((a, b) => b.ageDays - a.ageDays);

  const avg = (arr) =>
    arr.length > 0 ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null;

  // Conversion signals. Ratios are best-effort at current scale — the
  // panel makes the small-N caveat explicit in the UI.
  const totalDeals = dealsSnap.size;
  const totalRequests = requestsSnap.size;
  const negoIn = funnel.negotiation + funnel.accepted + funnel.in_shipment + funnel.delivered + dropped.total;
  const conversion = {
    rfqToDeal: totalRequests > 0 ? (totalDeals / totalRequests) * 100 : null,
    negoToAccepted:
      negoIn > 0
        ? ((funnel.accepted + funnel.in_shipment + funnel.delivered) / negoIn) * 100
        : null,
    overallDeliver: totalDeals > 0 ? (funnel.delivered / totalDeals) * 100 : null,
  };

  return {
    snapshotAt: new Date(),
    funnel,
    deliveredThisMonth,
    dropped,
    totals: { deals: totalDeals, requests: totalRequests },
    conversion,
    averages: {
      negotiationDays: avg(negotiationDurations),
      shipmentDays: avg(shipmentDurations),
    },
    activeDeals,
    routes,
    stalled,
  };
}

// --- Ads: campaign performance ---------------------------------------------

/**
 * Full ads snapshot for the performance panel. One collection read of
 * `ads`, all aggregates derived in memory. `impressions` and `clicks`
 * counters live directly on the ad doc and are already bumped by the
 * public site's tracking pixel, so no join is needed.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   activeCount: number,
 *   scheduledCount: number,
 *   pausedCount: number,
 *   expiredCount: number,
 *   totalImpressions: number,
 *   totalClicks: number,
 *   avgCtr: number,                 // 0-100 (%)
 *   byType: Array<{
 *     type: string,
 *     active: number,
 *     total: number,
 *     impressions: number,
 *     clicks: number,
 *     ctr: number,
 *   }>,
 *   byCompany: Array<{
 *     companyName: string,
 *     campaigns: number,
 *     impressions: number,
 *     clicks: number,
 *   }>,
 *   activeCampaigns: Array<{
 *     id: string,
 *     type: string,
 *     status: string,
 *     companyName: string,
 *     impressions: number,
 *     clicks: number,
 *     ctr: number,
 *     startDate: Date | null,
 *     endDate: Date | null,
 *     daysRemaining: number | null,
 *   }>,
 *   endingSoon: Array<{ id, companyName, type, endDate, daysRemaining }>,
 *   stalePastEnd: Array<{ id, companyName, type, endDate, daysOverdue, status }>,
 * }>}
 */
export async function getAdsPerformance() {
  const snap = await getDocs(collection(db, 'ads'));
  const now = Date.now();

  const rows = snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      type: data.type || 'unknown',
      status: data.status || 'unknown',
      companyName: data.companyName || '(no name)',
      impressions: Number(data.impressions) || 0,
      clicks: Number(data.clicks) || 0,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
    };
  });

  const daysBetween = (fromMs, toDateObj) =>
    toDateObj instanceof Date
      ? Math.floor((toDateObj.getTime() - fromMs) / MS_PER_DAY)
      : null;

  // Per-type aggregates
  const typeMap = new Map();
  const companyMap = new Map();
  let totalImpressions = 0;
  let totalClicks = 0;
  let activeCount = 0;
  let scheduledCount = 0;
  let pausedCount = 0;
  let expiredCount = 0;

  for (const row of rows) {
    if (row.status === 'active') activeCount += 1;
    else if (row.status === 'scheduled') scheduledCount += 1;
    else if (row.status === 'paused') pausedCount += 1;
    else if (row.status === 'expired') expiredCount += 1;

    totalImpressions += row.impressions;
    totalClicks += row.clicks;

    if (!typeMap.has(row.type)) {
      typeMap.set(row.type, {
        type: row.type,
        active: 0,
        total: 0,
        impressions: 0,
        clicks: 0,
      });
    }
    const tt = typeMap.get(row.type);
    tt.total += 1;
    if (row.status === 'active') tt.active += 1;
    tt.impressions += row.impressions;
    tt.clicks += row.clicks;

    if (!companyMap.has(row.companyName)) {
      companyMap.set(row.companyName, {
        companyName: row.companyName,
        campaigns: 0,
        impressions: 0,
        clicks: 0,
      });
    }
    const cc = companyMap.get(row.companyName);
    cc.campaigns += 1;
    cc.impressions += row.impressions;
    cc.clicks += row.clicks;
  }

  const byType = Array.from(typeMap.values())
    .map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const byCompany = Array.from(companyMap.values())
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 12);

  // Only active campaigns get a spot in the "running now" table —
  // scheduled/paused/expired live in their own summary counts above.
  const activeCampaigns = rows
    .filter((r) => r.status === 'active')
    .map((r) => ({
      ...r,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      daysRemaining: daysBetween(now, r.endDate),
    }))
    .sort((a, b) => b.impressions - a.impressions);

  // Ending in ≤3 days — surface for admin heads-up.
  const endingSoon = rows
    .filter(
      (r) =>
        r.status === 'active' &&
        r.endDate instanceof Date &&
        r.endDate.getTime() >= now &&
        r.endDate.getTime() <= now + 3 * MS_PER_DAY,
    )
    .map((r) => ({
      id: r.id,
      companyName: r.companyName,
      type: r.type,
      endDate: r.endDate,
      daysRemaining: Math.max(0, daysBetween(now, r.endDate)),
    }))
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  // Anomaly bucket: ads whose end date is in the past but the status
  // still says "active" (a cron didn't run, someone forgot to expire).
  const stalePastEnd = rows
    .filter(
      (r) =>
        r.status === 'active' &&
        r.endDate instanceof Date &&
        r.endDate.getTime() < now,
    )
    .map((r) => ({
      id: r.id,
      companyName: r.companyName,
      type: r.type,
      endDate: r.endDate,
      daysOverdue: Math.floor((now - r.endDate.getTime()) / MS_PER_DAY),
      status: r.status,
    }));

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return {
    snapshotAt: new Date(),
    total: rows.length,
    activeCount,
    scheduledCount,
    pausedCount,
    expiredCount,
    totalImpressions,
    totalClicks,
    avgCtr,
    byType,
    byCompany,
    activeCampaigns,
    endingSoon,
    stalePastEnd,
  };
}

// --- Onboarding funnel (Bölüm 12) -----------------------------------------

/**
 * The five onboarding steps we track. Each step derives from data
 * that's already on the user doc or countable across other
 * collections — no dedicated user_events table yet, so we compute
 * live from steady-state observations. When the event pipeline
 * lands (Bölüm 23 Faz 1) the same shape can be filled from event
 * timestamps for precise time-to-step.
 */
export const ONBOARDING_STEPS = [
  {
    id: 'email_verified',
    label: 'Email verified',
    expectedWithinDays: 1,
  },
  {
    id: 'profile_half',
    label: 'Profile ≥50%',
    expectedWithinDays: 3,
  },
  {
    id: 'first_content',
    label: 'First product or RFQ',
    expectedWithinDays: 5,
  },
  {
    id: 'first_message',
    label: 'First message',
    expectedWithinDays: 7,
  },
  {
    id: 'second_signin',
    label: 'Second sign-in',
    expectedWithinDays: 7,
  },
];

/**
 * Onboarding funnel snapshot. All cohorts, per-step completion
 * percentages, and the current-cohort dropout list live here in
 * one shot.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   cohorts: {
 *     current: { key: string, size: number, steps: Array<{ id, label, completed, percent }> },
 *     previous: { key: string, size: number, steps: Array<{ id, label, completed, percent }> },
 *     allTime: { key: string, size: number, steps: Array<{ id, label, completed, percent }> },
 *   },
 *   retention30d: { onboardedCount: number, retainedCount: number, percent: number|null },
 *   dropoffByStep: Record<string, Array<{ uid, displayName, email, companyName, country, daysSinceRegister }>>,
 * }>}
 */
export async function getOnboardingFunnel() {
  const now = Date.now();

  const [usersSnap, productsSnap, requestsSnap, conversationsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.REQUESTS)),
    getDocs(collection(db, COLLECTIONS.CONVERSATIONS)),
  ]);

  // uid → earliest createdAt across products (for time-to-first-product).
  const firstProductAt = new Map();
  productsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.userId;
    const created = toDate(d.createdAt);
    if (!uid || !created) return;
    const prev = firstProductAt.get(uid);
    if (!prev || created < prev) firstProductAt.set(uid, created);
  });

  // uid → earliest RFQ createdAt.
  const firstRequestAt = new Map();
  requestsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.userId;
    const created = toDate(d.createdAt);
    if (!uid || !created) return;
    const prev = firstRequestAt.get(uid);
    if (!prev || created < prev) firstRequestAt.set(uid, created);
  });

  // uid → earliest conversation-participation createdAt.
  const firstMessageAt = new Map();
  conversationsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const created = toDate(d.createdAt);
    const parts = Array.isArray(d.participants) ? d.participants : [];
    if (!created) return;
    for (const uid of parts) {
      const prev = firstMessageAt.get(uid);
      if (!prev || created < prev) firstMessageAt.set(uid, created);
    }
  });

  // --- profile-completeness weights (mirror of PROFILE_FIELDS but
  // inline so this query doesn't depend on a separate one) ---
  const PROFILE_WEIGHTS = [
    { key: 'companyName', weight: 5, ok: (d) => (d.companyName || '').trim() !== '' },
    { key: 'phone', weight: 5, ok: (d) => (d.phone || '').trim() !== '' },
    { key: 'companyCategory', weight: 8, ok: (d) => (d.companyCategory || '').trim() !== '' },
    { key: 'name', weight: 4, ok: (d) => (d.firstName || '').trim() !== '' && (d.lastName || '').trim() !== '' },
    { key: 'companyLogo', weight: 12, ok: (d) => (d.companyLogo || '').trim() !== '' },
    { key: 'about', weight: 15, ok: (d) => (d.about || '').trim().length >= 40 },
    { key: 'companyWebsite', weight: 8, ok: (d) => (d.companyWebsite || '').trim() !== '' },
    { key: 'linkedinProfile', weight: 5, ok: (d) => (d.linkedinProfile || '').trim() !== '' },
    { key: 'country', weight: 5, ok: (d) => (d.country || '').trim() !== '' },
    { key: 'position', weight: 5, ok: (d) => (d.position || '').trim() !== '' },
    { key: 'companyDocuments', weight: 18, ok: (d) => Array.isArray(d.companyDocuments) && d.companyDocuments.length > 0 },
    { key: 'verified', weight: 10, ok: (d) => !!d.emailVerified && !!d.adminApproved },
  ];

  function profilePercent(data) {
    let sum = 0;
    for (const f of PROFILE_WEIGHTS) if (f.ok(data)) sum += f.weight;
    return sum;
  }

  // Derived per-user rows.
  const rows = [];
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    const createdAt = toDate(data.createdAt);
    const lastLoginAt = toDate(data.lastLoginAt);
    const emailVerified = !!data.emailVerified;
    const profilePct = profilePercent(data);
    const firstProduct = firstProductAt.get(doc.id) || null;
    const firstRequest = firstRequestAt.get(doc.id) || null;
    const firstMessage = firstMessageAt.get(doc.id) || null;
    const firstContent = firstProduct && firstRequest
      ? (firstProduct < firstRequest ? firstProduct : firstRequest)
      : (firstProduct || firstRequest);

    // Second sign-in: lastLoginAt strictly after (createdAt + 1 hour).
    // Anything within an hour of registration is still the initial
    // session; we want confirmation the member actively returned.
    const secondSignin =
      createdAt &&
      lastLoginAt &&
      lastLoginAt.getTime() > createdAt.getTime() + 60 * 60 * 1000;

    rows.push({
      uid: doc.id,
      displayName: data.fullName || data.displayName || '(no name)',
      email: data.email || '',
      companyName: data.companyName || '',
      country: data.country || '',
      createdAt,
      isSuspended: !!data.isSuspended,
      steps: {
        email_verified: emailVerified,
        profile_half: profilePct >= 50,
        first_content: !!firstContent,
        first_message: !!firstMessage,
        second_signin: !!secondSignin,
      },
      daysSinceRegister: createdAt
        ? Math.floor((now - createdAt.getTime()) / MS_PER_DAY)
        : null,
    });
  });

  const buildStepStats = (cohortRows) => {
    const stats = ONBOARDING_STEPS.map((step) => {
      const completed = cohortRows.reduce(
        (n, r) => n + (r.steps[step.id] ? 1 : 0),
        0,
      );
      const percent = cohortRows.length > 0
        ? Math.round((completed / cohortRows.length) * 100)
        : 0;
      return { id: step.id, label: step.label, completed, percent };
    });
    return stats;
  };

  const activeRows = rows.filter((r) => !r.isSuspended && r.createdAt);

  const currentCutoff = now - 30 * MS_PER_DAY;
  const previousCutoff = now - 60 * MS_PER_DAY;

  const currentCohort = activeRows.filter((r) => r.createdAt.getTime() >= currentCutoff);
  const previousCohort = activeRows.filter(
    (r) => r.createdAt.getTime() >= previousCutoff && r.createdAt.getTime() < currentCutoff,
  );

  const cohorts = {
    current: {
      key: 'Registered in last 30 days',
      size: currentCohort.length,
      steps: buildStepStats(currentCohort),
    },
    previous: {
      key: 'Registered 31-60 days ago',
      size: previousCohort.length,
      steps: buildStepStats(previousCohort),
    },
    allTime: {
      key: 'All members',
      size: activeRows.length,
      steps: buildStepStats(activeRows),
    },
  };

  // Retention proxy: of members who completed 4+ onboarding steps,
  // what % signed in within the last 30 days? A weak signal until
  // we have proper session events, but honest at current scale.
  const onboarded = activeRows.filter((r) => {
    let done = 0;
    for (const step of ONBOARDING_STEPS) if (r.steps[step.id]) done += 1;
    return done >= 4;
  });
  const retained = onboarded.filter((r) => {
    // Any recent login flag would live under lastLoginAt bump but the
    // row we built above doesn't carry it. Rebuild the boolean off
    // second_signin as a shorthand; a proper retention loop lands
    // when the event log arrives.
    return r.steps.second_signin;
  });
  const retention30d = {
    onboardedCount: onboarded.length,
    retainedCount: retained.length,
    percent: onboarded.length > 0
      ? Math.round((retained.length / onboarded.length) * 100)
      : null,
  };

  // Dropout roster — per step, who from the current cohort has NOT
  // yet completed it? Sorted by days-since-register desc so the
  // longest-lingering incompletes bubble up.
  const dropoffByStep = {};
  for (const step of ONBOARDING_STEPS) {
    dropoffByStep[step.id] = currentCohort
      .filter((r) => !r.steps[step.id])
      .map((r) => ({
        uid: r.uid,
        displayName: r.displayName,
        email: r.email,
        companyName: r.companyName,
        country: r.country,
        daysSinceRegister: r.daysSinceRegister,
      }))
      .sort((a, b) => (b.daysSinceRegister ?? 0) - (a.daysSinceRegister ?? 0));
  }

  return {
    snapshotAt: new Date(),
    total: activeRows.length,
    cohorts,
    retention30d,
    dropoffByStep,
  };
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
