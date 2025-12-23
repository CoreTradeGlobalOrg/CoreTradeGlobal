/**
 * User Entity
 *
 * This represents the User domain model
 * Pure JavaScript class - framework independent
 *
 * Contains:
 * - User properties
 * - Business logic methods (permissions, validation, etc.)
 */

export class User {
  /**
   * Constructor
   * @param {string} id - User ID
   * @param {string} email - User email
   * @param {string} companyId - Company ID
   * @param {string} role - User role (admin, member, viewer)
   * @param {string} displayName - User's display name
   * @param {string} photoURL - Profile photo URL
   * @param {string} about - About user / Bio
   * @param {Date} createdAt - Account creation date
   * @param {Array<string>} productIds - Array of product IDs
   * @param {Array<string>} requestIds - Array of request IDs
   */
  constructor(id, email, companyId, role, displayName, photoURL, about, createdAt, productIds = [], requestIds = []) {
    this.id = id;
    this.email = email;
    this.companyId = companyId;
    this.role = role || 'member';
    this.displayName = displayName || '';
    this.photoURL = photoURL || null;
    this.about = about || '';
    this.createdAt = createdAt || new Date();
    this.productIds = productIds || [];
    this.requestIds = requestIds || [];
  }

  /**
   * Create User from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {User}
   */
  static fromFirestore(data) {
    return new User(
      data.id,
      data.email,
      data.companyId,
      data.role,
      data.displayName,
      data.photoURL,
      data.about,
      data.createdAt,
      data.productIds || [],
      data.requestIds || []
    );
  }

  /**
   * Convert User to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      email: this.email,
      companyId: this.companyId,
      role: this.role,
      displayName: this.displayName,
      photoURL: this.photoURL,
      about: this.about,
      createdAt: this.createdAt,
      productIds: this.productIds || [],
      requestIds: this.requestIds || [],
    };
  }

  /**
   * Check if user is admin
   * @returns {boolean}
   */
  isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Check if user is member
   * @returns {boolean}
   */
  isMember() {
    return this.role === 'member';
  }

  /**
   * Check if user is fully verified (email + admin approved)
   * @param {Object} userData - User data with emailVerified and adminApproved
   * @returns {boolean}
   */
  static isFullyVerified(userData) {
    return userData.emailVerified === true && userData.adminApproved === true && !userData.isSuspended;
  }

  /**
   * Check if user can access restricted features
   * User must be email verified AND admin approved
   * @param {Object} userData - User data with emailVerified and adminApproved
   * @returns {boolean}
   */
  static canAccessRestrictedFeatures(userData) {
    return this.isFullyVerified(userData);
  }

  /**
   * Check if user can manage products
   * Requires full verification
   * @param {Object} userData - User data
   * @returns {boolean}
   */
  static canManageProducts(userData) {
    return this.isFullyVerified(userData) && (userData.role === 'admin' || userData.role === 'member');
  }

  /**
   * Check if user can create RFQs
   * Requires full verification
   * @param {Object} userData - User data
   * @returns {boolean}
   */
  static canCreateRFQ(userData) {
    return this.isFullyVerified(userData);
  }

  /**
   * Check if user can add products
   * Requires full verification
   * @param {Object} userData - User data
   * @returns {boolean}
   */
  static canAddProducts(userData) {
    return this.isFullyVerified(userData);
  }

  /**
   * Check if user can manage company
   * @param {Object} userData - User data
   * @returns {boolean}
   */
  static canManageCompany(userData) {
    return userData.role === 'admin' && !userData.isSuspended;
  }

  /**
   * Check if user can send messages
   * All verified users can send messages
   * @param {Object} userData - User data
   * @returns {boolean}
   */
  static canSendMessages(userData) {
    return userData.emailVerified === true && !userData.isSuspended;
  }

  /**
   * Check if user can browse platform
   * Email verified users can browse even without admin approval
   * @param {Object} userData - User data
   * @returns {boolean}
   */
  static canBrowsePlatform(userData) {
    return userData.emailVerified === true && !userData.isSuspended;
  }

  /**
   * Get user status message
   * @param {Object} userData - User data
   * @returns {string}
   */
  static getUserStatusMessage(userData) {
    if (userData.isSuspended) {
      return 'Your account has been suspended. Please contact support.';
    }
    if (!userData.emailVerified) {
      return 'Please verify your email address to access the platform.';
    }
    if (!userData.adminApproved) {
      return 'Your account is pending admin approval. You can browse but cannot create RFQs or add products yet.';
    }
    return 'Your account is fully verified.';
  }

  /**
   * Get user initials for avatar
   * @returns {string}
   */
  getInitials() {
    if (this.displayName) {
      return this.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return this.email[0].toUpperCase();
  }
}

export default User;
