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
    desc: 'Prime homepage placement — every visitor sees your brand or product before scrolling. Choose the product slot, the company slot, or book both.',
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
      { id: AD_TYPES.SPONSORED_PRODUCT, label: 'Sponsored Product Ad — /products top slot' },
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
      { id: AD_TYPES.CAROUSEL, label: 'Carousel Company Ad — Featured Companies rotator' },
    ],
    desc: 'Interactive horizontal brand showcase on the homepage — great for brand awareness campaigns. Up to 8 sponsored cards rotate through every week.',
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

// Fixed 7-day week blocks — must match the option strings the inquiry
// form + admin form present so a converted inquiry doesn't get an
// invalid week label. If we ever add a Week 5, update both places.
export const CAMPAIGN_WEEKS = [
  'Week 1 (01-07)',
  'Week 2 (08-14)',
  'Week 3 (15-21)',
  'Week 4 (22-28)',
];

/**
 * Convert a ("July 2026", "Week 2 (08-14)") pair into concrete start/end
 * JS Dates. End of week is inclusive, i.e., 23:59:59 on the last day.
 * Returns { startDate, endDate } — callers wrap in Timestamp.fromDate
 * before writing to Firestore.
 */
export function campaignWeekToDates(monthLabel, weekLabel) {
  if (!monthLabel || !weekLabel) return null;
  const parts = monthLabel.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [monthName, yearStr] = parts;
  const year = parseInt(yearStr, 10);
  const monthIdx = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].indexOf(monthName);
  if (monthIdx < 0 || !Number.isFinite(year)) return null;

  const match = weekLabel.match(/\((\d{2})-(\d{2})\)/);
  if (!match) return null;
  const startDay = parseInt(match[1], 10);
  const endDay = parseInt(match[2], 10);

  const startDate = new Date(year, monthIdx, startDay, 0, 0, 0, 0);
  const endDate = new Date(year, monthIdx, endDay, 23, 59, 59, 999);
  return { startDate, endDate };
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
  CAMPAIGN_WEEKS,
  campaignWeekToDates,
  computeMonthlyDiscount,
};

export default adTypesExport;
