/**
 * Ad Placement Constants
 *
 * Single source of truth for advertising slot types, statuses, and tier
 * metadata. Consumed by:
 *   - Firestore rules (indirectly — string values must match)
 *   - Cloud Function expireAds / trackAdImpression / trackAdClick
 *   - Admin AdCampaignsManager form + list
 *   - useActiveAd hook + injection points (Hero, ProductGrid, Showcase)
 *   - /advertising page tier grid
 *   - /pricing/inquire form package options + ?type= prefill mapping
 */

export const AD_TYPES = {
  // Hero left card — sponsored PRODUCT placement in the homepage hero.
  FEATURED: 'featured',
  // Hero right card — sponsored COMPANY placement in the homepage hero.
  HERO: 'hero',
  // Products directory (/products) — top-of-grid sponsored product slot.
  SPONSORED_PRODUCT: 'sponsored_product',
  // 3D Featured Companies carousel + mobile card stack — rotating slots.
  CAROUSEL: 'carousel',
  // Unified sponsorship — a single purchase fills every ad slot at once:
  //   hero left  → sponsored.heroProductId
  //   hero right → sponsored.userId (company card)
  //   showcase   → sponsored.showcaseProductIds (up to 3 mini cards)
  //   /products  → sponsored.productsListProductId
  // New tier that replaces the four legacy types above going forward.
  // Legacy ads are still honored for backwards compatibility until an
  // admin expires them; the sponsored record takes priority when active.
  SPONSORED: 'sponsored',
};

export const AD_TYPE_LABELS = {
  [AD_TYPES.FEATURED]: 'Hero Product Ad',
  [AD_TYPES.HERO]: 'Hero Company Ad',
  [AD_TYPES.SPONSORED_PRODUCT]: 'Sponsored Product Ad',
  [AD_TYPES.CAROUSEL]: 'Carousel Company Ad',
  [AD_TYPES.SPONSORED]: 'Sponsored Package',
};

export const AD_STATUSES = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired',
};

export const AD_STATUS_LABELS = {
  [AD_STATUSES.SCHEDULED]: 'Scheduled',
  [AD_STATUSES.ACTIVE]: 'Active',
  [AD_STATUSES.PAUSED]: 'Paused',
  [AD_STATUSES.EXPIRED]: 'Expired',
};

/**
 * Compute the % savings a monthly purchase gives vs 4x weekly.
 * Returns a rounded whole number, or 0 when there's no discount.
 */
export function computeMonthlyDiscount(weekly, monthly) {
  if (!weekly || !monthly) return 0;
  const fourWeeks = weekly * 4;
  if (monthly >= fourWeeks) return 0;
  return Math.round(((fourWeeks - monthly) / fourWeeks) * 100);
}

// Marketing copy powering the /advertising tier grid + inquiry form.
// Post-consolidation we sell exactly one tier — the sponsored package
// covers hero left + right, the homepage showcase, and the /products
// directory slot in a single buy. Legacy AD_TYPES entries linger for
// backwards compat but no longer appear as purchasable tiers.
export const AD_TIERS = [
  {
    id: 'sponsored-package',
    tag: 'Sponsored Package',
    title: 'Sponsored Package',
    slotCount: 4,
    slotLabel: 'Hero + Showcase + Products directory',
    weeklyPrice: null,
    monthlyPrice: 499,
    priceUnit: '',
    typeOptions: [
      { id: AD_TYPES.SPONSORED, label: 'Sponsored Package (full-site placement)' },
    ],
    desc: 'One purchase, four surfaces. Your brand takes both hero cards, the sponsored company showcase, and the products directory sponsored tile — all resolved live from your CTG profile.',
    features: [
      'Both homepage hero cards (product left + company right)',
      'Full "Sponsored Company" showcase with your 3 picked products',
      'Top-of-grid sponsored tile on /products',
      'Sold monthly — one advertiser per calendar month, no overlap',
    ],
    cta: 'Inquire About Sponsored Package',
    mockup: 'sponsored',
  },
];

// Ad inquiry form package options. Only the sponsored package is
// bookable; the constant is a single-entry array to keep the existing
// (pkg, TYPE_TO_PACKAGE, pkgMeta) plumbing intact without special-case
// branches.
export const AD_PACKAGES = [
  { value: 'Sponsored Package', short: 'Sponsored', type: AD_TYPES.SPONSORED, weekly: null, monthly: 499 },
];

