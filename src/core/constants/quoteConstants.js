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
};
