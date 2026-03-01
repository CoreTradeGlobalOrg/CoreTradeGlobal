/**
 * Deal Entity
 *
 * Represents a deal negotiation between a buyer and seller.
 * Follows the same pattern as Product.js and Conversation.js.
 *
 * Firestore structure: deals/{dealId}
 * Offers are stored in subcollection: deals/{dealId}/offers/{offerId}
 */

import { DEAL_STATUS } from '@/core/constants/dealConstants';

export class Deal {
  /**
   * Constructor
   * @param {string} id - Deal ID (Firestore document ID)
   * @param {string} buyerId - UID of the buyer
   * @param {string} sellerId - UID of the seller (product owner)
   * @param {string} initiatedBy - UID of the party who created the deal
   * @param {string} productId - Product being negotiated
   * @param {string} productName - Denormalized product name
   * @param {string|null} productImage - Denormalized product image URL
   * @param {string|null} productCategory - Denormalized product category
   * @param {string} conversationId - Originating chat conversation ID
   * @param {string} status - Deal status (DEAL_STATUS enum)
   * @param {string} currentTurnUid - UID of the party who must respond next
   * @param {number} round - Current round number (starts at 1)
   * @param {Object|null} latestOfferSnapshot - Denormalized latest offer terms for list page
   * @param {Date|null} createdAt - Creation timestamp
   * @param {Date|null} updatedAt - Last update timestamp
   */
  constructor(
    id,
    buyerId,
    sellerId,
    initiatedBy,
    productId,
    productName,
    productImage,
    productCategory,
    conversationId,
    status,
    currentTurnUid,
    round,
    latestOfferSnapshot,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.buyerId = buyerId;
    this.sellerId = sellerId;
    this.initiatedBy = initiatedBy;
    this.productId = productId;
    this.productName = productName || '';
    this.productImage = productImage || null;
    this.productCategory = productCategory || null;
    this.conversationId = conversationId;
    this.status = status || DEAL_STATUS.NEGOTIATING;
    this.currentTurnUid = currentTurnUid;
    this.round = round || 1;
    this.latestOfferSnapshot = latestOfferSnapshot || null;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Deal from Firestore document snapshot
   * @param {Object} data - Firestore document data (with id field)
   * @returns {Deal}
   */
  static fromFirestore(data) {
    return new Deal(
      data.id,
      data.buyerId,
      data.sellerId,
      data.initiatedBy,
      data.productId,
      data.productName,
      data.productImage,
      data.productCategory,
      data.conversationId,
      data.status,
      data.currentTurnUid,
      data.round,
      data.latestOfferSnapshot
        ? {
            ...data.latestOfferSnapshot,
            expiresAt: data.latestOfferSnapshot.expiresAt?.toDate?.()
              || data.latestOfferSnapshot.expiresAt,
          }
        : null,
      data.createdAt?.toDate?.() || data.createdAt || new Date(),
      data.updatedAt?.toDate?.() || data.updatedAt || new Date()
    );
  }

  /**
   * Convert Deal to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      buyerId: this.buyerId,
      sellerId: this.sellerId,
      initiatedBy: this.initiatedBy,
      productId: this.productId,
      productName: this.productName,
      productImage: this.productImage,
      productCategory: this.productCategory,
      conversationId: this.conversationId,
      status: this.status,
      currentTurnUid: this.currentTurnUid,
      round: this.round,
      latestOfferSnapshot: this.latestOfferSnapshot,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if deal is currently in negotiation
   * @returns {boolean}
   */
  isNegotiating() {
    return this.status === DEAL_STATUS.NEGOTIATING;
  }

  /**
   * Check if deal has been accepted by both parties
   * @returns {boolean}
   */
  isAccepted() {
    return this.status === DEAL_STATUS.ACCEPTED;
  }

  /**
   * Check if deal is in a terminal state (no further actions possible in negotiation)
   * Terminal = contract_approved, rejected, expired, or withdrawn.
   * NOTE: ACCEPTED is now transitional (awaiting contract approval), not terminal.
   * @returns {boolean}
   */
  isTerminal() {
    return [
      DEAL_STATUS.CONTRACT_APPROVED,
      DEAL_STATUS.REJECTED,
      DEAL_STATUS.EXPIRED,
      DEAL_STATUS.WITHDRAWN,
    ].includes(this.status);
  }

  /**
   * Check if deal has been accepted but is awaiting contract approval.
   * This is a transitional state — contract generation is in progress.
   * @returns {boolean}
   */
  isAcceptedAwaitingContract() {
    return this.status === DEAL_STATUS.ACCEPTED;
  }

  /**
   * Check if deal has been fully approved via contract signing by both parties.
   * @returns {boolean}
   */
  isContractApproved() {
    return this.status === DEAL_STATUS.CONTRACT_APPROVED;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Participant helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if a user is a participant in this deal (buyer or seller)
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isParticipant(uid) {
    return this.buyerId === uid || this.sellerId === uid;
  }

  /**
   * Check if a user is the buyer in this deal
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isBuyer(uid) {
    return this.buyerId === uid;
  }

  /**
   * Check if a user is the seller in this deal
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isSeller(uid) {
    return this.sellerId === uid;
  }

  /**
   * Check if it is currently this user's turn to respond
   * Used to show/hide the counter-offer form
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isCurrentTurn(uid) {
    return this.currentTurnUid === uid;
  }
}

export default Deal;
