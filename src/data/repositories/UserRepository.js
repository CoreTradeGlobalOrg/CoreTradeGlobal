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
   * @param {FirebaseStorageDataSource} storageDataSource
   */
  constructor(firestoreDataSource, storageDataSource = null) {
    this.firestoreDataSource = firestoreDataSource;
    this.storageDataSource = storageDataSource;
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

  /**
   * Upload company document
   * @param {string} userId
   * @param {File} file
   * @returns {Promise<Object>} Document metadata with URL
   */
  async uploadCompanyDocument(userId, file) {
    if (!this.storageDataSource) {
      throw new Error('Storage data source not configured');
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `users/${userId}/documents/${timestamp}_${safeFileName}`;

    const downloadUrl = await this.storageDataSource.uploadFile(storagePath, file, {
      userId,
      uploadType: 'company-document',
      originalName: file.name,
    });

    const documentMeta = {
      id: `${timestamp}_${safeFileName}`,
      name: file.name,
      url: downloadUrl,
      storagePath,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };

    // Get current documents and add new one
    const user = await this.getById(userId);
    const currentDocs = user?.companyDocuments || [];

    await this.update(userId, {
      companyDocuments: [...currentDocs, documentMeta],
    });

    return documentMeta;
  }

  /**
   * Delete company document
   * @param {string} userId
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async deleteCompanyDocument(userId, documentId) {
    if (!this.storageDataSource) {
      throw new Error('Storage data source not configured');
    }

    const user = await this.getById(userId);
    const currentDocs = user?.companyDocuments || [];
    const docToDelete = currentDocs.find(doc => doc.id === documentId);

    if (docToDelete && docToDelete.storagePath) {
      try {
        await this.storageDataSource.deleteFile(docToDelete.storagePath);
      } catch (error) {
        console.warn('Failed to delete document from storage:', error.message);
      }
    }

    const updatedDocs = currentDocs.filter(doc => doc.id !== documentId);
    await this.update(userId, {
      companyDocuments: updatedDocs,
    });
  }
}

export default UserRepository;
