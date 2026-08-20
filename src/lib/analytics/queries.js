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
  collectionGroup,
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

// --- Onboarding Path Comparison (Bölüm 22.10) -----------------------------

/**
 * Splits the onboarding-completion picture into paths so the operator
 * can see whether one member type is systematically harder to activate
 * than another. Buyers, sellers, and providers do not have the same
 * happy path — the Bölüm 12 funnel treats them uniformly, which hides
 * exactly the story this section makes visible.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   byRole: Array<{ id, label, size, steps: Array<{id,label,completed,percent}>, avgSteps: number|null }>,
 *   byAuthProvider: Array<{ id, label, size, avgSteps: number|null, activatedRatio: number }>,
 *   byCountry: Array<{ country: string, size: number, avgSteps: number|null, activatedRatio: number }>,
 * }>}
 */
export async function getOnboardingPathComparison() {
  const [usersSnap, productsSnap, requestsSnap, conversationsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.REQUESTS)),
    getDocs(collection(db, COLLECTIONS.CONVERSATIONS)),
  ]);

  const productsByUser = new Map();
  productsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) productsByUser.set(uid, (productsByUser.get(uid) || 0) + 1);
  });
  const rfqsByUser = new Map();
  requestsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) rfqsByUser.set(uid, (rfqsByUser.get(uid) || 0) + 1);
  });
  const messagingUids = new Set();
  conversationsSnap.forEach((doc) => {
    const parts = Array.isArray(doc.data()?.participants) ? doc.data().participants : [];
    for (const uid of parts) messagingUids.add(uid);
  });

  // Compact profile-weight table — enough to compute the ≥50% threshold.
  const PROFILE_WEIGHTS = [
    { weight: 5, ok: (d) => (d.companyName || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.phone || '').trim() !== '' },
    { weight: 8, ok: (d) => (d.companyCategory || '').trim() !== '' },
    { weight: 4, ok: (d) => (d.firstName || '').trim() !== '' && (d.lastName || '').trim() !== '' },
    { weight: 12, ok: (d) => (d.companyLogo || '').trim() !== '' },
    { weight: 15, ok: (d) => (d.about || '').trim().length >= 40 },
    { weight: 8, ok: (d) => (d.companyWebsite || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.linkedinProfile || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.country || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.position || '').trim() !== '' },
    { weight: 18, ok: (d) => Array.isArray(d.companyDocuments) && d.companyDocuments.length > 0 },
    { weight: 10, ok: (d) => !!d.emailVerified && !!d.adminApproved },
  ];

  const rows = usersSnap.docs
    .map((doc) => {
      const data = doc.data() || {};
      if (data.isSuspended) return null;
      const uid = doc.id;
      const role = data.role || 'member';
      const authProvider = (data.authProvider || 'password').toLowerCase();
      const country = (data.country || '').trim() || 'Unknown';

      const productCount = productsByUser.get(uid) || 0;
      const rfqCount = rfqsByUser.get(uid) || 0;
      const hasMessages = messagingUids.has(uid);
      const emailVerified = !!data.emailVerified;
      const createdAt = toDate(data.createdAt);
      const lastLoginAt = toDate(data.lastLoginAt);
      const secondSignin =
        createdAt &&
        lastLoginAt &&
        lastLoginAt.getTime() > createdAt.getTime() + 60 * 60 * 1000;

      const profilePct =
        PROFILE_WEIGHTS.reduce((s, f) => s + (f.ok(data) ? f.weight : 0), 0);

      const steps = {
        email_verified: emailVerified,
        profile_half: profilePct >= 50,
        first_content: productCount > 0 || rfqCount > 0,
        first_message: hasMessages,
        second_signin: !!secondSignin,
      };
      const stepsDone = Object.values(steps).filter(Boolean).length;

      return {
        uid,
        role,
        authProvider,
        country,
        steps,
        stepsDone,
      };
    })
    .filter(Boolean);

  const STEP_DEFS = ONBOARDING_STEPS;

  const groupBy = (keyFn) => {
    const map = new Map();
    for (const r of rows) {
      const key = keyFn(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return map;
  };

  const stepStats = (group) =>
    STEP_DEFS.map((step) => {
      const done = group.reduce((n, r) => n + (r.steps[step.id] ? 1 : 0), 0);
      const percent = group.length > 0 ? Math.round((done / group.length) * 100) : 0;
      return { id: step.id, label: step.label, completed: done, percent };
    });

  const avgStepsDone = (group) => {
    if (group.length === 0) return null;
    const total = group.reduce((s, r) => s + r.stepsDone, 0);
    return Math.round((total / group.length) * 10) / 10;
  };

  const activatedRatio = (group) => {
    if (group.length === 0) return 0;
    const activated = group.filter((r) => r.stepsDone >= 4).length;
    return Math.round((activated / group.length) * 100);
  };

  // Role labels — map internal role → friendly path label.
  const ROLE_LABEL = {
    member: 'Trade / Buyer + Seller',
    logistics_provider: 'Logistics Provider',
    insurance_provider: 'Insurance Provider',
    admin: 'Admin',
    lawyer: 'Lawyer',
  };
  const byRole = Array.from(groupBy((r) => r.role).entries())
    .map(([role, group]) => ({
      id: role,
      label: ROLE_LABEL[role] || role,
      size: group.length,
      steps: stepStats(group),
      avgSteps: avgStepsDone(group),
      activatedRatio: activatedRatio(group),
    }))
    .sort((a, b) => b.size - a.size);

  // Auth provider — where did they come from?
  const PROVIDER_LABEL = {
    password: 'Email / Password',
    google: 'Google',
    linkedin: 'LinkedIn',
    'google.com': 'Google',
  };
  const byAuthProvider = Array.from(groupBy((r) => r.authProvider).entries())
    .map(([id, group]) => ({
      id,
      label: PROVIDER_LABEL[id] || id,
      size: group.length,
      avgSteps: avgStepsDone(group),
      activatedRatio: activatedRatio(group),
    }))
    .sort((a, b) => b.size - a.size);

  // Country — top 10 by cohort size, so tiny cohorts don't create noise.
  const byCountry = Array.from(groupBy((r) => r.country).entries())
    .map(([country, group]) => ({
      country,
      size: group.length,
      avgSteps: avgStepsDone(group),
      activatedRatio: activatedRatio(group),
    }))
    .filter((row) => row.size >= 3) // guard against noise from single-user countries
    .sort((a, b) => b.size - a.size)
    .slice(0, 12);

  return {
    snapshotAt: new Date(),
    byRole,
    byAuthProvider,
    byCountry,
  };
}

// --- Marketplace Liquidity (Bölüm 22.5) -----------------------------------

/**
 * Marketplace-liquidity vitals — the composite "is this marketplace
 * actually alive" metric set. Answers three questions the operator
 * asks first:
 *
 *   1. How many businesses touched anything this week? (WAB)
 *   2. When a buyer posts an RFQ, how fast does a quote arrive?
 *   3. When a member registers, how long until they close a deal?
 *
 * Plus the arz-talep (supply/demand) balance and dead-listing
 * ratio for a health-at-a-glance strip.
 */

function medianOf(nums) {
  if (nums.length === 0) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
    : Math.round(sorted[mid] * 10) / 10;
}

/**
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   wab: { current: number, previous: number, deltaPct: number|null, breakdown: Record<string,number> },
 *   timeToFirstQuoteHours: { avg: number|null, median: number|null, sampleSize: number },
 *   timeToFirstTransactionDays: { avg: number|null, median: number|null, sampleSize: number },
 *   supplyDemand: { buyers: number, sellers: number, both: number, ratio: number|null, activeBuyers: number, activeSellers: number },
 *   deadListingsRatio: number,        // 0-100
 *   activeRfqsUnanswered: number,
 *   pulse: { weeklyMessages: number, weeklyRfqs: number, weeklyDeals: number, weeklyProducts: number },
 * }>}
 */
export async function getMarketplaceLiquidity() {
  const now = Date.now();
  const startOfLast7 = now - 7 * MS_PER_DAY;
  const startOfLast14 = now - 14 * MS_PER_DAY;
  const startOfLast30 = now - 30 * MS_PER_DAY;
  const startOfLast90 = now - 90 * MS_PER_DAY;

  const [usersSnap, requestsSnap, productsSnap, dealsSnap, conversationsSnap, messagesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.REQUESTS)),
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.DEALS)),
    getDocs(collection(db, COLLECTIONS.CONVERSATIONS)),
    getDocs(collectionGroup(db, 'messages')),
  ]);

  // Every uid we know about, plus lastLoginAt for activity gating.
  const userLastLogin = new Map();
  usersSnap.forEach((doc) => {
    userLastLogin.set(doc.id, toDate(doc.data()?.lastLoginAt) || null);
  });

  // --- WAB (Weekly Active Businesses) ---
  // A business "touched the platform" if in the last 7d they:
  //   - sent a message
  //   - created an RFQ (request)
  //   - created a deal (as buyer or seller)
  //   - listed a product
  //   - signed in (lastLoginAt)
  // Previous week (day 7-14 ago) computed the same way for the WoW delta.
  const activeCurrent = new Set();
  const activePrevious = new Set();
  const activeBreakdown = { message: new Set(), rfq: new Set(), deal: new Set(), product: new Set(), login: new Set() };
  const inWindow = (t, start, end) => t >= start && t < end;

  // Message activity — collectionGroup includes legalMessages, filter.
  messagesSnap.forEach((doc) => {
    const parent = doc.ref?.parent?.parent;
    if (!parent || parent.parent?.id !== COLLECTIONS.CONVERSATIONS) return;
    const uid = doc.data()?.senderId;
    const createdAt = toDate(doc.data()?.createdAt);
    if (!uid || !createdAt) return;
    const t = createdAt.getTime();
    if (inWindow(t, startOfLast7, now)) {
      activeCurrent.add(uid);
      activeBreakdown.message.add(uid);
    } else if (inWindow(t, startOfLast14, startOfLast7)) {
      activePrevious.add(uid);
    }
  });

  requestsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.userId;
    const createdAt = toDate(d.createdAt);
    if (!uid || !createdAt) return;
    const t = createdAt.getTime();
    if (inWindow(t, startOfLast7, now)) {
      activeCurrent.add(uid);
      activeBreakdown.rfq.add(uid);
    } else if (inWindow(t, startOfLast14, startOfLast7)) {
      activePrevious.add(uid);
    }
  });

  dealsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const createdAt = toDate(d.createdAt);
    if (!createdAt) return;
    const t = createdAt.getTime();
    const uids = [d.buyerId, d.sellerId].filter(Boolean);
    for (const uid of uids) {
      if (inWindow(t, startOfLast7, now)) {
        activeCurrent.add(uid);
        activeBreakdown.deal.add(uid);
      } else if (inWindow(t, startOfLast14, startOfLast7)) {
        activePrevious.add(uid);
      }
    }
  });

  productsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.userId;
    const createdAt = toDate(d.createdAt);
    if (!uid || !createdAt) return;
    const t = createdAt.getTime();
    if (inWindow(t, startOfLast7, now)) {
      activeCurrent.add(uid);
      activeBreakdown.product.add(uid);
    } else if (inWindow(t, startOfLast14, startOfLast7)) {
      activePrevious.add(uid);
    }
  });

  usersSnap.forEach((doc) => {
    const t = toDate(doc.data()?.lastLoginAt)?.getTime();
    if (!t) return;
    if (inWindow(t, startOfLast7, now)) {
      activeCurrent.add(doc.id);
      activeBreakdown.login.add(doc.id);
    } else if (inWindow(t, startOfLast14, startOfLast7)) {
      activePrevious.add(doc.id);
    }
  });

  const wabCurrent = activeCurrent.size;
  const wabPrevious = activePrevious.size;
  const wabDelta = wabPrevious > 0
    ? Math.round(((wabCurrent - wabPrevious) / wabPrevious) * 100)
    : null;

  // --- Time to first quote ---
  const ttfqHours = [];
  requestsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const created = toDate(d.createdAt);
    const firstQuoteAt = toDate(d.lastQuoteAt);
    const count = Number(d.quoteCount) || 0;
    if (!created || !firstQuoteAt || count < 1) return;
    const hours = (firstQuoteAt.getTime() - created.getTime()) / (60 * 60 * 1000);
    if (hours >= 0) ttfqHours.push(hours);
  });
  const ttfqAvg = ttfqHours.length > 0
    ? Math.round((ttfqHours.reduce((s, n) => s + n, 0) / ttfqHours.length) * 10) / 10
    : null;
  const ttfqMedian = medianOf(ttfqHours);

  // Active RFQs still waiting for the first quote.
  let activeRfqsUnanswered = 0;
  requestsSnap.forEach((doc) => {
    const d = doc.data() || {};
    if (d.status !== 'active') return;
    if (Number(d.quoteCount) > 0) return;
    const created = toDate(d.createdAt);
    if (!created) return;
    activeRfqsUnanswered += 1;
  });

  // --- Time to first transaction ---
  // For every user who has at least one deal, days between their
  // registration and their earliest deal (as buyer or seller).
  const firstDealByUid = new Map();
  dealsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const created = toDate(d.createdAt);
    if (!created) return;
    for (const uid of [d.buyerId, d.sellerId].filter(Boolean)) {
      const prev = firstDealByUid.get(uid);
      if (!prev || created < prev) firstDealByUid.set(uid, created);
    }
  });
  const ttftDays = [];
  usersSnap.forEach((doc) => {
    const uid = doc.id;
    const created = toDate(doc.data()?.createdAt);
    const first = firstDealByUid.get(uid);
    if (!created || !first) return;
    const days = (first.getTime() - created.getTime()) / MS_PER_DAY;
    if (days >= 0) ttftDays.push(days);
  });
  const ttftAvg = ttftDays.length > 0
    ? Math.round((ttftDays.reduce((s, n) => s + n, 0) / ttftDays.length) * 10) / 10
    : null;
  const ttftMedian = medianOf(ttftDays);

  // --- Supply / demand balance ---
  // A user counts as a buyer if they've EVER submitted an RFQ or been
  // the buyer on a deal. Similarly for seller (product / deal seller).
  // Both = someone active on both sides. Active = signed in ≤30d.
  const buyerSet = new Set();
  const sellerSet = new Set();
  requestsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) buyerSet.add(uid);
  });
  dealsSnap.forEach((doc) => {
    const d = doc.data() || {};
    if (d.buyerId) buyerSet.add(d.buyerId);
    if (d.sellerId) sellerSet.add(d.sellerId);
  });
  productsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) sellerSet.add(uid);
  });

  const bothSet = new Set([...buyerSet].filter((uid) => sellerSet.has(uid)));
  const activeUids = new Set();
  usersSnap.forEach((doc) => {
    const last = toDate(doc.data()?.lastLoginAt);
    if (last && last.getTime() >= startOfLast30) activeUids.add(doc.id);
  });
  const activeBuyers = [...buyerSet].filter((uid) => activeUids.has(uid)).length;
  const activeSellers = [...sellerSet].filter((uid) => activeUids.has(uid)).length;
  const ratio = activeSellers > 0
    ? Math.round((activeBuyers / activeSellers) * 100) / 100
    : null;

  // --- Dead-listing ratio (already in Catalog Health, but included
  // here so the panel is self-contained for the "marketplace vitals"
  // reader). >90d since last update.
  let dead = 0;
  let productTotal = 0;
  productsSnap.forEach((doc) => {
    productTotal += 1;
    const updated = toDate(doc.data()?.updatedAt) || toDate(doc.data()?.createdAt);
    if (!updated) return;
    if (updated.getTime() < startOfLast90) dead += 1;
  });
  const deadListingsRatio = productTotal > 0 ? Math.round((dead / productTotal) * 100) : 0;

  // --- Weekly pulse counters ---
  let weeklyMessages = 0;
  messagesSnap.forEach((doc) => {
    const parent = doc.ref?.parent?.parent;
    if (!parent || parent.parent?.id !== COLLECTIONS.CONVERSATIONS) return;
    const t = toDate(doc.data()?.createdAt)?.getTime();
    if (t && t >= startOfLast7) weeklyMessages += 1;
  });
  let weeklyRfqs = 0;
  requestsSnap.forEach((doc) => {
    const t = toDate(doc.data()?.createdAt)?.getTime();
    if (t && t >= startOfLast7) weeklyRfqs += 1;
  });
  let weeklyDeals = 0;
  dealsSnap.forEach((doc) => {
    const t = toDate(doc.data()?.createdAt)?.getTime();
    if (t && t >= startOfLast7) weeklyDeals += 1;
  });
  let weeklyProducts = 0;
  productsSnap.forEach((doc) => {
    const t = toDate(doc.data()?.createdAt)?.getTime();
    if (t && t >= startOfLast7) weeklyProducts += 1;
  });

  return {
    snapshotAt: new Date(),
    wab: {
      current: wabCurrent,
      previous: wabPrevious,
      deltaPct: wabDelta,
      breakdown: {
        message: activeBreakdown.message.size,
        rfq: activeBreakdown.rfq.size,
        deal: activeBreakdown.deal.size,
        product: activeBreakdown.product.size,
        login: activeBreakdown.login.size,
      },
    },
    timeToFirstQuoteHours: {
      avg: ttfqAvg,
      median: ttfqMedian,
      sampleSize: ttfqHours.length,
    },
    timeToFirstTransactionDays: {
      avg: ttftAvg,
      median: ttftMedian,
      sampleSize: ttftDays.length,
    },
    supplyDemand: {
      buyers: buyerSet.size,
      sellers: sellerSet.size,
      both: bothSet.size,
      ratio,
      activeBuyers,
      activeSellers,
    },
    deadListingsRatio,
    activeRfqsUnanswered,
    pulse: {
      weeklyMessages,
      weeklyRfqs,
      weeklyDeals,
      weeklyProducts,
    },
  };
}

