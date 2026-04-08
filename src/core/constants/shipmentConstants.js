/**
 * Shipment Tracking Constants
 *
 * Enums and display labels for shipment update statuses.
 * Used by both the client-side ShipmentRepository/UI and Cloud Functions.
 *
 * Note: Cloud Functions duplicate these as plain objects since
 *       they cannot import ESM from the Next.js app.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shipment Status Enum
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shipment status enum
 * Represents discrete stages in the physical shipment lifecycle.
 * Written exclusively by Cloud Functions (submitShipmentUpdate, confirmInsuranceCoverage).
 */
export const SHIPMENT_STATUS = {
  PREPARING: 'preparing',                     // Logistics provider is preparing shipment
  PICKED_UP: 'picked_up',                     // Cargo collected from seller
  IN_TRANSIT: 'in_transit',                   // Cargo in transit to destination
  AT_CUSTOMS: 'at_customs',                   // Cargo held at customs clearance
  OUT_FOR_DELIVERY: 'out_for_delivery',       // Cargo in final delivery leg
  DELIVERED: 'delivered',                     // Cargo delivered — triggers DEAL_STATUS.DELIVERED
  COVERAGE_ACTIVE: 'coverage_active',         // Insurance provider confirmed active coverage
};

// ─────────────────────────────────────────────────────────────────────────────
// Shipment Status Labels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable display labels for each shipment status.
 * Used in timeline UI, status badges, and notification copy.
 *
 * @type {Record<string, string>}
 */
export const SHIPMENT_STATUS_LABELS = {
  [SHIPMENT_STATUS.PREPARING]: 'Preparing',
  [SHIPMENT_STATUS.PICKED_UP]: 'Picked Up',
  [SHIPMENT_STATUS.IN_TRANSIT]: 'In Transit',
  [SHIPMENT_STATUS.AT_CUSTOMS]: 'At Customs',
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [SHIPMENT_STATUS.DELIVERED]: 'Delivered',
  [SHIPMENT_STATUS.COVERAGE_ACTIVE]: 'Coverage Active',
};

export default {
  SHIPMENT_STATUS,
  SHIPMENT_STATUS_LABELS,
};