// Duration options offered to the buyer in the inquiry form. Post-
// consolidation only monthly (full-calendar-month) is sold — weekly
// entry is kept in the array for backwards compat with legacy admin
// tools that still reference the id, but the inquiry UI hides it.
export const AD_DURATIONS = [
  { id: 'monthly', label: 'Monthly (full calendar month)', unit: '/month' },
];

// URL query-param shortcut used by /advertising tier CTAs to preselect
// a package on the inquiry form.
export const TYPE_TO_PACKAGE = {
  [AD_TYPES.SPONSORED]: 'Sponsored Package',
  [AD_TYPES.FEATURED]: 'Hero Product Ad',
  [AD_TYPES.HERO]: 'Hero Company Ad',
  [AD_TYPES.SPONSORED_PRODUCT]: 'Sponsored Product Ad',
  [AD_TYPES.CAROUSEL]: 'Carousel Company Ad',
  combined: 'Combined Multi-Placement Package',
};

// Campaign span cap — a full calendar month can be up to 31 days
// (Jan/Mar/May/Jul/Aug/Oct/Dec). We cap at 32 so a start-of-month →
// end-of-month range always fits with a day of slack for timezone
// edge cases. Firestore rules are updated in lockstep.
export const DURATION_DAYS = {
  weekly: 7,
  monthly: 31,
};

export const MAX_CAMPAIGN_DAYS = 32;
export const MAX_CAMPAIGN_MS = MAX_CAMPAIGN_DAYS * 24 * 60 * 60 * 1000;

// Return the inclusive day-count cap for the given duration id. Unknown
// or missing duration falls back to the monthly cap.
export function daysForDuration(duration) {
  return DURATION_DAYS[duration] ?? DURATION_DAYS.monthly;
}

// Return the start (day 1) and end (last day) of a calendar month in
// local time. The `year` and `monthIndex` args match the Date API's
// 0-indexed month convention (Jan = 0). Used by the inquiry form to
// convert a picked "October 2026" into concrete campaign dates.
export function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Emit N successive calendar months starting from a given anchor month.
// Returns `[{ year, monthIndex, label, key }]` — key is YYYY-MM so it can
// match the ad doc's month field directly if we later normalize.
export function upcomingMonths(anchor, count = 12) {
  const out = [];
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  for (let i = 0; i < count; i++) {
    const d = new Date(y, m + i, 1);
    const yy = d.getFullYear();
    const mm = d.getMonth();
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const key = `${yy}-${String(mm + 1).padStart(2, '0')}`;
    out.push({ year: yy, monthIndex: mm, label, key });
  }
  return out;
}

/**
 * Normalize an ISO date string (`YYYY-MM-DD`) or Date to a Date at
 * start-of-day / end-of-day in the local timezone. Used by both forms
 * so a picked "Aug 4" becomes 00:00:00.000 (start) or 23:59:59.999 (end),
 * matching the inclusive semantics the old week-block model used.
 */
export function toDayStart(input) {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(`${input}T00:00:00`) : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDayEnd(input) {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(`${input}T00:00:00`) : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Validate a picked campaign range. Returns { ok: true, start, end } when
 * valid, or { ok: false, reason } with a user-facing message when not.
 * `start` / `end` are Date objects with the standard day-start / day-end
 * clamping applied so callers can wrap in Timestamp.fromDate directly.
 *
 * `maxDays` overrides the ceiling — buyer form passes the duration cap
 * (7 or 28); admin form omits it and gets the absolute MAX_CAMPAIGN_DAYS.
 */
export function validateCampaignRange(startInput, endInput, maxDays = MAX_CAMPAIGN_DAYS) {
  const start = toDayStart(startInput);
  const end = toDayEnd(endInput);
  if (!start || !end) return { ok: false, reason: 'Pick both a start and end date.' };
  if (end.getTime() < start.getTime()) {
    return { ok: false, reason: 'End date must be on or after the start date.' };
  }
  const capMs = maxDays * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > capMs) {
    return { ok: false, reason: `Campaign window can be at most ${maxDays} days.` };
  }
  return { ok: true, start, end };
}

const adTypesExport = {
  AD_TYPES,
  AD_TYPE_LABELS,
  AD_STATUSES,
  AD_STATUS_LABELS,
  AD_TIERS,
  AD_PACKAGES,
  AD_DURATIONS,
  TYPE_TO_PACKAGE,
  DURATION_DAYS,
  MAX_CAMPAIGN_DAYS,
  MAX_CAMPAIGN_MS,
  daysForDuration,
  toDayStart,
  toDayEnd,
  monthRange,
  upcomingMonths,
  validateCampaignRange,
  computeMonthlyDiscount,
};

export default adTypesExport;
