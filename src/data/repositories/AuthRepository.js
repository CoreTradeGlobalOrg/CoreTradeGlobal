/**
 * Auth Repository
 *
 * This repository manages authentication operations
 * It acts as an abstraction layer between the data source and use cases
 *
 * Why use Repository pattern?
 * - Centralized data access logic
 * - Easy to switch data sources (Firebase → another provider)
 * - Business logic doesn't need to know about Firebase
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class AuthRepository {
  /**
   * Constructor
   * @param {FirebaseAuthDataSource} authDataSource
   * @param {FirestoreDataSource} firestoreDataSource
   * @param {FirebaseStorageDataSource} storageDataSource
   */
  constructor(authDataSource, firestoreDataSource, storageDataSource) {
    this.authDataSource = authDataSource;
    this.firestoreDataSource = firestoreDataSource;
    this.storageDataSource = storageDataSource;
  }

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User data with profile
   */
  async login(email, password) {
    // 1. Authenticate with Firebase Auth
    const authUser = await this.authDataSource.login(email, password);

    // 2. Get user profile from Firestore
    const userProfile = await this.firestoreDataSource.getById(
      COLLECTIONS.USERS,
      authUser.uid
    );

    // 3. Combine auth data with profile
    return {
      uid: authUser.uid,
      email: authUser.email,
      ...userProfile,
    };
  }

  /**
   * Register new user
   * @param {string} email
   * @param {string} password
   * @param {Object} profileData - Additional user data (name, company, etc.)
   * @returns {Promise<Object>} Created user
   */
  async register(email, password, profileData) {
    // 1. Create auth user
    const authUser = await this.authDataSource.register(email, password);

    // 2. Create user profile in Firestore
    const userProfile = await this.firestoreDataSource.createWithId(
      COLLECTIONS.USERS,
      authUser.uid,
      {
        email: authUser.email,
        ...profileData,
      }
    );

    // 3. Return user with uid included
    return {
      uid: authUser.uid,
      ...userProfile,
    };
  }

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    await this.authDataSource.logout();
  }

  /**
   * Get current user
   * @returns {User|null}
   */
  getCurrentUser() {
    return this.authDataSource.getCurrentUser();
  }

  /**
   * Listen to auth state changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    return this.authDataSource.onAuthStateChanged(callback);
  }

  /**
   * Get user profile by ID
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getUserProfile(userId) {
    return await this.firestoreDataSource.getById(COLLECTIONS.USERS, userId);
  }

  /**
   * Update user profile
   * @param {string} userId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async updateUserProfile(userId, data) {
    await this.firestoreDataSource.update(COLLECTIONS.USERS, userId, data);
  }

  /**
   * Send password reset email
   * @param {string} email
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email) {
    await this.authDataSource.sendPasswordResetEmail(email);
  }

  /**
   * Send email verification
   * @returns {Promise<void>}
   */
  async sendEmailVerification() {
    await this.authDataSource.sendEmailVerification();
  }

  /**
   * Verify email with code
   * @param {string} actionCode
   * @returns {Promise<void>}
   */
  async verifyEmail(actionCode) {
    await this.authDataSource.verifyEmail(actionCode);
  }

  /**
   * Reload user data
   * @returns {Promise<void>}
   */
  async reloadUser() {
    await this.authDataSource.reloadUser();
  }

  /**
   * Check if email is verified
   * @returns {boolean}
   */
  isEmailVerified() {
    return this.authDataSource.isEmailVerified();
  }

  /**
   * Get all users (Admin only)
   * @returns {Promise<Array>} Array of all users
   */
  async getAllUsers() {
    const users = await this.firestoreDataSource.query(COLLECTIONS.USERS, {
      orderBy: [['createdAt', 'desc']],
    });
    return users;
  }

  /**
   * Upload company logo to Firebase Storage
   * @param {string} userId - User ID
   * @param {File} file - Image file to upload
   * @returns {Promise<string>} Download URL of uploaded logo
   */
  async uploadCompanyLogo(userId, file) {
    console.log('📸 [AuthRepository] uploadCompanyLogo called with:', {
      userId,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
    });

    // Create storage path: {userId}/company-logo/logo.{ext}
    const fileExtension = file.name.split('.').pop();
    const fileName = `logo.${fileExtension}`;
    const storagePath = `${userId}/company-logo/${fileName}`;

    console.log('📸 [AuthRepository] Storage path:', storagePath);

    try {
      // Upload file and get download URL
      const downloadURL = await this.storageDataSource.uploadFile(
        storagePath,
        file,
        {
          userId,
          uploadType: 'company-logo',
        }
      );

      console.log('📸 [AuthRepository] Upload successful, download URL:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ [AuthRepository] Upload failed:', error);
      throw error;
    }
  }
}

export default AuthRepository;
