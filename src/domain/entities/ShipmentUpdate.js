/**
 * ShipmentUpdate Entity
 *
 * Represents a single update event in the shipment tracking timeline for a deal.
 * Stored in: deals/{dealId}/shipmentTracking/{updateId}
 *
 * All writes are performed exclusively by Cloud Functions (submitShipmentUpdate,
 * confirmInsuranceCoverage). Client reads are allowed only to deal parties.
 *
 * Follows the same pattern as Deal.js and Quote.js.
 */

import { SHIPMENT_STATUS } from '@/core/constants/shipmentConstants';

export class ShipmentUpdate {
  /**
   * Constructor
   * @param {string} id - Firestore document ID
   * @param {string} dealId - Parent deal ID
   * @param {string} status - SHIPMENT_STATUS enum value
   * @param {Date|null} timestamp - When this update was recorded
   * @param {string} actorId - UID of the provider who submitted this update
   * @param {string} actorName - Display name / company name of the actor
   * @param {'logistics'|'insurance'} providerType - Type of provider submitting this update
   * @param {string|null} note - Optional free-text note from the provider
   * @param {string|null} containerNumber - Container / vehicle reference number
   * @param {string|null} trackingRef - External carrier tracking reference
   * @param {Date|null} etaDate - Estimated time of arrival
   * @param {string} dealBuyerId - Denormalized buyer UID for Firestore rule access checks
   * @param {string} dealSellerId - Denormalized seller UID for Firestore rule access checks
   */
  constructor(
    id,
    dealId,
    status,
    timestamp,
    actorId,
    actorName,
    providerType,
    note,
    containerNumber,
    trackingRef,
    etaDate,
    dealBuyerId,
    dealSellerId
  ) {
    this.id = id;
    this.dealId = dealId || null;
    this.status = status;
    this.timestamp = timestamp || null;
    this.actorId = actorId;
    this.actorName = actorName || '';
    this.providerType = providerType || 'logistics';
    this.note = note || null;
    this.containerNumber = containerNumber || null;
    this.trackingRef = trackingRef || null;
    this.etaDate = etaDate || null;
    this.dealBuyerId = dealBuyerId || null;
    this.dealSellerId = dealSellerId || null;
  }

  /**
   * Create ShipmentUpdate from a Firestore document snapshot.
   * Converts Firestore Timestamps to JavaScript Date objects.
   *
   * @param {Object} data - Firestore document data with id field added
   * @returns {ShipmentUpdate}
   */
  static fromFirestore(data) {
    return new ShipmentUpdate(
      data.id,
      data.dealId || null,
      data.status,
      data.timestamp?.toDate?.() || data.timestamp || null,
      data.actorId,
      data.actorName,
      data.providerType,
      data.note || null,
      data.containerNumber || null,
      data.trackingRef || null,
      data.etaDate?.toDate?.() || data.etaDate || null,
      data.dealBuyerId || null,
      data.dealSellerId || null
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Provider type helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns true if this update was submitted by a logistics provider.
   * @returns {boolean}
   */
  isLogistics() {
    return this.providerType === 'logistics';
  }

  /**
   * Returns true if this update was submitted by an insurance provider.
   * @returns {boolean}
   */
  isInsurance() {
    return this.providerType === 'insurance';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns true if this update marks the shipment as delivered.
   * When true, the deal status should also transition to DEAL_STATUS.DELIVERED.
   * @returns {boolean}
   */
  isDelivered() {
    return this.status === SHIPMENT_STATUS.DELIVERED;
  }

  /**
   * Returns true if this update confirms active insurance coverage.
   * @returns {boolean}
   */
  isCoverageActive() {
    return this.status === SHIPMENT_STATUS.COVERAGE_ACTIVE;
  }
}

export default ShipmentUpdate;
