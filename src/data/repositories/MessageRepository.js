/**
 * Message Repository
 *
 * Manages messages in Firestore subcollection
 * Messages are stored in: conversations/{conversationId}/messages
 */

import { COLLECTIONS } from '@/core/constants/collections';

const MESSAGES_SUBCOLLECTION = 'messages';

export class MessageRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Create a new message in a conversation
   * @param {string} conversationId
   * @param {Object} messageData
   * @returns {Promise<Object>}
   */
  async create(conversationId, messageData) {
    return await this.firestoreDataSource.createInSubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      {
        ...messageData,
        conversationId,
      }
    );
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId
   * @param {number} limitCount - Optional limit
   * @returns {Promise<Array>}
   */
  async getByConversationId(conversationId, limitCount = 100) {
    return await this.firestoreDataSource.querySubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      {
        orderBy: [['createdAt', 'asc']],
        limit: limitCount,
      }
    );
  }

  /**
   * Get recent messages for a conversation (for preview)
   * @param {string} conversationId
   * @param {number} limitCount
   * @returns {Promise<Array>}
   */
  async getRecentMessages(conversationId, limitCount = 10) {
    return await this.firestoreDataSource.querySubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      {
        orderBy: [['createdAt', 'desc']],
        limit: limitCount,
      }
    );
  }

  /**
   * Update message
   * @param {string} conversationId
   * @param {string} messageId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(conversationId, messageId, data) {
    await this.firestoreDataSource.updateInSubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      messageId,
      data
    );
  }

  /**
   * Mark message as read by a user
   * @param {string} conversationId
   * @param {string} messageId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async markAsRead(conversationId, messageId, userId) {
    const messages = await this.firestoreDataSource.querySubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      {
        where: [['id', '==', messageId]],
        limit: 1,
      }
    );

    if (messages.length === 0) return;

    const message = messages[0];
    const readBy = message.readBy || [];

    if (!readBy.includes(userId)) {
      await this.update(conversationId, messageId, {
        readBy: [...readBy, userId],
      });
    }
  }

  /**
   * Mark all messages in a conversation as read by a user
   * @param {string} conversationId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async markAllAsRead(conversationId, userId) {
    const messages = await this.getByConversationId(conversationId);

    const unreadMessages = messages.filter(
      (msg) => !msg.readBy?.includes(userId) && msg.senderId !== userId
    );

    // Update each unread message
    await Promise.all(
      unreadMessages.map((msg) =>
        this.update(conversationId, msg.id, {
          readBy: [...(msg.readBy || []), userId],
        })
      )
    );
  }

  /**
   * Delete message
   * @param {string} conversationId
   * @param {string} messageId
   * @returns {Promise<void>}
   */
  async delete(conversationId, messageId) {
    await this.firestoreDataSource.deleteFromSubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      messageId
    );
  }

  /**
   * Subscribe to messages in a conversation (real-time)
   * @param {string} conversationId
   * @param {Function} onData - Callback with array of messages
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToConversationMessages(conversationId, onData, onError) {
    return this.firestoreDataSource.subscribeToSubcollection(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      MESSAGES_SUBCOLLECTION,
      {
        orderBy: [['createdAt', 'asc']],
      },
      onData,
      onError
    );
  }

  /**
   * Get unread message count for a user in a conversation
   * @param {string} conversationId
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadCount(conversationId, userId) {
    const messages = await this.getByConversationId(conversationId);
    return messages.filter(
      (msg) => !msg.readBy?.includes(userId) && msg.senderId !== userId
    ).length;
  }
}

export default MessageRepository;