// --- In-platform Messaging Analytics (Bölüm 21) ---------------------------

/**
 * Regex patterns that flag likely off-platform steering — phone
 * numbers, emails, WhatsApp / Telegram / Skype handles, and IBAN
 * strings. Deliberately loose; false positives are recoverable
 * (human review), missed positives are the actual risk.
 *
 * Each pattern carries a category so the panel can group flagged
 * messages by what got detected.
 */
const OFF_PLATFORM_PATTERNS = [
  { key: 'email', label: 'Email address', regex: /[\w.+-]+@[\w-]+\.[\w.-]{2,}/i },
  { key: 'phone', label: 'Phone number', regex: /(?:\+?\d[\s.-]?){8,}\d/ },
  { key: 'whatsapp', label: 'WhatsApp', regex: /\bwhat[\s-]*s\s*app\b|wa\.me|whatsapp/i },
  { key: 'telegram', label: 'Telegram', regex: /\btelegram\b|t\.me\/|@\w+_bot\b/i },
  { key: 'skype', label: 'Skype', regex: /\bskype[\s:.]*[\w-]+/i },
  { key: 'iban', label: 'Bank IBAN', regex: /\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,30}\b/ },
];

/**
 * Messaging analytics — pulls every conversation + its messages
 * subcollection via a collectionGroup query and derives volume,
 * response quality, off-platform flags, and per-seller response
 * ranking.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   totalConversations: number,
 *   activeConversations30d: number,
 *   newConversations7d: number,
 *   totalMessages: number,
 *   messagesLast7d: number,
 *   messagesLast30d: number,
 *   uniqueSenders: number,
 *   emptyMessageRate: number,           // % of messages with <5 chars of content
 *   attachmentRate: number,             // % of messages with an attachment
 *   avgFirstResponseHours: number|null,
 *   unansweredConversations: number,
 *   slowResponders: Array<{ uid, name, avgResponseHours, sampleSize }>,
 *   dailyTrend: Array<{ date: string, count: number }>,
 *   flaggedMessages: Array<{
 *     conversationId: string,
 *     senderId: string,
 *     senderName: string,
 *     categories: string[],
 *     snippet: string,
 *     createdAt: Date|null,
 *   }>,
 *   flagCategoryCounts: Record<string, number>,
 * }>}
 */
