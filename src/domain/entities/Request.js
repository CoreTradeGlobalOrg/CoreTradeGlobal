/**
 * Request Entity (RFQ - Request for Quotation)
 *
 * This represents the Request domain model
 * Pure JavaScript class - framework independent
 *
 * Contains:
 * - Request properties
 * - Business logic methods (validation, permissions, etc.)
 */

export class Request {
  /**
   * Constructor
   * @param {string} id - Request ID
   * @param {string} userId - Owner user ID
   * @param {string} productName - Requested product name
   * @param {string} categoryId - Category ID
   * @param {string} targetCountry - Target country for request
   * @param {number} quantity - Requested quantity
   * @param {string} description - Request description
   * @param {string} status - Request status (active, closed)
   * @param {Date} createdAt - Creation date
   * @param {Date} updatedAt - Last update date
   */
  constructor(
    id,
    userId,
    productName,
    categoryId,
    targetCountry,
    quantity,
    description,
    status,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.userId = userId;
    this.productName = productName;
    this.categoryId = categoryId;
    this.targetCountry = targetCountry;
    this.quantity = quantity || 1;
    this.description = description || '';
    this.status = status || 'active';
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Request from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Request}
   */
  static fromFirestore(data) {
    return new Request(
      data.id,
      data.userId,
      data.productName,
      data.categoryId,
      data.targetCountry,
      data.quantity,
      data.description,
      data.status,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Convert Request to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      userId: this.userId,
      productName: this.productName,
      categoryId: this.categoryId,
      targetCountry: this.targetCountry,
      quantity: this.quantity,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if request is active
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Check if request is closed
   * @returns {boolean}
   */
  isClosed() {
    return this.status === 'closed';
  }

  /**
   * Check if user can edit this request
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canEdit(userId) {
    return this.userId === userId && this.isActive();
  }

  /**
   * Check if user can delete this request
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canDelete(userId) {
    return this.userId === userId;
  }

  /**
   * Check if user can close this request
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canClose(userId) {
    return this.userId === userId && this.isActive();
  }

  /**
   * Mark request as closed
   */
  markAsClosed() {
    this.status = 'closed';
    this.updatedAt = new Date();
  }

  /**
   * Reopen request
   */
  reopen() {
    this.status = 'active';
    this.updatedAt = new Date();
  }

  /**
   * Get status badge color
   * @returns {string}
   */
  getStatusColor() {
    return this.isActive() ? 'green' : 'gray';
  }

  /**
   * Check if user can manage this request
   * @param {string} userId - User ID to check
   * @param {Object} requestData - Request data
   * @returns {boolean}
   */
  static canManageRequest(userId, requestData) {
    return requestData.userId === userId;
  }
}

export default Request;
