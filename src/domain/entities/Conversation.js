/**
 * Conversation Entity
 *
 * Represents a messaging conversation between users
 * Types: 'direct' (user-to-user), 'contact' (contact form), 'system' (system messages)
 */

export class Conversation {
  /**
   * Constructor
   * @param {string} id - Conversation ID
   * @param {string} type - Conversation type: 'direct' | 'contact' | 'system'
   * @param {Array<string>} participants - Array of user IDs in the conversation
   * @param {Object} participantDetails - Denormalized participant info { [userId]: { displayName, photoURL, email, role } }
   * @param {Object} lastMessage - Last message preview { content, senderId, senderName, createdAt, type }
   * @param {Object} unreadCount - Per-user unread count { [userId]: number }
   * @param {Object} metadata - Additional metadata { source, subject, contactName, contactEmail }
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   */
  constructor(
    id,
    type = 'direct',
    participants = [],
    participantDetails = {},
    lastMessage = null,
    unreadCount = {},
    metadata = {},
    createdAt = null,
    updatedAt = null
  ) {
    this.id = id;
    this.type = type;
    this.participants = participants;
    this.participantDetails = participantDetails;
    this.lastMessage = lastMessage;
    this.unreadCount = unreadCount;
    this.metadata = metadata;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Conversation from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Conversation}
   */
  static fromFirestore(data) {
    return new Conversation(
      data.id,
      data.type || 'direct',
      data.participants || [],
      data.participantDetails || {},
      data.lastMessage
        ? {
            ...data.lastMessage,
            createdAt: data.lastMessage.createdAt?.toDate?.() || data.lastMessage.createdAt,
          }
        : null,
      data.unreadCount || {},
      data.metadata || {},
      data.createdAt?.toDate?.() || data.createdAt || new Date(),
      data.updatedAt?.toDate?.() || data.updatedAt || new Date()
    );
  }

  /**
   * Convert Conversation to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      type: this.type,
      participants: this.participants,
      participantDetails: this.participantDetails,
      lastMessage: this.lastMessage,
      unreadCount: this.unreadCount,
      metadata: this.metadata,
    };
  }

  /**
   * Check if this is a contact conversation
   * @returns {boolean}
   */
  isContact() {
    return this.type === 'contact';
  }

  /**
   * Check if this is a direct message conversation
   * @returns {boolean}
   */
  isDirect() {
    return this.type === 'direct';
  }

  /**
   * Get unread count for a specific user
   * @param {string} userId
   * @returns {number}
   */
  getUnreadCount(userId) {
    return this.unreadCount[userId] || 0;
  }

  /**
   * Check if user is a participant
   * @param {string} userId
   * @returns {boolean}
   */
  hasParticipant(userId) {
    return this.participants.includes(userId);
  }

  /**
   * Get the other participant in a direct conversation
   * @param {string} currentUserId
   * @returns {Object|null} Participant details or null
   */
  getOtherParticipant(currentUserId) {
    const otherUserId = this.participants.find((id) => id !== currentUserId);
    if (!otherUserId) return null;
    return {
      id: otherUserId,
      ...this.participantDetails[otherUserId],
    };
  }

  /**
   * Get display name for the conversation
   * @param {string} currentUserId - Current user's ID
   * @returns {string}
   */
  getDisplayName(currentUserId) {
    if (this.type === 'contact') {
      return this.metadata.contactName || this.metadata.subject || 'Contact Inquiry';
    }

    const other = this.getOtherParticipant(currentUserId);
    if (other) {
      return other.displayName || other.email || 'Unknown User';
    }

    return 'Conversation';
  }

  /**
   * Get conversation subject (for contact inquiries)
   * @returns {string|null}
   */
  getSubject() {
    return this.metadata.subject || null;
  }

  /**
   * Check if conversation is from contact page
   * @returns {boolean}
   */
  isFromContactPage() {
    return this.metadata.source === 'contact_page';
  }
}

export default Conversation;