export async function getMessagingAnalytics() {
  const now = Date.now();
  const startOfLast7 = now - 7 * MS_PER_DAY;
  const startOfLast30 = now - 30 * MS_PER_DAY;

  const [conversationsSnap, messagesSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.CONVERSATIONS)),
    getDocs(collectionGroup(db, 'messages')),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  const userIdToName = new Map();
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    userIdToName.set(
      doc.id,
      data.fullName || data.displayName || data.companyName || data.email || doc.id,
    );
  });

  // Group messages by conversation and by sender.
  const messagesByConv = new Map(); // convId → sorted-by-createdAt array
  const senderStats = new Map(); // uid → { messages: n, responseSamples: [hours] }
  const uniqueSenders = new Set();
  let messagesLast7d = 0;
  let messagesLast30d = 0;
  let emptyCount = 0;
  let attachmentCount = 0;
  const flaggedMessages = [];
  const flagCategoryCounts = {};
  const dailyCounts = new Map();
  const startOfLast30Day = new Date(now - 29 * MS_PER_DAY);
  startOfLast30Day.setHours(0, 0, 0, 0);

  messagesSnap.forEach((doc) => {
    const parent = doc.ref?.parent?.parent;
    // messages collectionGroup includes legalMessages under other paths;
    // filter to the conversations parent path.
    if (!parent || parent.parent?.id !== COLLECTIONS.CONVERSATIONS) return;
    const convId = parent.id;
    const data = doc.data() || {};
    const createdAt = toDate(data.createdAt);
    if (!createdAt) return;
    const content = (data.content || '').trim();
    const senderId = data.senderId || '';
    const attachments = Array.isArray(data.attachments) ? data.attachments : [];

    if (senderId) uniqueSenders.add(senderId);
    if (content.length < 5) emptyCount += 1;
    if (attachments.length > 0) attachmentCount += 1;

    if (createdAt.getTime() >= startOfLast7) messagesLast7d += 1;
    if (createdAt.getTime() >= startOfLast30) messagesLast30d += 1;

    if (createdAt.getTime() >= startOfLast30Day.getTime()) {
      const y = createdAt.getFullYear();
      const m = String(createdAt.getMonth() + 1).padStart(2, '0');
      const d = String(createdAt.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
    }

    let row = messagesByConv.get(convId);
    if (!row) {
      row = [];
      messagesByConv.set(convId, row);
    }
    row.push({ createdAt, senderId, content, attachments });

    // Off-platform detection.
    const categories = [];
    for (const pat of OFF_PLATFORM_PATTERNS) {
      if (pat.regex.test(content)) {
        categories.push(pat.key);
        flagCategoryCounts[pat.key] = (flagCategoryCounts[pat.key] || 0) + 1;
      }
    }
    if (categories.length > 0) {
      const senderName = userIdToName.get(senderId) || senderId || '(unknown)';
      flaggedMessages.push({
        conversationId: convId,
        senderId,
        senderName,
        categories,
        snippet: content.slice(0, 140),
        createdAt,
      });
    }
  });

  // Sort per-conversation messages by createdAt asc so response-time
  // math is straightforward.
  for (const arr of messagesByConv.values()) {
    arr.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Response quality — for each conversation, look at the first
  // message vs the first reply from a DIFFERENT sender. Duration
  // in hours. Conversations with only one participant sending or
  // fewer than 2 messages count as unanswered.
  let respHoursTotal = 0;
  let respSampleCount = 0;
  let unanswered = 0;
  let activeConversations30d = 0;
  let newConversations7d = 0;

  conversationsSnap.forEach((doc) => {
    const data = doc.data() || {};
    const convId = doc.id;
    const createdAt = toDate(data.createdAt);
    const updatedAt = toDate(data.updatedAt);

    if (updatedAt && updatedAt.getTime() >= startOfLast30) activeConversations30d += 1;
    if (createdAt && createdAt.getTime() >= startOfLast7) newConversations7d += 1;

    const msgs = messagesByConv.get(convId) || [];
    if (msgs.length < 2) {
      if (msgs.length === 1) unanswered += 1;
      return;
    }
    const first = msgs[0];
    const reply = msgs.find((m) => m.senderId && m.senderId !== first.senderId);
    if (!reply) {
      unanswered += 1;
      return;
    }
    const hours = (reply.createdAt.getTime() - first.createdAt.getTime()) / (60 * 60 * 1000);
    respHoursTotal += hours;
    respSampleCount += 1;

    // Attribute to the responder.
    const responderId = reply.senderId;
    let s = senderStats.get(responderId);
    if (!s) {
      s = { messages: 0, responseSamples: [] };
      senderStats.set(responderId, s);
    }
    s.responseSamples.push(hours);
  });

  // Add message counts per sender (all messages, not just first responses).
  messagesSnap.forEach((doc) => {
    const parent = doc.ref?.parent?.parent;
    if (!parent || parent.parent?.id !== COLLECTIONS.CONVERSATIONS) return;
    const senderId = doc.data()?.senderId;
    if (!senderId) return;
    let s = senderStats.get(senderId);
    if (!s) {
      s = { messages: 0, responseSamples: [] };
      senderStats.set(senderId, s);
    }
    s.messages += 1;
  });

  const slowResponders = Array.from(senderStats.entries())
    .filter(([, s]) => s.responseSamples.length >= 1)
    .map(([uid, s]) => {
      const avg = s.responseSamples.reduce((sum, n) => sum + n, 0) / s.responseSamples.length;
      return {
        uid,
        name: userIdToName.get(uid) || uid,
        avgResponseHours: Math.round(avg * 10) / 10,
        sampleSize: s.responseSamples.length,
      };
    })
    .sort((a, b) => b.avgResponseHours - a.avgResponseHours)
    .slice(0, 12);

  const totalMessages = messagesSnap.docs.filter((doc) => {
    const parent = doc.ref?.parent?.parent;
    return parent?.parent?.id === COLLECTIONS.CONVERSATIONS;
  }).length;

  const avgFirstResponseHours = respSampleCount > 0
    ? Math.round((respHoursTotal / respSampleCount) * 10) / 10
    : null;

  const emptyMessageRate = totalMessages > 0
    ? Math.round((emptyCount / totalMessages) * 100)
    : 0;
  const attachmentRate = totalMessages > 0
    ? Math.round((attachmentCount / totalMessages) * 100)
    : 0;

  // 30-day zero-filled trend.
  const dailyTrend = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOfLast30Day.getTime() + i * MS_PER_DAY);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dailyTrend.push({ date: key, count: dailyCounts.get(key) || 0 });
  }

  flaggedMessages.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

  return {
    snapshotAt: new Date(),
    totalConversations: conversationsSnap.size,
    activeConversations30d,
    newConversations7d,
    totalMessages,
    messagesLast7d,
    messagesLast30d,
    uniqueSenders: uniqueSenders.size,
    emptyMessageRate,
    attachmentRate,
    avgFirstResponseHours,
    unansweredConversations: unanswered,
    slowResponders,
    dailyTrend,
    flaggedMessages,
    flagCategoryCounts,
  };
}

