/**
 * Conversation Repository
 *
 * Manages conversation data in Firestore
 * Handles CRUD operations and real-time subscriptions for conversations
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class ConversationRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Create a new conversation
   * @param {Object} conversationData
   * @returns {Promise<Object>}
   */
  async create(conversationData) {
    return await this.firestoreDataSource.create(
      COLLECTIONS.CONVERSATIONS,
      conversationData
    );
  }

  /**
   * Get conversation by ID
   * @param {string} conversationId
   * @returns {Promise<Object|null>}
   */
  async getById(conversationId) {
    return await this.firestoreDataSource.getById(
      COLLECTIONS.CONVERSATIONS,
      conversationId
    );
  }

  /**
   * Get all conversations for a user
   * @param {string} userId
   * @param {number} limitCount - Optional limit
   * @returns {Promise<Array>}
   */
  async getByUserId(userId, limitCount = 50) {
    return await this.firestoreDataSource.query(COLLECTIONS.CONVERSATIONS, {
      where: [['participants', 'array-contains', userId]],
      orderBy: [['updatedAt', 'desc']],
      limit: limitCount,
    });
  }

  /**
   * Get contact conversations (for admin view)
   * @param {number} limitCount - Optional limit
   * @returns {Promise<Array>}
   */
  async getContactConversations(limitCount = 50) {
    return await this.firestoreDataSource.query(COLLECTIONS.CONVERSATIONS, {
      where: [['type', '==', 'contact']],
      orderBy: [['updatedAt', 'desc']],
      limit: limitCount,
    });
  }

  /**
   * Get all conversations (for admin view)
   * @param {number} limitCount - Optional limit
   * @returns {Promise<Array>}
   */
  async getAllConversations(limitCount = 100) {
    return await this.firestoreDataSource.query(COLLECTIONS.CONVERSATIONS, {
      orderBy: [['updatedAt', 'desc']],
      limit: limitCount,
    });
  }

  /**
   * Subscribe to all conversations (for admin real-time view)
   * @param {Function} onData - Callback with array of conversations
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToAllConversations(onData, onError) {
    return this.firestoreDataSource.subscribeToQuery(
      COLLECTIONS.CONVERSATIONS,
      {
        orderBy: [['updatedAt', 'desc']],
        limit: 100,
      },
      onData,
      onError
    );
  }

  /**
   * Find existing direct conversation between two users
   * @param {string} userId1
   * @param {string} userId2
   * @param {Object} context - Optional context { productId, requestId }
   * @returns {Promise<Object|null>}
   */
  async findDirectConversation(userId1, userId2, context = {}) {
    // Query for conversations where both users are participants
    const conversations = await this.firestoreDataSource.query(
      COLLECTIONS.CONVERSATIONS,
      {
        where: [
          ['type', '==', 'direct'],
          ['participants', 'array-contains', userId1],
        ],
      }
    );

    // Find the one that also includes userId2 AND matches context (if provided)
    return conversations.find((conv) => {
      // Must include both users
      if (!conv.participants.includes(userId2)) return false;

      // If productId is specified, must match
      if (context.productId) {
        return conv.metadata?.productId === context.productId;
      }

      // If requestId is specified, must match
      if (context.requestId) {
        return conv.metadata?.requestId === context.requestId;
      }

      // No context specified - find conversation without product/RFQ context
      return !conv.metadata?.productId && !conv.metadata?.requestId;
    }) || null;
  }

  /**
   * Update conversation
   * @param {string} conversationId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(conversationId, data) {
    await this.firestoreDataSource.update(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      data
    );
  }

  /**
   * Update last message in conversation
   * @param {string} conversationId
   * @param {Object} lastMessage - { content, senderId, senderName, createdAt, type }
   * @returns {Promise<void>}
   */
  async updateLastMessage(conversationId, lastMessage) {
    await this.firestoreDataSource.update(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      { lastMessage }
    );
  }

  /**
   * Increment unread count for a user
   * @param {string} conversationId
   * @param {string} userId
   * @param {number} increment - Default 1
   * @returns {Promise<void>}
   */
  async incrementUnreadCount(conversationId, userId, increment = 1) {
    const conversation = await this.getById(conversationId);
    if (!conversation) return;

    const currentCount = conversation.unreadCount?.[userId] || 0;
    await this.firestoreDataSource.update(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      {
        [`unreadCount.${userId}`]: currentCount + increment,
      }
    );
  }

  /**
   * Reset unread count for a user
   * @param {string} conversationId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async resetUnreadCount(conversationId, userId) {
    await this.firestoreDataSource.update(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      {
        [`unreadCount.${userId}`]: 0,
      }
    );
  }

  /**
   * Delete conversation
   * @param {string} conversationId
   * @returns {Promise<void>}
   */
  async delete(conversationId) {
    await this.firestoreDataSource.delete(
      COLLECTIONS.CONVERSATIONS,
      conversationId
    );
  }

  /**
   * Subscribe to user's conversations in real-time
   * @param {string} userId
   * @param {Function} onData - Callback with array of conversations
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToUserConversations(userId, onData, onError) {
    return this.firestoreDataSource.subscribeToQuery(
      COLLECTIONS.CONVERSATIONS,
      {
        where: [['participants', 'array-contains', userId]],
        orderBy: [['updatedAt', 'desc']],
      },
      onData,
      onError
    );
  }

  /**
   * Subscribe to a single conversation
   * @param {string} conversationId
   * @param {Function} onData - Callback with conversation data
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToConversation(conversationId, onData, onError) {
    return this.firestoreDataSource.subscribeToDocument(
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      onData,
      onError
    );
  }

  /**
   * Add participant to conversation
   * @param {string} conversationId
   * @param {string} userId
   * @param {Object} userDetails - { displayName, photoURL, email, role }
   * @returns {Promise<void>}
   */
  async addParticipant(conversationId, userId, userDetails) {
    const conversation = await this.getById(conversationId);
    if (!conversation) return;

    const participants = [...conversation.participants, userId];
    const participantDetails = {
      ...conversation.participantDetails,
      [userId]: userDetails,
    };

    await this.update(conversationId, { participants, participantDetails });
  }
}

export default ConversationRepository;
