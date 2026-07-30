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
};

export const AD_TYPE_LABELS = {
  [AD_TYPES.FEATURED]: 'Hero Product Ad',
  [AD_TYPES.HERO]: 'Hero Company Ad',
  [AD_TYPES.SPONSORED_PRODUCT]: 'Sponsored Product Ad',
  [AD_TYPES.CAROUSEL]: 'Carousel Company Ad',
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
// Each tier bundles one or more ad types under a single price row so
// the buyer sees business language ("Hero Cards") instead of type IDs.
export const AD_TIERS = [
  {
    id: 'hero-cards',
    tag: 'Hero Cards',
    title: 'Hero Cards',
    // Two slots because the hero has one Sponsored Product card (left)
    // and one Sponsored Company card (right). Both priced identically.
    slotCount: 2,
    slotLabel: '2 slots (1 product + 1 company)',
    weeklyPrice: 49,
    monthlyPrice: 149,
    priceUnit: '/slot',
    // Ad type ids the buyer chooses between when purchasing this tier.
    typeOptions: [
      { id: AD_TYPES.FEATURED, label: 'Hero Product Ad (left card)' },
      { id: AD_TYPES.HERO, label: 'Hero Company Ad (right card)' },
    ],
    desc: 'Prime homepage placement. Every visitor sees your brand or product before scrolling. Choose the product slot, the company slot, or book both.',
    features: [
      'Front-page homepage hero placement',
      'Choice of Product card (left) or Company card (right)',
      'Desktop + mobile ad row coverage',
      '3,000+ daily decision-makers landing on the platform',
    ],
    cta: 'Inquire About Hero Ads',
    mockup: 'hero',
  },
  {
    id: 'sponsored-product',
    tag: 'Sponsored Product',
    title: 'Sponsored Product',
    slotCount: 1,
    slotLabel: '1 slot',
    weeklyPrice: 29,
    monthlyPrice: 99,
    priceUnit: '',
    typeOptions: [
      { id: AD_TYPES.SPONSORED_PRODUCT, label: 'Sponsored Product Ad (/products top slot)' },
    ],
    desc: 'Top-of-directory placement in front of buyers actively browsing the products catalogue.',
    features: [
      'Featured at the top of the B2B product directory',
      '1,500–2,500 active weekly B2B buyers',
      'Shown across 25+ global shipping routes and markets',
    ],
    cta: 'Inquire About Sponsored Products',
    mockup: 'featured',
  },
  {
    id: 'carousel',
    tag: 'Carousel',
    title: 'Carousel Company Ad',
    slotCount: 8,
    slotLabel: '8 slots (rotating)',
    weeklyPrice: 19,
    monthlyPrice: 59,
    priceUnit: '/slot',
    typeOptions: [
      { id: AD_TYPES.CAROUSEL, label: 'Carousel Company Ad (Featured Companies rotator)' },
    ],
    desc: 'Interactive horizontal brand showcase on the homepage, great for brand awareness campaigns. Up to 8 sponsored cards rotate through every week.',
    features: [
      '2,000–3,000 direct B2B importers & exporters weekly',
      'Shown to active traders across 30+ countries',
      'Rotates alongside organic company cards on desktop 3D carousel + mobile card stack',
    ],
    cta: 'Inquire About Carousel Ads',
    mockup: 'carousel',
  },
];

// Ad inquiry form uses these package labels; each maps to an ad type
// so a converted inquiry lands with the right slot pre-selected.
// Combined multi-placement is intentionally *not* a type — an admin
// creates one ad per placement when converting a combined inquiry.
export const AD_PACKAGES = [
  { value: 'Hero Product Ad', short: 'Hero Product Ad', type: AD_TYPES.FEATURED, weekly: 49, monthly: 149 },
  { value: 'Hero Company Ad', short: 'Hero Company Ad', type: AD_TYPES.HERO, weekly: 49, monthly: 149 },
  { value: 'Sponsored Product Ad', short: 'Sponsored Product Ad', type: AD_TYPES.SPONSORED_PRODUCT, weekly: 29, monthly: 99 },
  { value: 'Carousel Company Ad', short: 'Carousel Company Ad', type: AD_TYPES.CAROUSEL, weekly: 19, monthly: 59 },
  { value: 'Combined Multi-Placement Package', short: 'Combined', type: null, weekly: 89, monthly: 299 },
];

// Duration options offered to the buyer in the inquiry form. Weekly is
// the default; Monthly bundles four weeks at a discount that varies per
// package (calculated live via computeMonthlyDiscount).
export const AD_DURATIONS = [
  { id: 'weekly', label: 'Weekly', unit: '/week' },
  { id: 'monthly', label: 'Monthly (4 weeks)', unit: '/month' },
];

// URL query-param shortcut used by /advertising tier CTAs to preselect
// a package on the inquiry form.
export const TYPE_TO_PACKAGE = {
  [AD_TYPES.FEATURED]: 'Hero Product Ad',
  [AD_TYPES.HERO]: 'Hero Company Ad',
  [AD_TYPES.SPONSORED_PRODUCT]: 'Sponsored Product Ad',
  [AD_TYPES.CAROUSEL]: 'Carousel Company Ad',
  combined: 'Combined Multi-Placement Package',
};

// Max campaign span depends on the duration the buyer picked:
//   - weekly  → 7-day window (Mon → Sun inclusive)
//   - monthly → 28-day window (4 × 7 = 28 days inclusive, matches the
//     "Monthly (4 weeks)" pricing option in AD_DURATIONS)
// Admin can create ads without a duration constraint but the same
// 28-day absolute ceiling still applies (and is what the Firestore
// rules enforce on inquiry writes).
export const DURATION_DAYS = {
  weekly: 7,
  monthly: 28,
};

export const MAX_CAMPAIGN_DAYS = DURATION_DAYS.monthly;
export const MAX_CAMPAIGN_MS = MAX_CAMPAIGN_DAYS * 24 * 60 * 60 * 1000;

// Return the inclusive day-count cap for the given duration id. Unknown
// or missing duration falls back to the weekly cap so a bad `?duration=`
// query param can't silently unlock a 4× longer window.
export function daysForDuration(duration) {
  return DURATION_DAYS[duration] ?? DURATION_DAYS.weekly;
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
  validateCampaignRange,
  computeMonthlyDiscount,
};

export default adTypesExport;