// --- Product Catalog Health (Bölüm 20) ------------------------------------

/**
 * Per-product weighted quality score. Weights sum to 100 by
 * construction. Signals that need image processing (pHash duplicate
 * detection, blur / watermark check) or search event logs (relevance
 * scoring) are deliberately absent from this first pass — surfacing
 * the derivable signals is 80% of the value at 20% of the cost.
 */
const PRODUCT_QUALITY_FIELDS = [
  {
    key: 'title',
    label: 'Title length',
    weight: 10,
    ok: (p) => (p.name || '').trim().length >= 20,
  },
  {
    key: 'description',
    label: 'Rich description',
    weight: 20,
    ok: (p) => (p.description || '').trim().length >= 120,
  },
  {
    key: 'images',
    label: 'Multiple images',
    weight: 20,
    ok: (p) => Array.isArray(p.images) && p.images.length >= 2,
  },
  {
    key: 'category',
    label: 'Category assigned',
    weight: 10,
    ok: (p) => !!p.categoryId,
  },
  {
    key: 'price',
    label: 'Price set',
    weight: 10,
    ok: (p) => Number(p.price) > 0,
  },
  {
    key: 'quantity',
    label: 'Quantity set',
    weight: 10,
    ok: (p) => Number(p.quantity) > 0 || Number(p.stockQuantity) > 0,
  },
  {
    key: 'unit',
    label: 'Unit specified',
    weight: 10,
    ok: (p) => (p.unit || '').trim() !== '',
  },
  {
    key: 'currency',
    label: 'Currency set',
    weight: 5,
    ok: (p) => (p.currency || '').trim() !== '',
  },
  {
    key: 'freshness',
    label: 'Updated in 90 days',
    weight: 5,
    ok: (p) => {
      const updated = toDate(p.updatedAt) || toDate(p.createdAt);
      if (!updated) return false;
      return Date.now() - updated.getTime() <= 90 * MS_PER_DAY;
    },
  },
];

if (
  PRODUCT_QUALITY_FIELDS.reduce((s, f) => s + f.weight, 0) !== 100 &&
  process.env.NODE_ENV !== 'production'
) {
  // eslint-disable-next-line no-console
  console.warn('[analytics:catalog] PRODUCT_QUALITY_FIELDS weights do not sum to 100');
}

/**
 * Catalog-health snapshot: per-product quality scoring, temporal
 * signals (stale / dead / fresh), category coverage (empty vs
 * overcrowded), top low-quality products, top prolific sellers.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   averageScore: number,
 *   qualityBuckets: { high: number, medium: number, low: number },
 *   freshnessBuckets: { fresh30: number, stale30to90: number, dead90plus: number, noTimestamp: number },
 *   fieldGapCounts: Array<{ key: string, label: string, missing: number, weight: number }>,
 *   emptyCategories: Array<{ id: string, name: string }>,
 *   crowdedCategories: Array<{ id: string, name: string, count: number }>,
 *   uncategorized: number,
 *   topLowQuality: Array<{ id, name, sellerName, score, missing: string[] }>,
 *   topSellers: Array<{ uid, name, count, avgScore: number }>,
 *   deadListings: Array<{ id, name, sellerName, updatedAt: Date|null, ageDays: number|null }>,
 * }>}
 */
