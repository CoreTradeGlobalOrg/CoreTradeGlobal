/**
 * Quote Constants
 *
 * Enums and configuration for the Phase 4 provider quote system.
 * Covers both insurance and logistics quote types.
 *
 * Used by Cloud Functions (Plan 02), provider portal UI (Plan 03), and
 * buyer quotes comparison UI (Plan 04).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quote request status enum
 * Tracks per-provider request state in the provider's kanban view.
 */
export const QUOTE_REQUEST_STATUS = {
  PENDING: 'pending',             // Provider has not yet responded
  QUOTED: 'quoted',               // Provider submitted a quote
  DECLINED: 'declined',           // Provider explicitly declined the request
  SELECTED: 'selected',           // Buyer selected this provider's quote
  NOT_SELECTED: 'not_selected',   // Buyer selected another provider
};

/**
 * Quote status enum
 * Tracks the lifecycle of a submitted quote document.
 */
export const QUOTE_STATUS = {
  ACTIVE: 'active',       // Quote is live and valid
  WITHDRAWN: 'withdrawn', // Provider withdrew the quote before selection
  EXPIRED: 'expired',     // validUntil timestamp has passed without selection
  ACCEPTED: 'accepted',   // Buyer selected this quote
};

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Coverage Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ICC (Institute Cargo Clauses) coverage types
 * Each type defines a scope of covered perils for marine/air cargo insurance.
 *
 * A = All Risks (broadest)
 * B = Named Perils Extended
 * C = Named Perils Basic (narrowest)
 */
