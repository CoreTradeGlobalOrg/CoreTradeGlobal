/**
 * Deal and Offer Constants
 *
 * Enums and configuration for the deal negotiation state machine.
 * Used by both Cloud Functions (server-side) and client-side code.
 *
 * Note: Cloud Functions duplicate these as plain objects since
 *       they cannot import ESM from the Next.js app.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deal status enum
 * Represents the overall state of a negotiation deal.
 */
export const DEAL_STATUS = {
  NEGOTIATING: 'negotiating',           // Active negotiation in progress
  ACCEPTED: 'accepted',                 // Both parties agreed — triggers contract generation
  REJECTED: 'rejected',                 // One party rejected the offer
  EXPIRED: 'expired',                   // All offers expired without acceptance
  WITHDRAWN: 'withdrawn',               // A party withdrew from the negotiation
  CONTRACT_APPROVED: 'contract_approved', // Both parties approved all contract clauses — deal complete
};

/**
 * Offer status enum
 * Represents the state of a single offer within a deal.
 */
export const OFFER_STATUS = {
  OPEN: 'open',           // Awaiting response from the other party
  COUNTERED: 'countered', // Superseded by a counter-offer
  ACCEPTED: 'accepted',   // Accepted by the receiving party
  REJECTED: 'rejected',   // Rejected by the receiving party
  EXPIRED: 'expired',     // Passed expiresAt without response
  WITHDRAWN: 'withdrawn', // Withdrawn by the submitting party
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment Terms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payment terms options for offer form
 * Value is stored in Firestore; label is shown in UI.
 */
export const PAYMENT_TERMS = [
  { value: 'cash', label: 'Cash' },
  { value: '30_days', label: '30-Day Payment' },
  { value: '60_days', label: '60-Day Payment' },
  { value: '90_days', label: '90-Day Payment' },
  { value: 'lc', label: 'Letter of Credit (LC)' },
  { value: 'dap', label: 'Documents Against Payment' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Deal Units
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unit options for quantity in offers
 * Distinct from UNECE product units — these are negotiation-specific trade units.
 */
export const DEAL_UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ton', label: 'Ton' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'metre', label: 'Metre' },
  { value: 'm2', label: 'm\u00b2' },
  { value: 'containers', label: 'Containers' },
];

/**
 * Maps UNECE product unit codes to DEAL_UNITS values.
 * Used when pre-filling the deal form from product data.
 * Products use UNECE codes (KGM, TNE, PCE); deals use simplified values (kg, ton, pieces).
 */
export const UNECE_TO_DEAL_UNIT = {
  KGM: 'kg',
  GRM: 'kg',      // Gram -> closest deal unit is kg
  TNE: 'ton',
  LBR: 'kg',      // Pound -> closest deal unit is kg
  PCE: 'pieces',
  SET: 'pieces',   // Set -> closest is pieces
  PR: 'pieces',    // Pair -> closest is pieces
  DZN: 'pieces',   // Dozen -> closest is pieces
  GRO: 'pieces',   // Gross -> closest is pieces
  KIT: 'pieces',   // Kit -> closest is pieces
  MTR: 'metre',
  CMT: 'metre',    // Centimeter -> closest is metre
  MMT: 'metre',    // Millimeter -> closest is metre
  FOT: 'metre',    // Foot -> closest is metre
  INH: 'metre',    // Inch -> closest is metre
  MTK: 'm2',
  CMK: 'm2',       // Square centimeter -> closest is m2
  CH: 'containers',
  CT: 'containers', // Carton -> closest is containers
  PX: 'containers', // Pallet -> closest is containers
  PK: 'containers', // Package -> closest is containers
};

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Preference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insurance preference enum
 * Determines who is responsible for cargo insurance under the Incoterm.
 * Auto-set based on the selected Incoterm's insuranceDefault field.
 */
export const INSURANCE_PREFERENCE = {
  SELLER_PROVIDES: 'seller_provides',
  BUYER_PROVIDES: 'buyer_provides',
  NONE: 'none',
};

// ─────────────────────────────────────────────────────────────────────────────
// Expiry Default
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default offer expiry window in hours (72h = 3 days)
 * Sender can override this when submitting an offer.
 */
export const EXPIRY_DEFAULT_HOURS = 72;

// ─────────────────────────────────────────────────────────────────────────────
// State Machine Transition Maps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid deal status transitions
 * Maps each current status to the set of statuses it may transition into.
 * Enforced server-side in Cloud Functions via runTransaction guards.
 *
 * @type {Record<string, string[]>}
 */
export const VALID_DEAL_TRANSITIONS = {
  [DEAL_STATUS.NEGOTIATING]: [
    DEAL_STATUS.ACCEPTED,
    DEAL_STATUS.REJECTED,
    DEAL_STATUS.EXPIRED,
    DEAL_STATUS.WITHDRAWN,
  ],
  // ACCEPTED is transitional — contract approval process begins
  [DEAL_STATUS.ACCEPTED]: [DEAL_STATUS.CONTRACT_APPROVED],
  // Terminal states — no further transitions allowed in negotiation flow
  // (CONTRACT_APPROVED is a gateway for Phase 4 logistics/insurance)
  [DEAL_STATUS.CONTRACT_APPROVED]: [],
  [DEAL_STATUS.REJECTED]: [],
  [DEAL_STATUS.EXPIRED]: [],
  [DEAL_STATUS.WITHDRAWN]: [],
};

/**
 * Valid offer status transitions
 * Maps each current offer status to allowed next statuses.
 * Enforced server-side in Cloud Functions.
 *
 * @type {Record<string, string[]>}
 */
export const VALID_OFFER_TRANSITIONS = {
  [OFFER_STATUS.OPEN]: [
    OFFER_STATUS.COUNTERED,
    OFFER_STATUS.ACCEPTED,
    OFFER_STATUS.REJECTED,
    OFFER_STATUS.EXPIRED,
    OFFER_STATUS.WITHDRAWN,
  ],
  // Terminal states — no further transitions allowed
  [OFFER_STATUS.COUNTERED]: [],
  [OFFER_STATUS.ACCEPTED]: [],
  [OFFER_STATUS.REJECTED]: [],
  [OFFER_STATUS.EXPIRED]: [],
  [OFFER_STATUS.WITHDRAWN]: [],
};

export default {
  DEAL_STATUS,
  OFFER_STATUS,
  PAYMENT_TERMS,
  DEAL_UNITS,
  UNECE_TO_DEAL_UNIT,
  INSURANCE_PREFERENCE,
  EXPIRY_DEFAULT_HOURS,
  VALID_DEAL_TRANSITIONS,
  VALID_OFFER_TRANSITIONS,
};