export async function getCatalogHealth() {
  const now = Date.now();

  const [productsSnap, categoriesSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.CATEGORIES)),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  const categoryIdToName = new Map();
  categoriesSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.name) categoryIdToName.set(doc.id, data.name);
  });

  const userIdToName = new Map();
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    userIdToName.set(
      doc.id,
      data.companyName || data.fullName || data.displayName || data.email || doc.id,
    );
  });

  const categoryCounts = new Map(); // categoryId → count
  const fieldGapCounts = PRODUCT_QUALITY_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    missing: 0,
    weight: f.weight,
  }));
  const gapByKey = new Map(fieldGapCounts.map((g) => [g.key, g]));

  const qualityBuckets = { high: 0, medium: 0, low: 0 };
  const freshnessBuckets = { fresh30: 0, stale30to90: 0, dead90plus: 0, noTimestamp: 0 };
  const rows = [];
  const sellerAgg = new Map(); // uid → { count, scoreSum }
  let scoreSum = 0;
  let uncategorized = 0;

  productsSnap.forEach((doc) => {
    const p = doc.data() || {};
    let score = 0;
    const missing = [];
    for (const field of PRODUCT_QUALITY_FIELDS) {
      if (field.ok(p)) {
        score += field.weight;
      } else {
        missing.push(field.label);
        gapByKey.get(field.key).missing += 1;
      }
    }
    scoreSum += score;

    if (score >= 80) qualityBuckets.high += 1;
    else if (score >= 40) qualityBuckets.medium += 1;
    else qualityBuckets.low += 1;

    const updated = toDate(p.updatedAt) || toDate(p.createdAt);
    if (!updated) freshnessBuckets.noTimestamp += 1;
    else {
      const ageDays = Math.floor((now - updated.getTime()) / MS_PER_DAY);
      if (ageDays <= 30) freshnessBuckets.fresh30 += 1;
      else if (ageDays <= 90) freshnessBuckets.stale30to90 += 1;
      else freshnessBuckets.dead90plus += 1;
    }

    const catId = p.categoryId || null;
    if (!catId) uncategorized += 1;
    else categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);

    const sellerName = userIdToName.get(p.userId) || 'Unknown';
    rows.push({
      id: doc.id,
      name: (p.name || '').trim() || '(unnamed)',
      sellerId: p.userId || null,
      sellerName,
      score,
      missing,
      updatedAt: updated,
      ageDays: updated ? Math.floor((now - updated.getTime()) / MS_PER_DAY) : null,
    });

    if (p.userId) {
      let s = sellerAgg.get(p.userId);
      if (!s) {
        s = { count: 0, scoreSum: 0, name: sellerName };
        sellerAgg.set(p.userId, s);
      }
      s.count += 1;
      s.scoreSum += score;
    }
  });

  const total = productsSnap.size;
  const averageScore = total > 0 ? Math.round(scoreSum / total) : 0;

  // Empty categories vs overcrowded (more than 20% of catalog).
  const overcrowdedThreshold = Math.max(20, Math.round(total * 0.15));
  const emptyCategories = [];
  const crowdedCategories = [];
  categoriesSnap.forEach((doc) => {
    const count = categoryCounts.get(doc.id) || 0;
    const name = doc.data()?.name || doc.id;
    if (count === 0) emptyCategories.push({ id: doc.id, name });
    else if (count > overcrowdedThreshold) crowdedCategories.push({ id: doc.id, name, count });
  });
  emptyCategories.sort((a, b) => a.name.localeCompare(b.name));
  crowdedCategories.sort((a, b) => b.count - a.count);

  const topLowQuality = rows
    .filter((r) => r.score < 40)
    .sort((a, b) => a.score - b.score)
    .slice(0, 20);

  const topSellers = Array.from(sellerAgg.entries())
    .map(([uid, agg]) => ({
      uid,
      name: agg.name,
      count: agg.count,
      avgScore: agg.count > 0 ? Math.round(agg.scoreSum / agg.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const deadListings = rows
    .filter((r) => r.ageDays !== null && r.ageDays > 90)
    .sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0))
    .slice(0, 20);

  return {
    snapshotAt: new Date(),
    total,
    averageScore,
    qualityBuckets,
    freshnessBuckets,
    fieldGapCounts,
    emptyCategories,
    crowdedCategories,
    uncategorized,
    topLowQuality,
    topSellers,
    deadListings,
  };
}

// --- Engagement Score — 5-layer model (Bölüm 18) --------------------------

/**
 * The five weighted layers described in the plan. Layer weights sum
 * to 100 by construction; a dev-mode assertion catches drift when
 * any weight is retuned.
 *
 * Sub-signals within each layer that require event-log data
 * (session duration, page depth, message quality, listing update
 * cadence, referral count) fall through to zero for now — the
 * layer is still capped at its full weight so a member who lights
 * up every derivable signal can still hit 100.
 */
export const ENGAGEMENT_LAYERS = [
  { id: 'activity', label: 'Activity', weight: 35, color: '#10B981' },
  { id: 'value', label: 'Value Production', weight: 25, color: '#3B82F6' },
  { id: 'profile', label: 'Profile Completeness', weight: 15, color: '#8B5CF6' },
  { id: 'commercial', label: 'Commercial Interaction', weight: 15, color: '#F59E0B' },
  { id: 'social', label: 'Social / Contribution', weight: 10, color: '#EF4444' },
];

if (
  ENGAGEMENT_LAYERS.reduce((s, l) => s + l.weight, 0) !== 100 &&
  process.env.NODE_ENV !== 'production'
) {
  // eslint-disable-next-line no-console
  console.warn('[analytics:engagement] ENGAGEMENT_LAYERS weights do not sum to 100');
}

/**
 * Read every signal we need for scoring in one round-trip. Reused by
 * getEngagementSnapshot below and available to future consumers that
 * want the raw signal shape.
 */
async function loadEngagementSignals() {
  const [usersSnap, productsSnap, requestsSnap, conversationsSnap, adsSnap, categoriesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.REQUESTS)),
    getDocs(collection(db, COLLECTIONS.CONVERSATIONS)),
    getDocs(collection(db, 'ads')),
    getDocs(collection(db, COLLECTIONS.CATEGORIES)),
  ]);

  const productsByUser = new Map();
  const productUpdatesByUser = new Map(); // last updateAt per uid
  productsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.userId;
    if (!uid) return;
    productsByUser.set(uid, (productsByUser.get(uid) || 0) + 1);
    const updated = toDate(d.updatedAt) || toDate(d.createdAt);
    if (updated) {
      const prev = productUpdatesByUser.get(uid);
      if (!prev || updated > prev) productUpdatesByUser.set(uid, updated);
    }
  });

  const rfqsByUser = new Map();
  requestsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) rfqsByUser.set(uid, (rfqsByUser.get(uid) || 0) + 1);
  });

  // uid → { received: 0, conversationPartners: Set }
  const messagingByUser = new Map();
  conversationsSnap.forEach((doc) => {
    const parts = Array.isArray(doc.data()?.participants) ? doc.data().participants : [];
    for (const uid of parts) {
      let row = messagingByUser.get(uid);
      if (!row) {
        row = { received: 0, partners: new Set() };
        messagingByUser.set(uid, row);
      }
      row.received += 1; // count of conversations = message threads
      for (const other of parts) {
        if (other !== uid) row.partners.add(other);
      }
    }
  });

  // Approximated "has advertised" join via companyName (see note in Bölüm 14).
  const advertisedCompanies = new Set();
  adsSnap.forEach((doc) => {
    const cn = (doc.data()?.companyName || '').trim().toLowerCase();
    if (cn) advertisedCompanies.add(cn);
  });

  const categoryIdToName = new Map();
  categoriesSnap.forEach((doc) => {
    const name = doc.data()?.name;
    if (name) categoryIdToName.set(doc.id, name);
  });

  return {
    usersSnap,
    productsByUser,
    productUpdatesByUser,
    rfqsByUser,
    messagingByUser,
    advertisedCompanies,
    categoryIdToName,
  };
}

/**
 * Score one user across the five layers. Returns the total plus a
 * per-layer breakdown so panels can show which layer is dragging.
 */
export function computeEngagementScore(userData, signals) {
  const now = Date.now();
  const data = userData;
  const activityDays = signals.lastLoginAt
    ? Math.floor((now - signals.lastLoginAt.getTime()) / MS_PER_DAY)
    : null;
  const productCount = signals.productCount || 0;
  const rfqCount = signals.rfqCount || 0;
  const messageRow = signals.messageRow || { received: 0, partners: new Set() };
  const hasAdvertised = !!signals.hasAdvertised;
  const productUpdatedRecently = signals.lastProductUpdate
    ? (now - signals.lastProductUpdate.getTime()) / MS_PER_DAY <= 30
    : false;

  // --- Activity: 35 pts ---
  // signed-in-recently 10 + login-cadence 10 + (session length + page
  // depth are event-log-only, contribute 0 today)
  let activity = 0;
  if (activityDays !== null) {
    if (activityDays <= 7) activity += 10;
    if (activityDays <= 30) activity += 10;
  }
  // Nothing to bank until the event log lands.
  // activity += sessionsCount → up to 15 more

  // --- Value production: 25 pts ---
  // products up to 8 + RFQs up to 7 + message-quality (skip) 0 + freshness 5
  let value = 0;
  value += Math.min(productCount * 2, 8);
  value += Math.min(rfqCount * 2, 7);
  if (productUpdatedRecently) value += 5;
  value = Math.min(value, 25);

  // --- Profile completeness: 15 pts ---
  // Same field weights the Profile Health section uses, rescaled to 15.
  const PROFILE_WEIGHTS = [
    { weight: 5, ok: (d) => (d.companyName || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.phone || '').trim() !== '' },
    { weight: 8, ok: (d) => (d.companyCategory || '').trim() !== '' },
    { weight: 4, ok: (d) => (d.firstName || '').trim() !== '' && (d.lastName || '').trim() !== '' },
    { weight: 12, ok: (d) => (d.companyLogo || '').trim() !== '' },
    { weight: 15, ok: (d) => (d.about || '').trim().length >= 40 },
    { weight: 8, ok: (d) => (d.companyWebsite || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.linkedinProfile || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.country || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.position || '').trim() !== '' },
    { weight: 18, ok: (d) => Array.isArray(d.companyDocuments) && d.companyDocuments.length > 0 },
    { weight: 10, ok: (d) => !!d.emailVerified && !!d.adminApproved },
  ];
  const profileRaw = PROFILE_WEIGHTS.reduce(
    (s, f) => s + (f.ok(data) ? f.weight : 0),
    0,
  ); // 0-100
  const profile = Math.round((profileRaw / 100) * 15);

  // --- Commercial interaction: 15 pts ---
  // received-messages 5 + advertising 5 + conversation-diversity 5
  let commercial = 0;
  if (messageRow.received >= 10) commercial += 5;
  else if (messageRow.received > 0) commercial += Math.round((messageRow.received / 10) * 5);
  if (hasAdvertised) commercial += 5;
  const diversity = messageRow.partners?.size || 0;
  if (diversity >= 5) commercial += 5;
  else if (diversity > 0) commercial += Math.round((diversity / 5) * 5);
  commercial = Math.min(commercial, 15);

  // --- Social / contribution: 10 pts ---
  // reviews / referrals / forum. None of these exist as data yet, so
  // this layer is 0 by design until those features land. Keeping the
  // slot means when they arrive we drop into the same panel.
  const social = 0;

  const total = Math.min(100, activity + value + profile + commercial + social);
  return {
    total,
    breakdown: { activity, value, profile, commercial, social },
  };
}

