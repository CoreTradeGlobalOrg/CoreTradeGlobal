/**
 * LegalMessage Entity
 *
 * Represents a message in a legal engagement channel.
 * Supports four message types: text, attachment, system, quick_action.
 *
 * Firestore structure: legalEngagements/{engagementId}/legalMessages/{messageId}
 *
 * Security: Only engagement participants (clientId and lawyerId) may read/create messages.
 * Messages are immutable — no update or delete is permitted by rules.
 */

import { LEGAL_MESSAGE_TYPE } from '@/core/constants/legalConstants';

export class LegalMessage {
  /**
   * Constructor
   * @param {string} id - Message ID (Firestore document ID)
   * @param {string} senderId - UID of the sender
   * @param {string} senderName - Display name of the sender (denormalized)
   * @param {string} content - Message text content
   * @param {string} type - Message type (LEGAL_MESSAGE_TYPE enum)
   * @param {Object|null} quickAction - Quick action data: { action, label } or null
   * @param {Array<{url: string, name: string, type: string, size: number, storagePath: string}>|null} attachments
   *   - Array of attachment objects or null
   * @param {Date|null} createdAt - Creation timestamp
   */
  constructor(
    id,
    senderId,
    senderName,
    content,
    type,
    quickAction,
    attachments,
    createdAt
  ) {
    this.id = id;
    this.senderId = senderId;
    this.senderName = senderName || '';
    this.content = content || '';
    this.type = type || LEGAL_MESSAGE_TYPE.TEXT;
    this.quickAction = quickAction || null;
    this.attachments = attachments || null;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Create a LegalMessage from a Firestore document snapshot or plain data object.
   * Converts Firestore Timestamps to JavaScript Dates using .toDate?.() pattern.
   *
   * @param {Object} data - Firestore document data (with id field)
   * @returns {LegalMessage}
   */
  static fromFirestore(data) {
    return new LegalMessage(
      data.id,
      data.senderId,
      data.senderName,
      data.content,
      data.type,
      data.quickAction || null,
      data.attachments || null,
      data.createdAt?.toDate?.() || data.createdAt || null
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Type helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if the message is a system-generated notification (e.g., engagement created).
   * System messages have no sender and are displayed differently in the UI.
   * @returns {boolean}
   */
  isSystem() {
    return this.type === LEGAL_MESSAGE_TYPE.SYSTEM;
  }

  /**
   * Check if the message is a quick action (structured button interaction).
   * Quick action messages contain a quickAction object with { action, label }.
   * @returns {boolean}
   */
  isQuickAction() {
    return this.type === LEGAL_MESSAGE_TYPE.QUICK_ACTION;
  }

  /**
   * Check if the message is an attachment message.
   * Attachment messages contain an attachments array with file metadata.
   * @returns {boolean}
   */
  isAttachment() {
    return this.type === LEGAL_MESSAGE_TYPE.ATTACHMENT;
  }

  /**
   * Check if the message was sent by the given user.
   * Used in the UI to determine message alignment (sent vs received).
   * @param {string} uid - User ID to check
   * @returns {boolean}
   */
  isOwn(uid) {
    return this.senderId === uid;
  }
}

export default LegalMessage;
