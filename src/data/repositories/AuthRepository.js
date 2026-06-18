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
   * @throws {Object} Error with deletionInfo if account is deleted
   */
  async login(email, password) {
    // 1. Authenticate with Firebase Auth (may throw MFA_REQUIRED with resolver)
    let authUser;
    try {
      authUser = await this.authDataSource.login(email, password);
    } catch (error) {
      if (error.message === 'MFA_REQUIRED') {
        // Bubble up MFA error with resolver for the UI to handle
        throw error;
      }
      throw error;
    }

    // 2. Get user profile from Firestore
    const userProfile = await this.firestoreDataSource.getById(
      COLLECTIONS.USERS,
      authUser.uid
    );

    // 3. Check if user profile exists
    if (!userProfile) {
      // Logout and throw error
      await this.authDataSource.logout();
      throw new Error('Account not found. Please contact support.');
    }

    // 4. Check if user is deleted/banned
    if (userProfile.isDeleted === true) {
      // Logout but return deletion info for the UI to handle
      await this.authDataSource.logout();

      const error = new Error('ACCOUNT_DELETED');
      error.deletionInfo = {
        userId: authUser.uid,
        deletionType: userProfile.deletionType || 'unknown',
        deletedAt: userProfile.deletedAt,
        canRecoverUntil: userProfile.canRecoverUntil,
        banReason: userProfile.banReason,
      };
      throw error;
    }

    // 5. Combine auth data with profile
    return {
      uid: authUser.uid,
      email: authUser.email,
      ...userProfile,
    };
  }

  /**
   * Complete MFA login with TOTP code
   * @param {MultiFactorResolver} resolver
   * @param {string} totpCode
   * @returns {Promise<Object>} User data with profile
   */
  async completeMfaLogin(resolver, totpCode) {
    const authUser = await this.authDataSource.completeMfaSignIn(resolver, totpCode);

    const userProfile = await this.firestoreDataSource.getById(
      COLLECTIONS.USERS,
      authUser.uid
    );

    if (!userProfile) {
      await this.authDataSource.logout();
      throw new Error('Account not found. Please contact support.');
    }

    if (userProfile.isDeleted === true) {
      await this.authDataSource.logout();
      const error = new Error('ACCOUNT_DELETED');
      error.deletionInfo = {
        userId: authUser.uid,
        deletionType: userProfile.deletionType || 'unknown',
        deletedAt: userProfile.deletedAt,
        canRecoverUntil: userProfile.canRecoverUntil,
        banReason: userProfile.banReason,
      };
      throw error;
    }

    return {
      uid: authUser.uid,
      email: authUser.email,
      ...userProfile,
    };
  }

  /**
   * Login with backup code (bypasses MFA)
   * @param {string} email
   * @param {string} backupCode
   * @returns {Promise<Object>} User data with profile
   */
  async loginWithBackupCode(email, backupCode) {
    // 1. Verify backup code server-side and get custom token
    const response = await fetch('/api/auth/backup-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, backupCode }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Backup code verification failed');
    }

    // 2. Sign in with the custom token
    const authUser = await this.authDataSource.loginWithCustomToken(data.customToken);

    // 3. Get user profile from Firestore
    const userProfile = await this.firestoreDataSource.getById(
      COLLECTIONS.USERS,
      authUser.uid
    );

    if (!userProfile) {
      await this.authDataSource.logout();
      throw new Error('Account not found. Please contact support.');
    }

    if (userProfile.isDeleted === true) {
      await this.authDataSource.logout();
      const error = new Error('ACCOUNT_DELETED');
      error.deletionInfo = {
        userId: authUser.uid,
        deletionType: userProfile.deletionType || 'unknown',
        deletedAt: userProfile.deletedAt,
        canRecoverUntil: userProfile.canRecoverUntil,
        banReason: userProfile.banReason,
      };
      throw error;
    }

    return {
      uid: authUser.uid,
      email: authUser.email,
      remainingBackupCodes: data.remainingCodes,
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
   * Sign in with Google. Returns the Firebase auth user. The caller checks
   * whether a Firestore profile exists to decide login vs. profile completion.
   * @returns {Promise<User>}
   */
  async signInWithGoogle() {
    return this.authDataSource.signInWithGoogle();
  }

  /**
   * Sign in with a Firebase custom token (our LinkedIn flow). Unlike
   * loginWithBackupCode this does NOT log out on a missing Firestore profile —
   * AuthContext routes such users to profile completion.
   * @param {string} customToken
   * @returns {Promise<User>}
   */
  async signInWithCustomToken(customToken) {
    return this.authDataSource.loginWithCustomToken(customToken);
  }

  /**
   * Create a Firestore user profile for an already-authenticated user
   * (e.g. after OAuth sign-in, once the profile-completion step is submitted).
   * @param {string} userId
   * @param {Object} profileData
   * @returns {Promise<Object>}
   */
  async createUserProfile(userId, profileData) {
    return this.firestoreDataSource.createWithId(COLLECTIONS.USERS, userId, profileData);
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
    // Create storage path: {userId}/company-logo/logo.{ext}
    const fileExtension = file.name.split('.').pop();
    const fileName = `logo.${fileExtension}`;
    const storagePath = `users/${userId}/company-logo/${fileName}`;

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

      return downloadURL;
    } catch (error) {
      console.error('❌ [AuthRepository] Upload failed:', error);
      throw error;
    }
  }
}

export default AuthRepository;
