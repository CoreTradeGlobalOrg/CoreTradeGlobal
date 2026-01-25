/**
 * User Repository
 *
 * This repository manages user profile data in Firestore
 * Separate from AuthRepository for Single Responsibility Principle
 *
 * AuthRepository = Authentication operations
 * UserRepository = User data/profile operations
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class UserRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Get user by ID
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getById(userId) {
    return await this.firestoreDataSource.getById(COLLECTIONS.USERS, userId);
  }

  /**
   * Get user by email
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async getByEmail(email) {
    const users = await this.firestoreDataSource.query(COLLECTIONS.USERS, {
      where: [['email', '==', email]],
      limit: 1,
    });

    return users.length > 0 ? users[0] : null;
  }

  /**
   * Create user profile
   * @param {string} userId
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async create(userId, userData) {
    return await this.firestoreDataSource.createWithId(
      COLLECTIONS.USERS,
      userId,
      userData
    );
  }

  /**
   * Update user profile
   * @param {string} userId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(userId, data) {
    await this.firestoreDataSource.update(COLLECTIONS.USERS, userId, data);
  }

  /**
   * Delete user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async delete(userId) {
    await this.firestoreDataSource.delete(COLLECTIONS.USERS, userId);
  }

  /**
   * Get users by company ID
   * @param {string} companyId
   * @returns {Promise<Array>}
   */
  async getByCompanyId(companyId) {
    return await this.firestoreDataSource.query(COLLECTIONS.USERS, {
      where: [['companyId', '==', companyId]],
    });
  }

  /**
   * Check if user exists
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async exists(userId) {
    return await this.firestoreDataSource.exists(COLLECTIONS.USERS, userId);
  }
}

export default UserRepository;
