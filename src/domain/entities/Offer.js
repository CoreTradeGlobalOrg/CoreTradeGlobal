/**
 * Offer Entity
 *
 * Represents a single offer or counter-offer within a deal negotiation.
 * Stored in the subcollection: deals/{dealId}/offers/{offerId}
 *
 * Follows the same pattern as Deal.js, Product.js, and Conversation.js.
 */

import { OFFER_STATUS } from '@/core/constants/dealConstants';

export class Offer {
  /**
   * Constructor
   * @param {string} id - Offer ID (Firestore document ID)
   * @param {number} round - Round number (1, 2, 3, ...)
   * @param {string} submittedBy - UID of the party who submitted this offer
   * @param {string} role - Role at submission time ('buyer' | 'seller')
   * @param {number} price - Price per unit
   * @param {number} quantity - Quantity
   * @param {string} unit - Unit of measure
   * @param {string} currency - ISO 4217 currency code
   * @param {number|null} conversionRate - Exchange rate (if offer currency differs from product base)
   * @param {string} incoterm - Incoterm 2020 code
   * @param {string} namedPlace - Named place (port, city, address)
   * @param {Date|null} deliveryDeadline - Requested delivery date
   * @param {string} paymentTerms - Payment terms key
   * @param {string} insurancePreference - Insurance responsibility
   * @param {string|null} notes - Optional freeform notes
   * @param {Array} attachments - File attachments [{ name, url, size }]
   * @param {string} status - Offer status (OFFER_STATUS enum)
   * @param {Date|null} expiresAt - Offer expiry timestamp
   * @param {number} estimatedTotal - Computed: price * quantity
   * @param {Date|null} createdAt - Creation timestamp
   * @param {Date|null} updatedAt - Last update timestamp
   */
  constructor(
    id,
    round,
    submittedBy,
    role,
    price,
    quantity,
    unit,
    currency,
    conversionRate,
    incoterm,
    namedPlace,
    deliveryDeadline,
    paymentTerms,
    insurancePreference,
    notes,
    attachments,
    status,
    expiresAt,
    estimatedTotal,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.round = round || 1;
    this.submittedBy = submittedBy;
    this.role = role;
    this.price = price || 0;
    this.quantity = quantity || 0;
    this.unit = unit || '';
    this.currency = currency || 'USD';
    this.conversionRate = conversionRate || null;
    this.incoterm = incoterm || '';
    this.namedPlace = namedPlace || '';
    this.deliveryDeadline = deliveryDeadline || null;
    this.paymentTerms = paymentTerms || '';
    this.insurancePreference = insurancePreference || '';
    this.notes = notes || null;
    this.attachments = attachments || [];
    this.status = status || OFFER_STATUS.OPEN;
    this.expiresAt = expiresAt || null;
    this.estimatedTotal = estimatedTotal || 0;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Offer from Firestore document snapshot
   * @param {Object} data - Firestore document data (with id field)
   * @returns {Offer}
   */
  static fromFirestore(data) {
    return new Offer(
      data.id,
      data.round,
      data.submittedBy,
      data.role,
      data.price,
      data.quantity,
      data.unit,
      data.currency,
      data.conversionRate || null,
      data.incoterm,
      data.namedPlace,
      data.deliveryDeadline?.toDate?.() || data.deliveryDeadline || null,
      data.paymentTerms,
      data.insurancePreference,
      data.notes || null,
      data.attachments || [],
      data.status,
      data.expiresAt?.toDate?.() || data.expiresAt || null,
      data.estimatedTotal,
      data.createdAt?.toDate?.() || data.createdAt || new Date(),
      data.updatedAt?.toDate?.() || data.updatedAt || new Date()
    );
  }

  /**
   * Convert Offer to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      round: this.round,
      submittedBy: this.submittedBy,
      role: this.role,
      price: this.price,
      quantity: this.quantity,
      unit: this.unit,
      currency: this.currency,
      conversionRate: this.conversionRate,
      incoterm: this.incoterm,
      namedPlace: this.namedPlace,
      deliveryDeadline: this.deliveryDeadline,
      paymentTerms: this.paymentTerms,
      insurancePreference: this.insurancePreference,
      notes: this.notes,
      attachments: this.attachments,
      status: this.status,
      expiresAt: this.expiresAt,
      estimatedTotal: this.estimatedTotal,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if offer is currently open (awaiting response)
   * @returns {boolean}
   */
  isOpen() {
    return this.status === OFFER_STATUS.OPEN;
  }

  /**
   * Check if offer has passed its expiry timestamp
   * @returns {boolean}
   */
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Get a human-readable string for time since submission
   * e.g. "2 hours ago", "5 days ago"
   * @returns {string}
   */
  getTimeSinceSubmission() {
    const now = new Date();
    const submitted = this.createdAt instanceof Date ? this.createdAt : new Date(this.createdAt);
    const diffMs = now - submitted;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

export default Offer;
