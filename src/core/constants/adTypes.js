/**
 * Ad Placement Constants
 *
 * Single source of truth for advertising slot types, statuses, and tier
 * metadata. Consumed by:
 *   - Firestore rules (indirectly — string values must match)
 *   - Cloud Function expireAds / trackAdImpression / trackAdClick
 *   - Admin AdCampaignsManager form + list
 *   - useActiveAd hook + injection points (Hero, ProductGrid, Showcase)
 *   - /pricing page tier grid
 *   - /pricing/inquire form package options + ?type= prefill mapping
 */

export const AD_TYPES = {
  FEATURED: 'featured',
  HERO: 'hero',
  CAROUSEL: 'carousel',
};

export const AD_TYPE_LABELS = {
  [AD_TYPES.FEATURED]: 'Featured Product Ad',
  [AD_TYPES.HERO]: 'Hero Section Spotlight',
  [AD_TYPES.CAROUSEL]: 'Carousel Brand Spotlight',
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

// Marketing copy powering the /pricing tier grid + advertising row on
// the pricing page. Extracted here so the same source of truth backs
// the pricing view and the admin form's tier picker.
export const AD_TIERS = [
  {
    id: AD_TYPES.FEATURED,
    tag: 'Featured Products',
    title: 'Featured Product Ads',
    price: '$100',
    priceSuffix: '/week',
    desc: 'Top-of-directory placement in front of active B2B buyers actively searching for direct trade listings.',
    features: [
      'Featured at the top of the B2B product directory',
      '1,500–2,500 active weekly B2B buyers',
      'Shown across 25+ global shipping routes and markets',
    ],
    cta: 'Inquire About Featured Ads',
    mockup: 'featured',
  },
  {
    id: AD_TYPES.HERO,
    tag: 'Hero Spotlight',
    title: 'Hero Section Spotlights',
    price: '$100',
    priceSuffix: '/week',
    desc: 'Prime attention slot on the homepage and category search results — the highest-conversion surface on the platform.',
    features: [
      '3,000+ daily decision-makers and trade executives',
      'Reach sourcing agents from 35+ countries',
      'Highest-conversion spotlight on home and search pages',
    ],
    cta: 'Inquire About Hero Ads',
    mockup: 'hero',
  },
  {
    id: AD_TYPES.CAROUSEL,
    tag: 'Carousel Brand',
    title: 'Carousel Brand Spotlights',
    price: '$100',
    priceSuffix: '/week',
    desc: 'Interactive horizontal brand showcase on the landing pages — great for brand awareness campaigns.',
    features: [
      '2,000–3,000 direct B2B importers & exporters weekly',
      'Shown to active traders across 30+ countries',
      'Interactive carousel showcase on the landing pages',
    ],
    cta: 'Inquire About Carousel Ads',
    mockup: 'carousel',
  },
];

// Ad inquiry form uses these package labels; each maps to an ad type
// (Combined multi-placement is intentionally *not* a type — an admin
// creates one ad per placement when converting a combined inquiry).
export const AD_PACKAGES = [
  { value: 'Featured Product Directory Spot', short: 'Featured Products', type: AD_TYPES.FEATURED, price: 100, unit: '/week' },
  { value: 'Hero Section Spotlight Ad', short: 'Hero Spotlight', type: AD_TYPES.HERO, price: 100, unit: '/week' },
  { value: 'Carousel Banner Placement', short: 'Carousel Brand', type: AD_TYPES.CAROUSEL, price: 100, unit: '/week' },
  { value: 'Combined Multi-Placement Package', short: 'Combined Multi-Placement', type: null, price: 200, unit: '/week' },
];

// URL query-param shortcut used by /pricing tier CTAs to preselect a
// package on the inquiry form.
export const TYPE_TO_PACKAGE = {
  [AD_TYPES.FEATURED]: 'Featured Product Directory Spot',
  [AD_TYPES.HERO]: 'Hero Section Spotlight Ad',
  [AD_TYPES.CAROUSEL]: 'Carousel Banner Placement',
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
  // "July 2026" -> ["July", "2026"]
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
  TYPE_TO_PACKAGE,
  CAMPAIGN_WEEKS,
  campaignWeekToDates,
};

export default adTypesExport;