/**
 * Score every non-suspended user with the deeper 5-layer model and
 * return the whole roster + distribution stats.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   average: number,
 *   distribution: number[],                        // 10 buckets of 10 points
 *   percentiles: { p25: number, p50: number, p75: number, p90: number },
 *   rows: Array<{
 *     uid, displayName, email, companyName, country, sector,
 *     score: number, breakdown: Record<string, number>, activityDays: number|null
 *   }>,
 *   layerAverages: Record<string, number>,         // average of each layer
 *   verifiedLift: number|null,                     // avg verified − avg unverified
 * }>}
 */
export async function getEngagementSnapshot() {
  const now = Date.now();
  const signals = await loadEngagementSignals();

  const resolveSector = (raw) => {
    const v = (raw || '').trim();
    if (!v) return 'Unknown';
    return signals.categoryIdToName.get(v) || v;
  };

  const rows = [];
  signals.usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.isSuspended) return;
    const uid = doc.id;
    const lastLoginAt = toDate(data.lastLoginAt);
    const companyName = (data.companyName || '').trim();
    const perUserSignals = {
      lastLoginAt,
      productCount: signals.productsByUser.get(uid) || 0,
      rfqCount: signals.rfqsByUser.get(uid) || 0,
      messageRow: signals.messagingByUser.get(uid) || { received: 0, partners: new Set() },
      hasAdvertised: companyName && signals.advertisedCompanies.has(companyName.toLowerCase()),
      lastProductUpdate: signals.productUpdatesByUser.get(uid) || null,
    };
    const { total, breakdown } = computeEngagementScore(data, perUserSignals);
    rows.push({
      uid,
      displayName: data.fullName || data.displayName || '(no name)',
      email: data.email || '',
      companyName,
      country: (data.country || '').trim() || 'Unknown',
      sector: resolveSector(data.companyCategory),
      score: total,
      breakdown,
      activityDays: lastLoginAt
        ? Math.floor((now - lastLoginAt.getTime()) / MS_PER_DAY)
        : null,
      isVerified: !!data.emailVerified && !!data.adminApproved,
    });
  });

  const total = rows.length;
  const average = total > 0
    ? Math.round(rows.reduce((s, r) => s + r.score, 0) / total)
    : 0;

  // 10 buckets of 10 points (0-9, 10-19, ..., 90-100)
  const distribution = new Array(10).fill(0);
  for (const r of rows) {
    const idx = Math.min(9, Math.floor(r.score / 10));
    distribution[idx] += 1;
  }

  const sortedScores = rows.map((r) => r.score).sort((a, b) => a - b);
  const pctile = (p) => {
    if (sortedScores.length === 0) return 0;
    const idx = Math.min(sortedScores.length - 1, Math.floor((p / 100) * sortedScores.length));
    return sortedScores[idx];
  };

  // Per-layer average.
  const layerAverages = {};
  for (const layer of ENGAGEMENT_LAYERS) {
    const sum = rows.reduce((s, r) => s + (r.breakdown[layer.id] || 0), 0);
    layerAverages[layer.id] = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
  }

  // Verified lift.
  const verifiedRows = rows.filter((r) => r.isVerified);
  const unverifiedRows = rows.filter((r) => !r.isVerified);
  const verifiedAvg = verifiedRows.length > 0
    ? verifiedRows.reduce((s, r) => s + r.score, 0) / verifiedRows.length
    : null;
  const unverifiedAvg = unverifiedRows.length > 0
    ? unverifiedRows.reduce((s, r) => s + r.score, 0) / unverifiedRows.length
    : null;
  const verifiedLift = verifiedAvg !== null && unverifiedAvg !== null
    ? Math.round(verifiedAvg - unverifiedAvg)
    : null;

  return {
    snapshotAt: new Date(),
    total,
    average,
    distribution,
    percentiles: {
      p25: pctile(25),
      p50: pctile(50),
      p75: pctile(75),
      p90: pctile(90),
    },
    rows: rows.sort((a, b) => b.score - a.score),
    layerAverages,
    verifiedLift,
  };
}

// --- Verified / Trust (Bölüm 16) -------------------------------------------

/**
 * Trust-panel snapshot: how many members are verified, how many are
 * still waiting for admin approval, who has uploaded KYC / firma
 * documents, and how those trust signals split by country and sector.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   verified: number,
 *   pendingEmail: number,
 *   pendingApproval: number,
 *   suspended: number,
 *   verifiedRatio: number,        // 0-100
 *   docsUploaded: number,         // members with ≥1 companyDocument
 *   docsMissing: number,          // members without a companyDocument
 *   approvalQueue: Array<{ uid, displayName, email, companyName, country, ageDays, emailVerified }>,
 *   emailPendingList: Array<{ uid, displayName, email, ageDays }>,
 *   verifiedByCountry: Array<{ country: string, verified: number, total: number, ratio: number }>,
 *   verifiedBySector: Array<{ sector: string, verified: number, total: number, ratio: number }>,
 * }>}
 */
