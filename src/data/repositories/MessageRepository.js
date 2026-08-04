/**
 * Message Repository
 *
 * Manages messages in Firestore subcollection
 * Messages are stored in: conversations/{conversationId}/messages
 * Attachments are stored in: conversations/attachments/{conversationId}/{senderId}_{timestamp}.{ext}
 */

import { COLLECTIONS } from '@/core/constants/collections';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/core/config/firebase.config';
import { compressImage } from '@/lib/image-utils';

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

  /**
   * Upload an attachment to Firebase Storage
   * @param {string} conversationId
   * @param {string} senderId
   * @param {File} file
   * @returns {Promise<Object>} - { url, name, type, size }
   */
  async uploadAttachment(conversationId, senderId, file) {
    // Image attachments (screenshots, product photos in DMs) run through
    // the product-sized WebP preset so a 5 MB camera-roll capture doesn't
    // land in Storage full-size. Non-images (PDF, doc, etc.) pass through
    // untouched — compressImage already no-ops on non-image blobs, but
    // we still bind the compressed reference so the metadata below picks
    // up the resulting type/size correctly.
    const payload = await compressImage(file, 'product');

    // Keep original filename with timestamp prefix to avoid collisions.
    // If the compressor rewrote the payload to WebP, swap the stored
    // filename extension to `.webp` so the object at rest reflects its
    // real bytes; the display name returned below stays original because
    // that's what users recognise ("invoice.png").
    const timestamp = Date.now();
    const filename = payload.type === 'image/webp'
      ? `${timestamp}_${file.name.replace(/\.[^.]+$/, '')}.webp`
      : `${timestamp}_${file.name}`;
    const storagePath = `conversations/attachments/${conversationId}/${filename}`;
    const storageRef = ref(getStorageInstance(), storagePath);

    const snapshot = await uploadBytes(storageRef, payload, {
      contentType: payload.type,
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      name: file.name,
      type: payload.type,
      size: payload.size,
      storagePath,
    };
  }

  /**
   * Upload multiple attachments
   * @param {string} conversationId
   * @param {string} senderId
   * @param {Array<File>} files
   * @returns {Promise<Array>}
   */
  async uploadAttachments(conversationId, senderId, files) {
    const uploadPromises = files.map((file) =>
      this.uploadAttachment(conversationId, senderId, file)
    );
    return await Promise.all(uploadPromises);
  }
}

export default MessageRepository;
