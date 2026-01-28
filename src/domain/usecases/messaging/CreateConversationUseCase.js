/**
 * Create Conversation Use Case
 *
 * Handles creating a new conversation between users
 * Supports direct messages and contact inquiries
 */

import { Notification } from '@/domain/entities/Notification';

export class CreateConversationUseCase {
  /**
   * Constructor
   * @param {ConversationRepository} conversationRepository
   * @param {MessageRepository} messageRepository
   * @param {NotificationRepository} notificationRepository
   * @param {UserRepository} userRepository
   */
  constructor(conversationRepository, messageRepository, notificationRepository, userRepository) {
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.notificationRepository = notificationRepository;
    this.userRepository = userRepository;
  }

  /**
   * Execute creating a conversation
   * @param {Object} params
   * @param {string} params.type - Conversation type ('direct' | 'contact' | 'system')
   * @param {Array<string>} params.participantIds - User IDs to include
   * @param {string} params.creatorId - ID of the user creating the conversation
   * @param {string} params.initialMessage - Optional initial message content
   * @param {Object} params.metadata - Optional metadata (subject, source, etc.)
   * @returns {Promise<Object>} Created conversation
   */
  async execute({ type = 'direct', participantIds, creatorId, initialMessage = null, metadata = {} }) {
    // 1. Validate inputs
    this.validateInputs(type, participantIds, creatorId);

    // 2. For direct conversations, check if one already exists
    if (type === 'direct' && participantIds.length === 2) {
      const existingConversation = await this.conversationRepository.findDirectConversation(
        participantIds[0],
        participantIds[1]
      );

      if (existingConversation) {
        return existingConversation;
      }
    }

    // 3. Fetch participant details for denormalization (including company info)
    const participantDetails = {};
    for (const participantId of participantIds) {
      const user = await this.userRepository.getById(participantId);
      if (user) {
        participantDetails[participantId] = {
          displayName: user.displayName || user.email,
          photoURL: user.companyLogo || user.photoURL || null,
          email: user.email,
          role: user.role,
          companyId: user.companyId || null,
          companyName: user.companyName || null,
        };
      }
    }

    // 4. Create the conversation
    const conversationData = {
      type,
      participants: participantIds,
      participantDetails,
      lastMessage: null,
      unreadCount: {},
      metadata: {
        source: metadata.source || 'direct',
        subject: metadata.subject || null,
        contactName: metadata.contactName || null,
        contactEmail: metadata.contactEmail || null,
        // Product context (when conversation starts from a product page)
        productId: metadata.productId || null,
        productName: metadata.productName || null,
        productImage: metadata.productImage || null,
      },
    };

    // Initialize unread counts to 0 for all participants
    participantIds.forEach((id) => {
      conversationData.unreadCount[id] = 0;
    });

    const conversation = await this.conversationRepository.create(conversationData);

    // 5. If there's an initial message, create it
    if (initialMessage && creatorId) {
      const creatorDetails = participantDetails[creatorId];
      const messageData = {
        senderId: creatorId,
        senderName: creatorDetails?.displayName || 'Unknown',
        content: initialMessage,
        type: type === 'contact' ? 'contact_inquiry' : 'text',
        metadata: {
          subject: metadata.subject,
          contactEmail: metadata.contactEmail,
        },
        readBy: [creatorId],
      };

      const message = await this.messageRepository.create(conversation.id, messageData);

      // Update lastMessage in conversation
      await this.conversationRepository.updateLastMessage(conversation.id, {
        content: initialMessage.substring(0, 100),
        senderId: creatorId,
        senderName: creatorDetails?.displayName || 'Unknown',
        createdAt: new Date(),
        type: messageData.type,
      });

      // Increment unread count for other participants
      const otherParticipants = participantIds.filter((id) => id !== creatorId);
      for (const participantId of otherParticipants) {
        await this.conversationRepository.incrementUnreadCount(conversation.id, participantId);

        // Create notification
        const notificationData = Notification.createConversationNotification(
          conversation.id,
          creatorId,
          creatorDetails?.displayName || 'Unknown',
          metadata.subject
        );

        await this.notificationRepository.create(participantId, notificationData);
      }
    }

    return conversation;
  }

  /**
   * Validate inputs
   * @param {string} type
   * @param {Array<string>} participantIds
   * @param {string} creatorId
   */
  validateInputs(type, participantIds, creatorId) {
    const validTypes = ['direct', 'contact', 'system'];
    if (!validTypes.includes(type)) {
      throw new Error('Invalid conversation type');
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      throw new Error('At least one participant is required');
    }

    if (type === 'direct' && participantIds.length !== 2) {
      throw new Error('Direct conversations require exactly 2 participants');
    }

    if (!creatorId || creatorId.trim() === '') {
      throw new Error('Creator ID is required');
    }
  }
}

export default CreateConversationUseCase;
