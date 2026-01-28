/**
 * Send Message Use Case
 *
 * Handles sending a message in an existing conversation
 * Updates conversation's lastMessage and increments unread counts
 */

import { Notification } from '@/domain/entities/Notification';

export class SendMessageUseCase {
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
   * Execute sending a message
   * @param {Object} params
   * @param {string} params.conversationId - Conversation to send message to
   * @param {string} params.senderId - Sender's user ID
   * @param {string} params.senderName - Sender's display name
   * @param {string} params.content - Message content
   * @param {string} params.type - Message type ('text' | 'contact_inquiry')
   * @param {Object} params.metadata - Optional metadata
   * @returns {Promise<Object>} Created message
   */
  async execute({ conversationId, senderId, senderName, content, type = 'text', metadata = {} }) {
    // 1. Validate inputs
    this.validateInputs(conversationId, senderId, content);

    // 2. Get the conversation to verify it exists
    const conversation = await this.conversationRepository.getById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 3. Create the message
    const messageData = {
      senderId,
      senderName,
      content,
      type,
      metadata,
      readBy: [senderId], // Sender has "read" their own message
    };

    const message = await this.messageRepository.create(conversationId, messageData);

    // 4. Update conversation's lastMessage
    const lastMessage = {
      content: content.substring(0, 100), // Truncate for preview
      senderId,
      senderName,
      createdAt: new Date(),
      type,
    };

    await this.conversationRepository.updateLastMessage(conversationId, lastMessage);

    // 5. Increment unread count for all participants except sender
    const otherParticipants = conversation.participants.filter((id) => id !== senderId);

    for (const participantId of otherParticipants) {
      await this.conversationRepository.incrementUnreadCount(conversationId, participantId);

      // 6. Create notification for each participant
      const notificationData = Notification.createMessageNotification(
        conversationId,
        message.id,
        senderId,
        senderName,
        content.substring(0, 50)
      );

      await this.notificationRepository.create(participantId, notificationData);
    }

    return message;
  }

  /**
   * Validate inputs
   * @param {string} conversationId
   * @param {string} senderId
   * @param {string} content
   */
  validateInputs(conversationId, senderId, content) {
    if (!conversationId || conversationId.trim() === '') {
      throw new Error('Conversation ID is required');
    }

    if (!senderId || senderId.trim() === '') {
      throw new Error('Sender ID is required');
    }

    if (!content || content.trim() === '') {
      throw new Error('Message content is required');
    }

    if (content.length > 5000) {
      throw new Error('Message is too long (max 5000 characters)');
    }
  }
}

export default SendMessageUseCase;
