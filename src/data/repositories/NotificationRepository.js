/**
 * Notification Repository
 *
 * Manages user notifications in Firestore subcollection
 * Notifications are stored in: users/{userId}/notifications
 */

import { COLLECTIONS, SUBCOLLECTIONS } from '@/core/constants/collections';

export class NotificationRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Create a notification for a user
   * @param {string} userId
   * @param {Object} notificationData
   * @returns {Promise<Object>}
   */
  async create(userId, notificationData) {
    return await this.firestoreDataSource.createInSubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      notificationData
    );
  }

  /**
   * Create notifications for multiple users
   * @param {Array<string>} userIds
   * @param {Object} notificationData
   * @returns {Promise<Array>}
   */
  async createForMultipleUsers(userIds, notificationData) {
    return await Promise.all(
      userIds.map((userId) => this.create(userId, notificationData))
    );
  }

  /**
   * Get notifications for a user
   * @param {string} userId
   * @param {number} limitCount
   * @returns {Promise<Array>}
   */
  async getByUserId(userId, limitCount = 50) {
    return await this.firestoreDataSource.querySubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      {
        orderBy: [['createdAt', 'desc']],
        limit: limitCount,
      }
    );
  }

  /**
   * Get unread notifications for a user
   * @param {string} userId
   * @param {number} limitCount
   * @returns {Promise<Array>}
   */
  async getUnreadByUserId(userId, limitCount = 50) {
    return await this.firestoreDataSource.querySubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      {
        where: [['isRead', '==', false]],
        orderBy: [['createdAt', 'desc']],
        limit: limitCount,
      }
    );
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    const notifications = await this.getUnreadByUserId(userId, 100);
    return notifications.length;
  }

  /**
   * Mark notification as read
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<void>}
   */
  async markAsRead(userId, notificationId) {
    await this.firestoreDataSource.updateInSubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      notificationId,
      { isRead: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async markAllAsRead(userId) {
    const unreadNotifications = await this.getUnreadByUserId(userId);

    await Promise.all(
      unreadNotifications.map((notification) =>
        this.markAsRead(userId, notification.id)
      )
    );
  }

  /**
   * Delete notification
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<void>}
   */
  async delete(userId, notificationId) {
    await this.firestoreDataSource.deleteFromSubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      notificationId
    );
  }

  /**
   * Delete all notifications for a user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteAll(userId) {
    const notifications = await this.getByUserId(userId, 500);

    await Promise.all(
      notifications.map((notification) =>
        this.delete(userId, notification.id)
      )
    );
  }

  /**
   * Subscribe to user's notifications (real-time)
   * @param {string} userId
   * @param {Function} onData - Callback with array of notifications
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToUserNotifications(userId, onData, onError) {
    return this.firestoreDataSource.subscribeToSubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      {
        orderBy: [['createdAt', 'desc']],
        limit: 50,
      },
      onData,
      onError
    );
  }

  /**
   * Subscribe to unread notifications count (real-time)
   * @param {string} userId
   * @param {Function} onData - Callback with count
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToUnreadCount(userId, onData, onError) {
    return this.firestoreDataSource.subscribeToSubcollection(
      COLLECTIONS.USERS,
      userId,
      SUBCOLLECTIONS.NOTIFICATIONS,
      {
        where: [['isRead', '==', false]],
      },
      (notifications) => {
        onData(notifications.length);
      },
      onError
    );
  }
}

export default NotificationRepository;
