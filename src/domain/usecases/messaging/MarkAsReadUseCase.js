/**
 * Mark As Read Use Case
 *
 * Handles marking messages and notifications as read
 * Resets unread count for the user in the conversation
 */

export class MarkAsReadUseCase {
  /**
   * Constructor
   * @param {MessageRepository} messageRepository
   * @param {ConversationRepository} conversationRepository
   * @param {NotificationRepository} notificationRepository
   */
  constructor(messageRepository, conversationRepository, notificationRepository) {
    this.messageRepository = messageRepository;
    this.conversationRepository = conversationRepository;
    this.notificationRepository = notificationRepository;
  }

  /**
   * Mark all messages in a conversation as read for a user
   * @param {string} conversationId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async execute(conversationId, userId) {
    // 1. Validate inputs
    if (!conversationId || !userId) {
      throw new Error('Conversation ID and User ID are required');
    }

    // 2. Mark all messages as read
    await this.messageRepository.markAllAsRead(conversationId, userId);

    // 3. Reset unread count in conversation
    await this.conversationRepository.resetUnreadCount(conversationId, userId);
  }

  /**
   * Mark a single notification as read
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<void>}
   */
  async markNotificationAsRead(userId, notificationId) {
    if (!userId || !notificationId) {
      throw new Error('User ID and Notification ID are required');
    }

    await this.notificationRepository.markAsRead(userId, notificationId);
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async markAllNotificationsAsRead(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await this.notificationRepository.markAllAsRead(userId);
  }
}

export default MarkAsReadUseCase;