export async function getTrustSnapshot() {
  const now = Date.now();

  const [usersSnap, categoriesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.CATEGORIES)),
  ]);

  const categoryIdToName = new Map();
  categoriesSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.name) categoryIdToName.set(doc.id, data.name);
  });
  const resolveSector = (raw) => {
    const v = (raw || '').trim();
    if (!v) return 'Unknown';
    return categoryIdToName.get(v) || v;
  };

  let verified = 0;
  let pendingEmail = 0;
  let pendingApproval = 0;
  let suspended = 0;
  let docsUploaded = 0;
  let docsMissing = 0;

  const approvalQueue = [];
  const emailPendingList = [];

  const byCountry = new Map(); // country -> { verified, total }
  const bySector = new Map();

  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    const uid = doc.id;
    const createdAt = toDate(data.createdAt);
    const ageDays = createdAt
      ? Math.floor((now - createdAt.getTime()) / MS_PER_DAY)
      : null;
    const displayName = data.fullName || data.displayName || '(no name)';
    const emailVerified = !!data.emailVerified;
    const adminApproved = !!data.adminApproved;
    const isSuspended = !!data.isSuspended;
    const isVerified = emailVerified && adminApproved && !isSuspended;
    const hasDocs = Array.isArray(data.companyDocuments) && data.companyDocuments.length > 0;
    const country = (data.country || '').trim() || 'Unknown';
    const sector = resolveSector(data.companyCategory);

    if (isSuspended) suspended += 1;
    else if (isVerified) verified += 1;
    else if (!emailVerified) pendingEmail += 1;
    else pendingApproval += 1;

    if (hasDocs) docsUploaded += 1;
    else docsMissing += 1;

    if (!byCountry.has(country)) byCountry.set(country, { verified: 0, total: 0 });
    const c = byCountry.get(country);
    c.total += 1;
    if (isVerified) c.verified += 1;

    if (!bySector.has(sector)) bySector.set(sector, { verified: 0, total: 0 });
    const s = bySector.get(sector);
    s.total += 1;
    if (isVerified) s.verified += 1;

    // Queues.
    if (!isSuspended && emailVerified && !adminApproved) {
      approvalQueue.push({
        uid,
        displayName,
        email: data.email || '',
        companyName: (data.companyName || '').trim(),
        country,
        ageDays,
        emailVerified,
        hasDocs,
      });
    }
    if (!isSuspended && !emailVerified) {
      emailPendingList.push({
        uid,
        displayName,
        email: data.email || '',
        ageDays,
      });
    }
  });

  approvalQueue.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));
  emailPendingList.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0));

  const total = usersSnap.size;
  const verifiedRatio = total > 0 ? Math.round((verified / total) * 100) : 0;

  const toRatioRows = (map, keyName) =>
    Array.from(map.entries())
      .map(([key, agg]) => ({
        [keyName]: key,
        verified: agg.verified,
        total: agg.total,
        ratio: agg.total > 0 ? Math.round((agg.verified / agg.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

  return {
    snapshotAt: new Date(),
    total,
    verified,
    pendingEmail,
    pendingApproval,
    suspended,
    verifiedRatio,
    docsUploaded,
    docsMissing,
    approvalQueue,
    emailPendingList,
    verifiedByCountry: toRatioRows(byCountry, 'country'),
    verifiedBySector: toRatioRows(bySector, 'sector'),
  };
}

// --- Communication Hygiene (Bölüm 15) -------------------------------------

/**
 * Fatigue buckets, computed against a member's last-7-day notification
 * count. Thresholds match the plan: 5+ / 10+ = amber / red flags.
 */
function fatigueBucket(sevenDayCount) {
  if (sevenDayCount >= 10) return 'over';
  if (sevenDayCount >= 5) return 'high';
  if (sevenDayCount === 0) return 'silent';
  return 'ok';
}

/**
 * Read every user's in-app notifications via a collectionGroup query
 * and roll into hygiene stats. Only tracks the in-app channel today —
 * email volume needs the Resend log (backend integration) and
 * WhatsApp doesn't exist yet. Panel calls that out inline.
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   last7d: number,
 *   last30d: number,
 *   readRate: number|null,
 *   averagePerMemberWeek: number|null,
 *   fatigueCounts: { over: number, high: number, ok: number, silent: number },
 *   silentMembers: Array<{ uid, displayName, email, companyName, lastAt: Date|null, daysSince: number|null }>,
 *   overFatigued: Array<{ uid, displayName, email, companyName, count7d: number, lastAt: Date|null }>,
 *   byType: Array<{ type: string, count: number }>,
 *   dailyTrend: Array<{ date: string, count: number }>,
 * }>}
 */
export async function getCommunicationHygiene() {
  const now = Date.now();
  const startOfLast7 = now - 7 * MS_PER_DAY;
  const startOfLast30 = now - 30 * MS_PER_DAY;

  const [usersSnap, notifSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collectionGroup(db, 'notifications')),
  ]);

  // uid → { companyName, displayName, email, isSuspended }
  const userLookup = new Map();
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    userLookup.set(doc.id, {
      displayName: data.fullName || data.displayName || '(no name)',
      email: data.email || '',
      companyName: (data.companyName || '').trim(),
      isSuspended: !!data.isSuspended,
    });
  });

  // Per-user aggregate rows.
  const perUser = new Map(); // uid -> { total, last7d, last30d, lastAt, readCount, byType }
  const byType = new Map();
  const dailyCounts = new Map(); // yyyy-mm-dd -> count
  let total = 0;
  let last7d = 0;
  let last30d = 0;
  let readCount = 0;

  const startOfLast30Day = new Date(now - 29 * MS_PER_DAY);
  startOfLast30Day.setHours(0, 0, 0, 0);
  const startOfLast30Time = startOfLast30Day.getTime();

  notifSnap.forEach((doc) => {
    // Parent path: users/{uid}/notifications/{notifId}
    const parentUser = doc.ref?.parent?.parent;
    if (!parentUser) return;
    const uid = parentUser.id;
    const data = doc.data() || {};
    const createdAt = toDate(data.createdAt);
    if (!createdAt) return;

    total += 1;
    const type = (data.type || 'other').toString();
    byType.set(type, (byType.get(type) || 0) + 1);

    if (data.isRead) readCount += 1;

    const isLast7 = createdAt.getTime() >= startOfLast7;
    const isLast30 = createdAt.getTime() >= startOfLast30;
    if (isLast7) last7d += 1;
    if (isLast30) last30d += 1;

    if (createdAt.getTime() >= startOfLast30Time) {
      const y = createdAt.getFullYear();
      const m = String(createdAt.getMonth() + 1).padStart(2, '0');
      const d = String(createdAt.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
    }

    let row = perUser.get(uid);
    if (!row) {
      row = { total: 0, last7d: 0, last30d: 0, lastAt: null, readCount: 0 };
      perUser.set(uid, row);
    }
    row.total += 1;
    if (isLast7) row.last7d += 1;
    if (isLast30) row.last30d += 1;
    if (data.isRead) row.readCount += 1;
    if (!row.lastAt || createdAt > row.lastAt) row.lastAt = createdAt;
  });

  // Fatigue buckets — every non-suspended member gets counted (a
  // silent member with a user doc is still a member, absence of
  // notifications is itself the bucket signal).
  const fatigueCounts = { over: 0, high: 0, ok: 0, silent: 0 };
  const silentMembers = [];
  const overFatigued = [];

  usersSnap.forEach((doc) => {
    const uid = doc.id;
    const meta = userLookup.get(uid);
    if (meta?.isSuspended) return;
    const row = perUser.get(uid);
    const count7d = row?.last7d || 0;
    const bucket = fatigueBucket(count7d);
    fatigueCounts[bucket] += 1;

    if (bucket === 'silent') {
      const lastAt = row?.lastAt || null;
      const daysSince = lastAt
        ? Math.floor((now - lastAt.getTime()) / MS_PER_DAY)
        : null;
      // Cap the panel list at reasonable size — sorted below.
      silentMembers.push({
        uid,
        displayName: meta.displayName,
        email: meta.email,
        companyName: meta.companyName,
        lastAt,
        daysSince,
      });
    }
    if (bucket === 'over' || bucket === 'high') {
      overFatigued.push({
        uid,
        displayName: meta.displayName,
        email: meta.email,
        companyName: meta.companyName,
        count7d,
        lastAt: row?.lastAt || null,
        bucket,
      });
    }
  });

  silentMembers.sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
  overFatigued.sort((a, b) => b.count7d - a.count7d);

  const byTypeList = Array.from(byType.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Zero-filled daily series for the last 30 days.
  const dailyTrend = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOfLast30Time + i * MS_PER_DAY);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dailyTrend.push({ date: key, count: dailyCounts.get(key) || 0 });
  }

  const activeMemberCount = usersSnap.docs.filter((doc) => !(doc.data()?.isSuspended)).length;
  const averagePerMemberWeek =
    activeMemberCount > 0
      ? Math.round((last7d / activeMemberCount) * 10) / 10
      : null;
  const readRate = total > 0 ? Math.round((readCount / total) * 100) : null;

  return {
    snapshotAt: new Date(),
    total,
    last7d,
    last30d,
    readRate,
    averagePerMemberWeek,
    fatigueCounts,
    silentMembers,
    overFatigued,
    byType: byTypeList,
    dailyTrend,
  };
}

// --- Segmentation / Persona (Bölüm 14) ------------------------------------

/**
 * Predefined member segments with the criteria that place a member
 * into each and the recommended action. Rules are order-independent
 * — a member can land in more than one segment (a churn candidate
 * with an incomplete profile shows up in both).
 */
export const MEMBER_SEGMENTS = [
  {
    id: 'vip_candidate',
    label: 'VIP Candidate',
    emoji: '🌟',
    color: '#FFD700',
    action: 'Suggest VIP badge / priority support',
    detail: 'Score ≥75, verified, ≥2 products, active in last 30 days',
  },
  {
    id: 'high_value_buyer',
    label: 'High-value Buyer',
    emoji: '💎',
    color: '#8B5CF6',
    action: 'Route to concierge onboarding',
    detail: '3+ RFQs sent, active in last 30 days',
  },
  {
    id: 'passive_seller',
    label: 'Passive Seller',
    emoji: '😴',
    color: '#F59E0B',
    action: 'Nurture email — "haven\'t seen you in a while"',
    detail: 'Has products, no login in 14+ days',
  },
  {
    id: 'ad_potential',
    label: 'Ad Potential',
    emoji: '📢',
    color: '#06B6D4',
    action: 'Ad-package outreach',
    detail: 'Score ≥70, verified, never advertised',
  },
  {
    id: 'critical_churn',
    label: 'Critical Churn',
    emoji: '🚨',
    color: '#EF4444',
    action: 'Last-chance re-engagement campaign',
    detail: 'Score ≤35, no login in 45+ days',
  },
  {
    id: 'new_starter',
    label: 'New Starter',
    emoji: '🌱',
    color: '#10B981',
    action: 'Onboarding guidance / walkthrough',
    detail: 'Registered <14 days, ≤2 onboarding steps done',
  },
  {
    id: 'onboarded',
    label: 'Onboarded',
    emoji: '✅',
    color: '#3B82F6',
    action: 'Feature-discovery drip email',
    detail: 'Registered <60 days, 4+ onboarding steps done',
  },
];

