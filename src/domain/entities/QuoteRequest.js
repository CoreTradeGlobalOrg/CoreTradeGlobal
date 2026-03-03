/**
 * QuoteRequest Entity
 *
 * Represents a single quote request sent to a specific provider for a deal.
 * One document is created per provider per deal when a deal reaches contract_approved.
 *
 * Firestore structure: quoteRequests/{requestId}
 * Provider quotes are stored in: quoteRequests/{requestId}/providerQuotes/{quoteId}
 *
 * Follows the same pattern as Deal.js and Contract.js entities.
 */

import { QUOTE_REQUEST_STATUS } from '@/core/constants/quoteConstants';

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

export class QuoteRequest {
  /**
   * Constructor
   * @param {string} id - Document ID
   * @param {string} dealId - Parent deal ID
   * @param {string} providerUid - UID of the provider receiving this request
   * @param {'insurance'|'logistics'} providerType - Type of provider
   * @param {Object} dealSnapshot - Denormalized deal info (logistics version never includes price)
   * @param {string} buyerId - UID of the deal buyer (denormalized)
   * @param {string} sellerId - UID of the deal seller (denormalized)
   * @param {string} status - QUOTE_REQUEST_STATUS enum value
   * @param {Date|null} deadline - Provider response deadline (createdAt + 72h)
   * @param {Date|null} createdAt - Creation timestamp
   * @param {Date|null} updatedAt - Last update timestamp
   */
  constructor(
    id,
    dealId,
    providerUid,
    providerType,
    dealSnapshot,
    buyerId,
    sellerId,
    status,
    deadline,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.dealId = dealId;
    this.providerUid = providerUid;
    this.providerType = providerType || 'insurance';
    this.dealSnapshot = dealSnapshot || {};
    this.buyerId = buyerId;
    this.sellerId = sellerId;
    this.status = status || QUOTE_REQUEST_STATUS.PENDING;
    this.deadline = deadline || null;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create QuoteRequest from Firestore document data.
   * Converts Firestore Timestamps to JS Dates.
   * @param {Object} data - Firestore document data (with id field)
   * @returns {QuoteRequest}
   */
  static fromFirestore(data) {
    return new QuoteRequest(
      data.id,
      data.dealId,
      data.providerUid,
      normalizeProviderType(data.providerType),
      data.dealSnapshot || {},
      data.buyerId,
      data.sellerId,
      data.status,
      data.deadline?.toDate?.() || data.deadline || null,
      data.createdAt?.toDate?.() || data.createdAt || new Date(),
      data.updatedAt?.toDate?.() || data.updatedAt || new Date()
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if provider has not yet responded to this request.
   * @returns {boolean}
   */
  isPending() {
    return this.status === QUOTE_REQUEST_STATUS.PENDING;
  }

  /**
   * Check if provider has submitted a quote.
   * @returns {boolean}
   */
  isQuoted() {
    return this.status === QUOTE_REQUEST_STATUS.QUOTED;
  }

  /**
   * Check if provider declined this request.
   * @returns {boolean}
   */
  isDeclined() {
    return this.status === QUOTE_REQUEST_STATUS.DECLINED;
  }

  /**
   * Check if the buyer selected this provider's quote.
   * @returns {boolean}
   */
  isSelected() {
    return this.status === QUOTE_REQUEST_STATUS.SELECTED;
  }

  /**
   * Check if the response deadline has passed.
   * Note: Client-side check only — server enforces authoritatively.
   * @returns {boolean}
   */
  isExpiredDeadline() {
    if (!this.deadline) return false;
    return Date.now() > this.deadline.getTime();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Kanban helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Derive the kanban column this request belongs to on the provider dashboard.
   *
   * Column mapping:
   *   pending           → 'newRequests'
   *   quoted            → 'quoted'
   *   declined          → 'declined'
   *   selected          → 'selected'
   *   not_selected      → 'selected' (shown in selected column as not-winning)
   *
   * @returns {'newRequests'|'quoted'|'declined'|'selected'}
   */
  getKanbanColumn() {
    switch (this.status) {
      case QUOTE_REQUEST_STATUS.PENDING:
        return 'newRequests';
      case QUOTE_REQUEST_STATUS.QUOTED:
        return 'quoted';
      case QUOTE_REQUEST_STATUS.DECLINED:
        return 'declined';
      case QUOTE_REQUEST_STATUS.SELECTED:
      case QUOTE_REQUEST_STATUS.NOT_SELECTED:
        return 'selected';
      default:
        return 'newRequests';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Provider type helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if this is an insurance quote request.
   * @returns {boolean}
   */
  isInsurance() {
    return this.providerType === 'insurance';
  }

  /**
   * Check if this is a logistics quote request.
   * @returns {boolean}
   */
  isLogistics() {
    return this.providerType === 'logistics';
  }
}

export default QuoteRequest;
