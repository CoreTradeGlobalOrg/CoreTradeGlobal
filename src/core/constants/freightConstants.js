/**
 * Freight Constants for Phase 8 Freight Intelligence
 *
 * Powers the FreightEstimatorWidget in DealSidebar using the Freightos
 * public shipping calculator API.
 *
 * INTEL-04 note: The Freightos API is called client-side directly to avoid
 * server-side rate limiting. A proxy fallback exists at /api/freight/estimate
 * for CORS-blocked environments, but client-side calls are strongly preferred.
 */

/** Freightos public shipping calculator base URL */
export const FREIGHTOS_BASE_URL = 'https://ship.freightos.com/api/shippingCalculator';

/**
 * CORS proxy fallback URL — Next.js API route that forwards to Freightos server-side.
 * Only used when direct client fetch fails with a TypeError (CORS blocked).
 * See: /api/freight/estimate/route.js
 */
export const FREIGHTOS_PROXY_URL = '/api/freight/estimate';

/**
 * Freightos load type constants.
 * Used as the `loadtype` query parameter in the shipping calculator API.
 */
export const FREIGHTOS_LOADTYPES = {
  BOXES: 'boxes',
  PALLETS: 'pallets',
  CONTAINER_20: 'container20',
  CONTAINER_40: 'container40',
  CONTAINER_40HC: 'container40HC',
};

/**
 * Transport modes returned by the Freightos API.
 * icon is the lucide-react icon name string — resolved in the widget component.
 *
 * Keys match the mode identifiers used in Freightos API responses.
 */
export const TRANSPORT_MODES = [
  { key: 'FCL',  label: 'Sea (FCL)',     icon: 'Ship'  },
  { key: 'LCL',  label: 'Sea (LCL)',     icon: 'Ship'  },
  { key: 'air',  label: 'Air Freight',   icon: 'Plane' },
  { key: 'LTL',  label: 'Road (LTL)',    icon: 'Truck' },
  { key: 'FTL',  label: 'Road (FTL)',    icon: 'Truck' },
];

/**
 * Calculate chargeable weight using the volumetric weight formula.
 * Chargeable weight = higher of actual weight vs volumetric weight.
 * Volumetric divisor: 5000 cm³/kg (industry standard for air/road; sea is different
 * but Freightos handles mode-specific divisors internally).
 *
 * @param {number} actualKg - Actual shipment weight in kilograms
 * @param {number|null} [lengthCm] - Package length in centimetres
 * @param {number|null} [widthCm] - Package width in centimetres
 * @param {number|null} [heightCm] - Package height in centimetres
 * @returns {number} Chargeable weight in kilograms
 */
export function getChargeableWeight(actualKg, lengthCm, widthCm, heightCm) {
  if (
    lengthCm == null || widthCm == null || heightCm == null ||
    isNaN(lengthCm) || isNaN(widthCm) || isNaN(heightCm)
  ) {
    return actualKg;
  }
  const volumetricKg = (lengthCm * widthCm * heightCm) / 5000;
  return Math.max(actualKg, volumetricKg);
}

/**
 * Suggest a Freightos load type based on shipment weight.
 * Heuristic only — users cannot manually override in the widget.
 *
 * @param {number} weightKg - Chargeable weight in kilograms
 * @returns {string} One of the FREIGHTOS_LOADTYPES values
 */
export function suggestLoadType(weightKg) {
  if (weightKg < 100) return FREIGHTOS_LOADTYPES.BOXES;
  if (weightKg <= 1000) return FREIGHTOS_LOADTYPES.PALLETS;
  return FREIGHTOS_LOADTYPES.CONTAINER_20;
}
