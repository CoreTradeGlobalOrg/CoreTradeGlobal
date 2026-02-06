/**
 * Send Contact Message Use Case
 *
 * Handles contact form submissions
 * Creates a conversation with all admins as participants
 * Supports both authenticated users and anonymous users
 */

import { Notification } from '@/domain/entities/Notification';

export class SendContactMessageUseCase {
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
   * Execute sending a contact message
   * @param {Object} params
   * @param {string} params.name - Sender's name
   * @param {string} params.email - Sender's email
   * @param {string} params.subject - Message subject
   * @param {string} params.message - Message content
   * @param {string} params.tag - Message tag (e.g., 'contact', 'advertising')
   * @param {string|null} params.userId - User ID if authenticated (null for anonymous)
   * @returns {Promise<Object>} Created conversation
   */
  async execute({ name, email, subject, message, tag = 'contact', userId = null }) {
    // 1. Validate inputs
    this.validateInputs(name, email, message);

    // 2. Get all admin users
    const adminUsers = await this.getAdminUsers();
    if (adminUsers.length === 0) {
      throw new Error('No admin users found to receive the message');
    }

    // 3. Build participant list
    const participantIds = adminUsers.map((admin) => admin.id);

    // If authenticated user, add them to participants
    if (userId) {
      participantIds.push(userId);
    }

    // 4. Build participant details
    const participantDetails = {};
    for (const admin of adminUsers) {
      participantDetails[admin.id] = {
        displayName: admin.displayName || admin.email,
        photoURL: admin.photoURL || null,
        email: admin.email,
        role: admin.role,
      };
    }

    // Add authenticated user details if applicable
    if (userId) {
      const user = await this.userRepository.getById(userId);
      if (user) {
        participantDetails[userId] = {
          displayName: user.displayName || user.email,
          photoURL: user.photoURL || null,
          email: user.email,
          role: user.role,
        };
      }
    }

    // 5. Create the conversation
    const conversationData = {
      type: tag, // 'contact' or 'advertising'
      participants: participantIds,
      participantDetails,
      lastMessage: null,
      unreadCount: {},
      metadata: {
        source: tag === 'advertising' ? 'advertising_inquiry' : 'contact_page',
        tag: tag,
        subject: subject || (tag === 'advertising' ? 'Advertising Inquiry' : 'Contact Inquiry'),
        contactName: name,
        contactEmail: email,
      },
    };

    // Initialize unread counts
    participantIds.forEach((id) => {
      conversationData.unreadCount[id] = 0;
    });

    const conversation = await this.conversationRepository.create(conversationData);

    // 6. Create the initial message
    const senderId = userId || 'anonymous';
    const senderName = name;

    const messageData = {
      senderId,
      senderName,
      content: message,
      type: 'contact_inquiry',
      metadata: {
        subject,
        contactEmail: email,
        contactName: name,
        isAnonymous: !userId,
      },
      readBy: userId ? [userId] : [],
    };

    const createdMessage = await this.messageRepository.create(conversation.id, messageData);

    // 7. Update lastMessage in conversation
    await this.conversationRepository.updateLastMessage(conversation.id, {
      content: message.substring(0, 100),
      senderId,
      senderName,
      createdAt: new Date(),
      type: 'contact_inquiry',
    });

    // 8. Notify all admins
    for (const admin of adminUsers) {
      // Increment unread count
      await this.conversationRepository.incrementUnreadCount(conversation.id, admin.id);

      // Create notification
      const notificationData = {
        type: 'conversation_created',
        title: `New contact from ${name}`,
        body: subject || message.substring(0, 50),
        data: {
          conversationId: conversation.id,
          messageId: createdMessage.id,
          senderId,
          senderName,
          contactEmail: email,
        },
        isRead: false,
      };

      await this.notificationRepository.create(admin.id, notificationData);
    }

    return conversation;
  }

  /**
   * Get all admin users
   * @returns {Promise<Array>}
   */
  async getAdminUsers() {
    // Query users with admin role
    const allUsers = await this.userRepository.firestoreDataSource.query('users', {
      where: [['role', '==', 'admin']],
    });

    return allUsers.filter((user) => !user.isSuspended && !user.isDeleted);
  }

  /**
   * Validate inputs
   * @param {string} name
   * @param {string} email
   * @param {string} message
   */
  validateInputs(name, email, message) {
    if (!name || name.trim() === '') {
      throw new Error('Name is required');
    }

    if (!email || email.trim() === '') {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (!message || message.trim() === '') {
      throw new Error('Message is required');
    }

    if (message.length > 5000) {
      throw new Error('Message is too long (max 5000 characters)');
    }
  }
}

export default SendContactMessageUseCase;