/**
 * Compute segments across all members. Reuses the same base signals
 * as Onboarding + Profile + Ads so a member's segment matches what
 * they see on the other panels. Reads a snapshot of every dependency
 * collection in one round-trip.
 *
 * A member can belong to zero, one, or many segments. Segment lists
 * exclude suspended accounts by default (they're not actionable).
 *
 * @returns {Promise<{
 *   snapshotAt: Date,
 *   total: number,
 *   segments: Array<{
 *     id, label, emoji, color, action, detail,
 *     count: number,
 *     members: Array<{ uid, displayName, email, companyName, country, score }>,
 *   }>,
 *   scoreDistribution: { p25: number, p50: number, p75: number, avg: number },
 * }>}
 */
export async function getMemberSegments() {
  const now = Date.now();

  const [
    usersSnap,
    productsSnap,
    requestsSnap,
    conversationsSnap,
    adsSnap,
  ] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.REQUESTS)),
    getDocs(collection(db, COLLECTIONS.CONVERSATIONS)),
    getDocs(collection(db, 'ads')),
  ]);

  // Roll-ups per uid.
  const productCount = new Map();
  productsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) productCount.set(uid, (productCount.get(uid) || 0) + 1);
  });

  const requestCount = new Map();
  requestsSnap.forEach((doc) => {
    const uid = doc.data()?.userId;
    if (uid) requestCount.set(uid, (requestCount.get(uid) || 0) + 1);
  });

  const messagingUids = new Set();
  conversationsSnap.forEach((doc) => {
    const parts = Array.isArray(doc.data()?.participants) ? doc.data().participants : [];
    for (const uid of parts) messagingUids.add(uid);
  });

  // Ads collection stores companyName not userId, so we approximate
  // "has ever advertised" by fuzzy-matching the user's companyName
  // against the ad's. Case-insensitive, trimmed. Good enough at
  // this scale; when a userId field lands on ad docs, swap the join.
  const advertisedCompanies = new Set();
  adsSnap.forEach((doc) => {
    const cn = (doc.data()?.companyName || '').trim().toLowerCase();
    if (cn) advertisedCompanies.add(cn);
  });

  // Field weights for the composite score. Mirrors the flavor of the
  // future full Bölüm 18 model (activity + value + profile + trust)
  // at ~40 lines instead of 100, so a segment doesn't rely on a
  // panel that isn't built yet.
  const PROFILE_WEIGHTS = [
    { weight: 5, ok: (d) => (d.companyName || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.phone || '').trim() !== '' },
    { weight: 5, ok: (d) => (d.companyCategory || '').trim() !== '' },
    { weight: 8, ok: (d) => (d.companyLogo || '').trim() !== '' },
    { weight: 10, ok: (d) => (d.about || '').trim().length >= 40 },
    { weight: 5, ok: (d) => (d.companyWebsite || '').trim() !== '' },
    { weight: 12, ok: (d) => Array.isArray(d.companyDocuments) && d.companyDocuments.length > 0 },
  ];

  function computeScore(data, activity, hasProducts, hasRfq, hasMessages) {
    // Profile: 50 pts. Sum of PROFILE_WEIGHTS is 50 by design.
    let profile = 0;
    for (const f of PROFILE_WEIGHTS) if (f.ok(data)) profile += f.weight;

    // Activity: 25 pts.
    // 25 for login in last 7 days, 18 for 8-30, 8 for 31-60, 0 after.
    let activityPts = 0;
    if (activity !== null) {
      if (activity <= 7) activityPts = 25;
      else if (activity <= 30) activityPts = 18;
      else if (activity <= 60) activityPts = 8;
    }

    // Value production: 15 pts.
    // Products (up to 10) + RFQs (up to 5).
    const valuePts = Math.min(hasProducts * 2, 10) + Math.min(hasRfq * 2, 5);

    // Engagement: 10 pts.
    const engagementPts = hasMessages ? 10 : 0;

    return Math.min(100, profile + activityPts + valuePts + engagementPts);
  }

  const rows = [];
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.isSuspended) return;
    const uid = doc.id;
    const createdAt = toDate(data.createdAt);
    const lastLoginAt = toDate(data.lastLoginAt);
    const activity = lastLoginAt
      ? Math.floor((now - lastLoginAt.getTime()) / MS_PER_DAY)
      : null;
    const ageDays = createdAt
      ? Math.floor((now - createdAt.getTime()) / MS_PER_DAY)
      : null;
    const products = productCount.get(uid) || 0;
    const rfqs = requestCount.get(uid) || 0;
    const messages = messagingUids.has(uid);
    const secondSignin =
      createdAt &&
      lastLoginAt &&
      lastLoginAt.getTime() > createdAt.getTime() + 60 * 60 * 1000;
    const verified = !!data.emailVerified && !!data.adminApproved;

    // Onboarding-step count reuses the same rules the funnel section uses.
    const profilePct =
      PROFILE_WEIGHTS.reduce((s, f) => s + (f.ok(data) ? f.weight : 0), 0) * 2;
    let onboardingStepsDone = 0;
    if (data.emailVerified) onboardingStepsDone += 1;
    if (profilePct >= 50) onboardingStepsDone += 1;
    if (products > 0 || rfqs > 0) onboardingStepsDone += 1;
    if (messages) onboardingStepsDone += 1;
    if (secondSignin) onboardingStepsDone += 1;

    const score = computeScore(data, activity, products, rfqs, messages);

    const companyName = (data.companyName || '').trim();
    const hasAdvertised =
      companyName && advertisedCompanies.has(companyName.toLowerCase());

    rows.push({
      uid,
      displayName: data.fullName || data.displayName || '(no name)',
      email: data.email || '',
      companyName,
      country: (data.country || '').trim() || 'Unknown',
      score,
      activityDays: activity,
      ageDays,
      products,
      rfqs,
      hasMessages: messages,
      verified,
      hasAdvertised,
      onboardingStepsDone,
    });
  });

  // Segment assignment. Order-independent — a member can be in many.
  const isVip = (r) => r.score >= 75 && r.verified && r.products >= 2 && (r.activityDays !== null && r.activityDays <= 30);
  const isHighValueBuyer = (r) => r.rfqs >= 3 && (r.activityDays !== null && r.activityDays <= 30);
  const isPassiveSeller = (r) => r.products > 0 && (r.activityDays === null || r.activityDays >= 14);
  const isAdPotential = (r) => r.score >= 70 && r.verified && !r.hasAdvertised;
  const isCriticalChurn = (r) => r.score <= 35 && (r.activityDays === null || r.activityDays >= 45);
  const isNewStarter = (r) => r.ageDays !== null && r.ageDays < 14 && r.onboardingStepsDone <= 2;
  const isOnboarded = (r) => r.ageDays !== null && r.ageDays < 60 && r.onboardingStepsDone >= 4;

  const predicateFor = {
    vip_candidate: isVip,
    high_value_buyer: isHighValueBuyer,
    passive_seller: isPassiveSeller,
    ad_potential: isAdPotential,
    critical_churn: isCriticalChurn,
    new_starter: isNewStarter,
    onboarded: isOnboarded,
  };

  const segments = MEMBER_SEGMENTS.map((seg) => {
    const members = rows.filter(predicateFor[seg.id]).map((r) => ({
      uid: r.uid,
      displayName: r.displayName,
      email: r.email,
      companyName: r.companyName,
      country: r.country,
      score: r.score,
    }));
    members.sort((a, b) => b.score - a.score);
    return { ...seg, count: members.length, members };
  });

  // Score distribution for the header strip.
  const scores = rows.map((r) => r.score).sort((a, b) => a - b);
  const percentile = (p) => {
    if (scores.length === 0) return 0;
    const idx = Math.min(scores.length - 1, Math.floor((p / 100) * scores.length));
    return scores[idx];
  };
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0;

  return {
    snapshotAt: new Date(),
    total: rows.length,
    segments,
    scoreDistribution: {
      p25: percentile(25),
      p50: percentile(50),
      p75: percentile(75),
      avg: avgScore,
    },
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
