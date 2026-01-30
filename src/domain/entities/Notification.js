/**
 * Notification Entity
 *
 * Represents a user notification
 * Stored in subcollection: users/{userId}/notifications
 */

export class Notification {
  /**
   * Constructor
   * @param {string} id - Notification ID
   * @param {string} type - Notification type: 'new_message' | 'conversation_created'
   * @param {string} title - Notification title
   * @param {string} body - Notification body text
   * @param {Object} data - Additional data { conversationId, messageId, senderId, senderName }
   * @param {boolean} isRead - Whether notification has been read
   * @param {Date} createdAt - Creation timestamp
   */
  constructor(
    id,
    type,
    title,
    body,
    data = {},
    isRead = false,
    createdAt = null
  ) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.body = body;
    this.data = data;
    this.isRead = isRead;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Create Notification from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Notification}
   */
  static fromFirestore(data) {
    return new Notification(
      data.id,
      data.type,
      data.title,
      data.body,
      data.data || {},
      data.isRead || false,
      data.createdAt?.toDate?.() || data.createdAt || new Date()
    );
  }

  /**
   * Convert Notification to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      type: this.type,
      title: this.title,
      body: this.body,
      data: this.data,
      isRead: this.isRead,
    };
  }

  /**
   * Check if this is a message notification
   * @returns {boolean}
   */
  isMessageNotification() {
    return this.type === 'new_message';
  }

  /**
   * Check if this is a conversation created notification
   * @returns {boolean}
   */
  isConversationNotification() {
    return this.type === 'conversation_created';
  }

  /**
   * Get the conversation ID from the notification data
   * @returns {string|null}
   */
  getConversationId() {
    return this.data.conversationId || null;
  }

  /**
   * Create a new message notification
   * @param {string} conversationId
   * @param {string} messageId
   * @param {string} senderId
   * @param {string} senderName
   * @param {string} messagePreview
   * @returns {Object} Notification data for Firestore
   */
  static createMessageNotification(conversationId, messageId, senderId, senderName, messagePreview) {
    return {
      type: 'new_message',
      title: `New message from ${senderName}`,
      body: messagePreview,
      data: {
        conversationId,
        messageId,
        senderId,
        senderName,
      },
      isRead: false,
    };
  }

  /**
   * Create a conversation created notification
   * @param {string} conversationId
   * @param {string} creatorId
   * @param {string} creatorName
   * @param {string} subject
   * @returns {Object} Notification data for Firestore
   */
  static createConversationNotification(conversationId, creatorId, creatorName, subject) {
    return {
      type: 'conversation_created',
      title: `New conversation from ${creatorName}`,
      body: subject || 'New conversation started',
      data: {
        conversationId,
        senderId: creatorId,
        senderName: creatorName,
      },
      isRead: false,
    };
  }

  /**
   * Create a quote received notification
   * @param {string} requestId - RFQ ID
   * @param {string} quoteId - Quote ID
   * @param {string} quoterId - ID of user who submitted the quote
   * @param {string} quoterName - Name/company of quoter
   * @param {string} productName - Product name from RFQ
   * @param {number} unitPrice - Quoted unit price
   * @param {string} currency - Currency code
   * @returns {Object} Notification data for Firestore
   */
  static createQuoteNotification(requestId, quoteId, quoterId, quoterName, productName, unitPrice, currency) {
    return {
      type: 'quote_received',
      title: `New Quote Received`,
      body: `${quoterName} submitted a quote for "${productName}" at ${unitPrice} ${currency}`,
      data: {
        requestId,
        quoteId,
        quoterId,
        quoterName,
        productName,
        unitPrice,
        currency,
      },
      isRead: false,
    };
  }

  /**
   * Create a quote accepted notification
   * @param {string} requestId - RFQ ID
   * @param {string} quoteId - Quote ID
   * @param {string} productName - Product name from RFQ
   * @param {string} buyerName - Name/company of buyer who accepted
   * @returns {Object} Notification data for Firestore
   */
  static createQuoteAcceptedNotification(requestId, quoteId, productName, buyerName) {
    return {
      type: 'quote_accepted',
      title: `Quote Accepted!`,
      body: `${buyerName} has accepted your quote for "${productName}"`,
      data: {
        requestId,
        quoteId,
        productName,
        buyerName,
      },
      isRead: false,
    };
  }

  /**
   * Create a quote rejected notification
   * @param {string} requestId - RFQ ID
   * @param {string} quoteId - Quote ID
   * @param {string} productName - Product name from RFQ
   * @param {string} buyerName - Name/company of buyer who rejected
   * @param {string} reason - Optional rejection reason
   * @returns {Object} Notification data for Firestore
   */
  static createQuoteRejectedNotification(requestId, quoteId, productName, buyerName, reason = null) {
    return {
      type: 'quote_rejected',
      title: `Quote Not Selected`,
      body: reason
        ? `${buyerName} did not select your quote for "${productName}". Reason: ${reason}`
        : `${buyerName} did not select your quote for "${productName}"`,
      data: {
        requestId,
        quoteId,
        productName,
        buyerName,
        reason,
      },
      isRead: false,
    };
  }

  /**
   * Create a new user approval request notification (for admins)
   * @param {string} userId - New user's ID
   * @param {string} userName - New user's display name
   * @param {string} companyName - New user's company name
   * @param {string} email - New user's email
   * @returns {Object} Notification data for Firestore
   */
  static createNewUserApprovalNotification(userId, userName, companyName, email) {
    return {
      type: 'new_user_approval',
      title: `New User Awaiting Approval`,
      body: `${userName} from "${companyName}" has registered and needs approval`,
      data: {
        userId,
        userName,
        companyName,
        email,
      },
      isRead: false,
    };
  }
}

export default Notification;
