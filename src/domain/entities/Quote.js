/**
 * Quote Entity
 *
 * Represents a quote submitted by a provider in response to a QuoteRequest.
 * Covers both insurance and logistics quote types — type-specific fields are
 * null for the non-applicable type.
 *
 * Firestore structure: quoteRequests/{requestId}/providerQuotes/{quoteId}
 * NOTE: subcollection is named `providerQuotes` (not `quotes`) to avoid
 * collision with the existing `requests/{id}/quotes` subcollection.
 * See Research Pitfall 7.
 *
 * Follows the same pattern as Deal.js and Contract.js entities.
 */

import { QUOTE_STATUS } from '@/core/constants/quoteConstants';

/**
 * Normalize providerType from Firestore.
 * Old documents store 'insurance_provider'/'logistics_provider' (the user role),
 * but the frontend expects short-form 'insurance'/'logistics'.
 */
function normalizeProviderType(raw) {
  if (raw === 'insurance_provider') return 'insurance';
  if (raw === 'logistics_provider') return 'logistics';
  return raw; // already short-form or unknown
}

export class Quote {
  /**
   * Constructor
   * @param {string} id - Document ID
   * @param {string} requestId - Parent QuoteRequest ID
   * @param {string} dealId - Parent deal ID (denormalized for collectionGroup queries)
   * @param {string} providerUid - UID of the submitting provider
   * @param {'insurance'|'logistics'} providerType - Quote type
   *
   * Insurance-specific fields (null for logistics):
   * @param {string|null} iccCoverage - 'A' | 'B' | 'C' (ICC coverage type)
   * @param {boolean|null} warClause - War clause included
   * @param {boolean|null} strikesClause - Strikes clause included
   * @param {number|null} premiumAmount - Insurance premium
   * @param {number|null} coverageAmount - Total coverage value
   * @param {number|null} deductiblePct - Deductible/franchise percentage
   * @param {number|null} claimsPaymentDays - Claims payment period in business days
   * @param {Date|null} policyStartDate - Policy coverage start
   * @param {Date|null} policyEndDate - Policy coverage end
   * @param {string|null} coverageScope - 'warehouse_to_warehouse' | 'port_to_port' | 'door_to_door'
   * @param {string|null} certificateType - Certificate type description
   *
   * Logistics-specific fields (null for insurance):
   * @param {string|null} transportMode - 'sea' | 'air' | 'road' | 'rail' | 'multimodal'
   * @param {string|null} containerType - Container type (relevant for sea freight)
   * @param {number|null} freightCost - Total freight cost
   * @param {number|null} estimatedTransitDays - Transit time in days
   * @param {Date|null} loadingDate - Expected cargo loading date
   * @param {Date|null} estimatedArrival - Expected arrival date
   * @param {string[]|null} capabilityTags - Provider service capability tags
   *
   * Shared fields:
   * @param {string} currency - Currency code (e.g. 'USD')
   * @param {string} notes - Notes or special conditions
   * @param {Date|null} validUntil - Quote validity deadline (provider-set)
   * @param {string} status - QUOTE_STATUS enum value
   * @param {Date|null} createdAt - Creation timestamp
   * @param {Date|null} updatedAt - Last update timestamp
   */
  constructor(
    id,
    requestId,
    dealId,
    providerUid,
    providerType,
    // Insurance-specific
    iccCoverage,
    warClause,
    strikesClause,
    premiumAmount,
    coverageAmount,
    deductiblePct,
    claimsPaymentDays,
    policyStartDate,
    policyEndDate,
    coverageScope,
    certificateType,
    // Logistics-specific
    transportMode,
    containerType,
    freightCost,
    estimatedTransitDays,
    loadingDate,
    estimatedArrival,
    capabilityTags,
    // Shared
    currency,
    notes,
    validUntil,
    status,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.requestId = requestId;
    this.dealId = dealId;
    this.providerUid = providerUid;
    this.providerType = providerType || 'insurance';

    // Insurance-specific (null for logistics)
    this.iccCoverage = iccCoverage || null;
    this.warClause = warClause ?? null;
    this.strikesClause = strikesClause ?? null;
    this.premiumAmount = premiumAmount ?? null;
    this.coverageAmount = coverageAmount ?? null;
    this.deductiblePct = deductiblePct ?? null;
    this.claimsPaymentDays = claimsPaymentDays ?? null;
    this.policyStartDate = policyStartDate || null;
    this.policyEndDate = policyEndDate || null;
    this.coverageScope = coverageScope || null;
    this.certificateType = certificateType || null;

    // Logistics-specific (null for insurance)
    this.transportMode = transportMode || null;
    this.containerType = containerType || null;
    this.freightCost = freightCost ?? null;
    this.estimatedTransitDays = estimatedTransitDays ?? null;
    this.loadingDate = loadingDate || null;
    this.estimatedArrival = estimatedArrival || null;
    this.capabilityTags = capabilityTags || null;

    // Phase 14: Nested risk type sub-objects (null for old quotes or logistics)
    this.cargoMarine = null;
    this.commercialRisk = null;
    this.politicalRisk = null;
    this.exclusions = null;
    this.conditionsPrecedent = null;
    this.claimsHandling = null;
    this.premiumAdditions = null;
    this.quoteStatus = null;
    this.messageToBuyer = null;

    // Shared
    this.currency = currency || 'USD';
    this.notes = notes || '';
    this.validUntil = validUntil || null;
    this.status = status || QUOTE_STATUS.ACTIVE;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Quote from Firestore document data.
   * Converts all Firestore Timestamps to JS Dates.
   * @param {Object} data - Firestore document data (with id field)
   * @returns {Quote}
   */
  static fromFirestore(data) {
    const quote = new Quote(
      data.id,
      data.requestId,
      data.dealId,
      data.providerUid,
      normalizeProviderType(data.providerType),
      // Insurance-specific
      data.iccCoverage || null,
      data.warClause ?? null,
      data.strikesClause ?? null,
      data.premiumAmount ?? null,
      data.coverageAmount ?? null,
      data.deductiblePct ?? null,
      data.claimsPaymentDays ?? null,
      data.policyStartDate?.toDate?.() || data.policyStartDate || null,
      data.policyEndDate?.toDate?.() || data.policyEndDate || null,
      data.coverageScope || null,
      data.certificateType || null,
      // Logistics-specific
      data.transportMode || null,
      data.containerType || null,
      data.freightCost ?? null,
      data.estimatedTransitDays ?? null,
      data.loadingDate?.toDate?.() || data.loadingDate || null,
      data.estimatedArrival?.toDate?.() || data.estimatedArrival || null,
      data.capabilityTags || null,
      // Shared
      data.currency || 'USD',
      data.notes || '',
      data.validUntil?.toDate?.() || data.validUntil || null,
      data.status,
      data.createdAt?.toDate?.() || data.createdAt || new Date(),
      data.updatedAt?.toDate?.() || data.updatedAt || new Date()
    );

    // Phase 14 nested sub-objects
    quote.cargoMarine = data.cargoMarine || null;
    quote.commercialRisk = data.commercialRisk || null;
    quote.politicalRisk = data.politicalRisk || null;
    quote.exclusions = data.exclusions || null;
    quote.conditionsPrecedent = data.conditionsPrecedent || null;
    quote.claimsHandling = data.claimsHandling || null;
    quote.premiumAdditions = data.premiumAdditions || null;
    quote.quoteStatus = data.quoteStatus || null;
    quote.messageToBuyer = data.messageToBuyer || null;

    // Backward compat: if cargoMarine exists, use its fields for legacy flat-field accessors
    // This ensures getPrice(), isInsurance(), etc. continue to work on new nested-format docs.
    if (data.cargoMarine) {
      quote.iccCoverage = data.cargoMarine.iccCoverage || quote.iccCoverage;
      quote.warClause = data.cargoMarine.warClause ?? quote.warClause;
      quote.strikesClause = data.cargoMarine.strikesClause ?? quote.strikesClause;
      quote.premiumAmount = data.cargoMarine.premiumAmount ?? quote.premiumAmount;
      quote.coverageAmount = data.cargoMarine.coverageAmount ?? quote.coverageAmount;
      quote.deductiblePct = data.cargoMarine.deductiblePct ?? quote.deductiblePct;
      quote.claimsPaymentDays = data.cargoMarine.claimsPaymentDays ?? quote.claimsPaymentDays;
      quote.policyStartDate = data.cargoMarine.policyStartDate?.toDate?.() || data.cargoMarine.policyStartDate || quote.policyStartDate;
      quote.policyEndDate = data.cargoMarine.policyEndDate?.toDate?.() || data.cargoMarine.policyEndDate || quote.policyEndDate;
      quote.coverageScope = data.cargoMarine.coverageScope || quote.coverageScope;
      quote.certificateType = data.cargoMarine.certificateType || quote.certificateType;
    }

    return quote;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Validity helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if the quote validity period has passed.
   * Note: Client-side check only — server enforces authoritatively in acceptQuote CF.
   * @returns {boolean}
   */
  isExpired() {
    if (!this.validUntil) return false;
    return Date.now() > this.validUntil.getTime();
  }

  /**
   * Check if the quote is currently active and valid for selection.
   * A quote is active when its status is 'active' AND it has not expired.
   * @returns {boolean}
   */
  isActive() {
    return this.status === QUOTE_STATUS.ACTIVE && !this.isExpired();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Provider type helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if this is an insurance quote.
   * @returns {boolean}
   */
  isInsurance() {
    return this.providerType === 'insurance';
  }

  /**
   * Check if this is a logistics quote.
   * @returns {boolean}
   */
  isLogistics() {
    return this.providerType === 'logistics';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Price helper
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the primary price figure for this quote.
   * Returns premiumAmount for insurance quotes, freightCost for logistics quotes.
   * Returns null if no price is available.
   * @returns {number|null}
   */
  getPrice() {
    if (this.isInsurance()) return this.premiumAmount;
    if (this.isLogistics()) return this.freightCost;
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 14: Quote status and risk type helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if this is a firm (binding) quote.
   * @returns {boolean}
   */
  isFirmQuote() {
    return this.quoteStatus?.status === 'firm';
  }

  /**
   * Check if this is an indicative (non-binding) quote.
   * Defaults to indicative when quoteStatus is absent (backward compat).
   * @returns {boolean}
   */
  isIndicativeQuote() {
    return !this.quoteStatus || this.quoteStatus.status === 'indicative';
  }

  /**
   * Check if this quote includes commercial risk coverage.
   * @returns {boolean}
   */
  hasCommercialRisk() {
    return !!this.commercialRisk;
  }

  /**
   * Check if this quote includes political risk coverage.
   * @returns {boolean}
   */
  hasPoliticalRisk() {
    return !!this.politicalRisk;
  }
}

export default Quote;