export const ICC_COVERAGE = {
  A: {
    value: 'A',
    label: 'ICC A — All Risks',
    description: 'Broadest coverage. Covers all risks of loss or damage except named exclusions.',
  },
  B: {
    value: 'B',
    label: 'ICC B — Named Perils Extended',
    description: 'Covers fire, explosion, sinking, stranding, collision, washing overboard, and water ingress.',
  },
  C: {
    value: 'C',
    label: 'ICC C — Named Perils Basic',
    description: 'Most limited coverage. Covers fire, explosion, sinking, stranding, and collision only.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Coverage Scope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insurance coverage scope options
 * Determines the geographic extent of coverage.
 */
export const COVERAGE_SCOPE = [
  { value: 'warehouse_to_warehouse', label: 'Warehouse to Warehouse' },
  { value: 'port_to_port', label: 'Port to Port' },
  { value: 'door_to_door', label: 'Door to Door' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Transport Modes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logistics transport mode options
 * iconName maps to lucide-react icon component names.
 */
export const TRANSPORT_MODE = [
  { value: 'sea', label: 'Sea Freight', iconName: 'Ship' },
  { value: 'air', label: 'Air Freight', iconName: 'Plane' },
  { value: 'road', label: 'Road Freight', iconName: 'Truck' },
  { value: 'rail', label: 'Rail Freight', iconName: 'Train' },
  { value: 'multimodal', label: 'Multimodal', iconName: 'ArrowLeftRight' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Container Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logistics container type options
 * Relevant primarily for sea freight.
 */
export const CONTAINER_TYPE = [
  { value: '20ft', label: '20ft Standard' },
  { value: '40ft', label: '40ft Standard' },
  { value: '40ft_hc', label: '40ft High Cube' },
  { value: '45ft_hc', label: '45ft High Cube' },
  { value: 'lcl', label: 'LCL (Less than Container Load)' },
  { value: 'reefer', label: 'Reefer (Refrigerated)' },
  { value: 'open_top', label: 'Open Top' },
  { value: 'flat_rack', label: 'Flat Rack' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Capability Tags
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logistics provider capability tags
 * Providers can self-tag their service capabilities.
 * Buyers see these tags on quote cards for quick evaluation.
 */
export const CAPABILITY_TAGS = [
  'GPS Tracking',
  'Cold Chain',
  'Door-to-Door',
  'Customs Support',
  'Hazmat Certified',
  'Express Delivery',
  'Insurance Included',
  'Bonded Warehouse',
];

// ─────────────────────────────────────────────────────────────────────────────
// Quote Validity Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quote validity window options for providers
 * Providers choose how long their submitted quote remains valid for buyer selection.
 * Value is in hours.
 */
export const QUOTE_VALIDITY_OPTIONS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: New Insurance Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard exclusion checkboxes for insurance quotes.
 * Providers select which exclusions apply to their policy.
 */
export const STANDARD_EXCLUSIONS = [
  { value: 'inherent_vice', label: 'Inherent Vice or Nature of Goods' },
  { value: 'inadequate_packing', label: 'Inadequate Packing or Preparation' },
  { value: 'delay', label: 'Loss Caused by Delay' },
  { value: 'insolvency', label: 'Insolvency or Financial Default of Carrier' },
  { value: 'nuclear', label: 'Nuclear Weapons / Radioactive Contamination' },
  { value: 'war_sanctions', label: 'War, Sanctions, or Embargo (unless War Clause added)' },
  { value: 'wear_tear', label: 'Ordinary Wear and Tear / Gradual Deterioration' },
];

/**
 * Standard conditions precedent for insurance quotes.
 * Providers specify which conditions must be met before coverage applies.
 */
export const STANDARD_CONDITIONS_PRECEDENT = [
  { value: 'survey_required', label: 'Pre-shipment Survey Required' },
  { value: 'packing_standards', label: 'Goods Must Meet ISPM-15 Packing Standards' },
  { value: 'documentation', label: 'All Shipping Documents Must Be Provided Before Coverage Starts' },
  { value: 'vessel_class', label: "Vessel Must Be Lloyd's Register Classed" },
  { value: 'notify_departure', label: 'Insured Must Notify Departure Within 48 Hours' },
  { value: 'warehouse_cert', label: 'Warehouse Certificate Required for Storage' },
];

/**
 * Claims jurisdiction options for insurance quotes.
 */
export const CLAIMS_JURISDICTION = [
  { value: 'english_law', label: 'English Law (London)' },
  { value: 'us_law', label: 'US Law (New York)' },
  { value: 'swiss_law', label: 'Swiss Law (Zurich)' },
  { value: 'singapore_law', label: 'Singapore Law' },
  { value: 'hong_kong_law', label: 'Hong Kong Law' },
  { value: 'icc_arbitration', label: 'ICC Arbitration' },
];

/**
 * Claims response time options for insurance quotes.
 */
export const CLAIMS_RESPONSE_TIME = [
  { value: '24h', label: '24 Hours' },
  { value: '48h', label: '48 Hours' },
  { value: '72h', label: '72 Hours' },
  { value: '5d', label: '5 Business Days' },
  { value: '10d', label: '10 Business Days' },
];

/**
 * Premium payment terms for insurance quotes.
 */
export const PREMIUM_PAYMENT_TERMS = [
  { value: 'advance', label: 'Payment in Advance' },
  { value: '30_days', label: 'Net 30 Days' },
  { value: '60_days', label: 'Net 60 Days' },
  { value: '90_days', label: 'Net 90 Days' },
  { value: 'on_shipment', label: 'Due on Shipment' },
];

/**
 * Political risk perils for political risk coverage sub-object.
 */
export const POLITICAL_PERILS = [
  { value: 'expropriation', label: 'Expropriation / Nationalization' },
  { value: 'political_violence', label: 'Political Violence / Terrorism' },
  { value: 'currency_inconvertibility', label: 'Currency Inconvertibility' },
  { value: 'contract_frustration', label: 'Contract Frustration' },
  { value: 'embargo', label: 'Trade Embargo / Sanctions' },
  { value: 'sovereign_default', label: 'Sovereign Default' },
  { value: 'forced_divestiture', label: 'Forced Divestiture / Abandonment' },
];

/**
 * Commercial risk coverage basis options.
 */
export const COMMERCIAL_COVERAGE_BASIS = [
  { value: 'whole_turnover', label: 'Whole Turnover' },
  { value: 'key_accounts', label: 'Key Accounts Only' },
  { value: 'single_buyer', label: 'Single Buyer' },
  { value: 'specific_contract', label: 'Specific Contract' },
];

/**
 * Quote binding status — whether the quote is indicative or firm.
 */
export const QUOTE_BINDING_STATUS = {
  INDICATIVE: 'indicative',
  FIRM: 'firm',
};

// ─────────────────────────────────────────────────────────────────────────────
// Deadline Constant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default deadline (in hours) for providers to respond to a quote request.
 * Consistent with EXPIRY_DEFAULT_HOURS in dealConstants.js.
 */
export const QUOTE_REQUEST_DEADLINE_HOURS = 72;

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export default {
  QUOTE_REQUEST_STATUS,
  QUOTE_STATUS,
  ICC_COVERAGE,
  COVERAGE_SCOPE,
  TRANSPORT_MODE,
  CONTAINER_TYPE,
  CAPABILITY_TAGS,
  QUOTE_VALIDITY_OPTIONS,
  QUOTE_REQUEST_DEADLINE_HOURS,
  // Phase 14 new constants
  STANDARD_EXCLUSIONS,
  STANDARD_CONDITIONS_PRECEDENT,
  CLAIMS_JURISDICTION,
  CLAIMS_RESPONSE_TIME,
  PREMIUM_PAYMENT_TERMS,
  POLITICAL_PERILS,
  COMMERCIAL_COVERAGE_BASIS,
  QUOTE_BINDING_STATUS,
};
