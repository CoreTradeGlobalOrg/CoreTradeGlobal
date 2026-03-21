/**
 * LegalEngagement Entity
 *
 * Represents a legal consulting engagement between a client (deal participant)
 * and a lawyer on the platform.
 *
 * Firestore structure: legalEngagements/{engagementId}
 * Subcollections:
 *   - legalMessages/{messageId}
 *   - contractDrafts/{draftId}
 *   - riskItems/{riskId}
 *
 * Security: Only clientId and lawyerId (participants array) may access this document.
 * Writes are exclusively via Cloud Functions (Admin SDK).
 */

import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';

export class LegalEngagement {
  /**
   * Constructor
   * @param {string} id - Engagement ID (Firestore document ID)
   * @param {string} clientId - UID of the client (deal participant seeking legal advice)
   * @param {string} lawyerId - UID of the assigned lawyer
   * @param {string} dealId - Parent deal ID this engagement is linked to
   * @param {string[]} participants - Array containing [clientId, lawyerId] — used for Firestore security rules
   * @param {string} dealProductName - Denormalized product name from the deal
   * @param {string} clientDisplayName - Denormalized display name of the client
   * @param {string} lawyerDisplayName - Denormalized display name of the lawyer
   * @param {string} status - Engagement status (ENGAGEMENT_STATUS enum)
   * @param {Date|null} createdAt - Creation timestamp
   * @param {Date|null} updatedAt - Last update timestamp
   * @param {Date|null} reviewedAt - When the client reviewed the lawyer (null if not yet reviewed)
   */
  constructor(
    id,
    clientId,
    lawyerId,
    dealId,
    participants,
    dealProductName,
    clientDisplayName,
    lawyerDisplayName,
    status,
    createdAt,
    updatedAt,
    reviewedAt
  ) {
    this.id = id;
    this.clientId = clientId;
    this.lawyerId = lawyerId;
    this.dealId = dealId;
    this.participants = participants || [clientId, lawyerId].filter(Boolean);
    this.dealProductName = dealProductName || '';
    this.clientDisplayName = clientDisplayName || '';
    this.lawyerDisplayName = lawyerDisplayName || '';
    this.status = status || ENGAGEMENT_STATUS.PENDING;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.reviewedAt = reviewedAt || null;
  }

  /**
   * Create a LegalEngagement from a Firestore document snapshot or plain data object.
   * Converts Firestore Timestamps to JavaScript Dates using .toDate?.() pattern.
   *
   * @param {Object} data - Firestore document data (with id field)
   * @returns {LegalEngagement}
   */
  static fromFirestore(data) {
    return new LegalEngagement(
      data.id,
      data.clientId,
      data.lawyerId,
      data.dealId,
      data.participants,
      data.dealProductName,
      data.clientDisplayName,
      data.lawyerDisplayName,
      data.status,
      data.createdAt?.toDate?.() || data.createdAt || null,
      data.updatedAt?.toDate?.() || data.updatedAt || null,
      data.reviewedAt?.toDate?.() || data.reviewedAt || null
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if the engagement is currently active (both parties can send messages).
   * @returns {boolean}
   */
  isActive() {
    return this.status === ENGAGEMENT_STATUS.ACTIVE;
  }

  /**
   * Check if the engagement is pending (lawyer not yet assigned or accepted).
   * @returns {boolean}
   */
  isPending() {
    return this.status === ENGAGEMENT_STATUS.PENDING;
  }

  /**
   * Check if the engagement has been completed (closed by either party or Cloud Function).
   * @returns {boolean}
   */
  isCompleted() {
    return this.status === ENGAGEMENT_STATUS.COMPLETED;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Participant helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if a user is a participant in this engagement (client or lawyer).
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isParticipant(uid) {
    return this.participants.includes(uid);
  }

  /**
   * Check if a user is the lawyer in this engagement.
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isLawyer(uid) {
    return this.lawyerId === uid;
  }

  /**
   * Check if a user is the client in this engagement.
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isClient(uid) {
    return this.clientId === uid;
  }
}

export default LegalEngagement;
