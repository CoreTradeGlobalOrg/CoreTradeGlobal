/**
 * Message Entity
 *
 * Represents a single message in a conversation
 * Used in the messaging subcollection: conversations/{id}/messages
 */

export class Message {
  /**
   * Constructor
   * @param {string} id - Message ID
   * @param {string} conversationId - Parent conversation ID
   * @param {string} senderId - Sender's user ID (or 'anonymous' for anonymous contact)
   * @param {string} senderName - Sender's display name
   * @param {string} content - Message content
   * @param {string} type - Message type: 'text' | 'contact_inquiry'
   * @param {Object} metadata - Additional metadata (subject, contactEmail, etc.)
   * @param {Array<string>} readBy - Array of user IDs who have read this message
   * @param {Date} createdAt - Creation timestamp
   */
  constructor(
    id,
    conversationId,
    senderId,
    senderName,
    content,
    type = 'text',
    metadata = {},
    readBy = [],
    createdAt = null
  ) {
    this.id = id;
    this.conversationId = conversationId;
    this.senderId = senderId;
    this.senderName = senderName;
    this.content = content;
    this.type = type;
    this.metadata = metadata;
    this.readBy = readBy;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Create Message from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Message}
   */
  static fromFirestore(data) {
    return new Message(
      data.id,
      data.conversationId,
      data.senderId,
      data.senderName,
      data.content,
      data.type || 'text',
      data.metadata || {},
      data.readBy || [],
      data.createdAt?.toDate?.() || data.createdAt || new Date()
    );
  }

  /**
   * Convert Message to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      conversationId: this.conversationId,
      senderId: this.senderId,
      senderName: this.senderName,
      content: this.content,
      type: this.type,
      metadata: this.metadata,
      readBy: this.readBy,
    };
  }

  /**
   * Check if this is a contact inquiry message
   * @returns {boolean}
   */
  isContactInquiry() {
    return this.type === 'contact_inquiry';
  }

  /**
   * Check if message has been read by a specific user
   * @param {string} userId
   * @returns {boolean}
   */
  isReadBy(userId) {
    return this.readBy.includes(userId);
  }

  /**
   * Get a preview of the message content
   * @param {number} maxLength - Maximum length of preview
   * @returns {string}
   */
  getPreview(maxLength = 50) {
    if (this.content.length <= maxLength) {
      return this.content;
    }
    return this.content.substring(0, maxLength) + '...';
  }
}

export default Message;
