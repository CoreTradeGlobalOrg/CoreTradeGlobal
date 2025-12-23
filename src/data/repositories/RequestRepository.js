/**
 * Request Repository (RFQ - Request for Quotation)
 *
 * This repository manages request data in Firestore
 *
 * Responsibilities:
 * - Request CRUD operations
 * - Request queries (by user, by category, by country, etc.)
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class RequestRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Create new request
   * @param {Object} requestData
   * @returns {Promise<Object>}
   */
  async create(requestData) {
    const request = await this.firestoreDataSource.create(
      COLLECTIONS.REQUESTS,
      requestData
    );

    // Add request ID to user's requestIds array
    if (requestData.userId && request.id) {
      try {
        const user = await this.firestoreDataSource.getById(
          COLLECTIONS.USERS,
          requestData.userId
        );
        const currentRequestIds = user?.requestIds || [];

        await this.firestoreDataSource.update(
          COLLECTIONS.USERS,
          requestData.userId,
          {
            requestIds: [...currentRequestIds, request.id],
          }
        );
      } catch (error) {
        console.error('Failed to update user requestIds:', error);
        // Don't throw - request is already created
      }
    }

    return request;
  }

  /**
   * Get request by ID
   * @param {string} requestId
   * @returns {Promise<Object|null>}
   */
  async getById(requestId) {
    return await this.firestoreDataSource.getById(
      COLLECTIONS.REQUESTS,
      requestId
    );
  }

  /**
   * Get all requests by user ID
   * Fetches requests from user's requestIds array
   * @param {string} userId
   * @param {Object} options - Query options (orderBy, limit, etc.)
   * @returns {Promise<Array>}
   */
  async getByUserId(userId, options = {}) {
    try {
      const user = await this.firestoreDataSource.getById(COLLECTIONS.USERS, userId);

      if (!user || !user.requestIds || user.requestIds.length === 0) {
        return [];
      }

      const requestPromises = user.requestIds.map((requestId) =>
        this.firestoreDataSource.getById(COLLECTIONS.REQUESTS, requestId)
      );

      const requests = await Promise.all(requestPromises);

      const validRequests = requests
        .filter((request) => request !== null)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

      return options.limit ? validRequests.slice(0, options.limit) : validRequests;
    } catch (error) {
      console.error('Error in getByUserId:', error);
      return [];
    }
  }

  /**
   * Get requests by category ID
   * @param {string} categoryId
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getByCategoryId(categoryId, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.REQUESTS, {
      where: [
        ['categoryId', '==', categoryId],
        ['status', '==', 'active'],
      ],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get requests by target country
   * @param {string} targetCountry
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getByTargetCountry(targetCountry, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.REQUESTS, {
      where: [
        ['targetCountry', '==', targetCountry],
        ['status', '==', 'active'],
      ],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get active requests by user
   * @param {string} userId
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getActiveByUserId(userId, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.REQUESTS, {
      where: [
        ['userId', '==', userId],
        ['status', '==', 'active'],
      ],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit,
    });
  }

  /**
   * Get all active requests
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllActive(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.REQUESTS, {
      where: [['status', '==', 'active']],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit || 50,
    });
  }

  /**
   * Update request
   * @param {string} requestId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(requestId, data) {
    await this.firestoreDataSource.update(COLLECTIONS.REQUESTS, requestId, data);
  }

  /**
   * Close request (mark as closed)
   * @param {string} requestId
   * @returns {Promise<void>}
   */
  async close(requestId) {
    await this.firestoreDataSource.update(COLLECTIONS.REQUESTS, requestId, {
      status: 'closed',
      closedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reopen request
   * @param {string} requestId
   * @returns {Promise<void>}
   */
  async reopen(requestId) {
    await this.firestoreDataSource.update(COLLECTIONS.REQUESTS, requestId, {
      status: 'active',
      reopenedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Delete request (permanently remove)
   * Also removes from user's requestIds array
   * @param {string} requestId
   * @returns {Promise<void>}
   */
  async delete(requestId) {
    // Get request to find userId
    const request = await this.firestoreDataSource.getById(
      COLLECTIONS.REQUESTS,
      requestId
    );

    // Delete the request
    await this.firestoreDataSource.delete(COLLECTIONS.REQUESTS, requestId);

    // Remove from user's requestIds array
    if (request && request.userId) {
      try {
        const user = await this.firestoreDataSource.getById(
          COLLECTIONS.USERS,
          request.userId
        );

        if (user && user.requestIds) {
          const updatedRequestIds = user.requestIds.filter(
            (id) => id !== requestId
          );

          await this.firestoreDataSource.update(
            COLLECTIONS.USERS,
            request.userId,
            {
              requestIds: updatedRequestIds,
            }
          );
        }
      } catch (error) {
        console.error('Failed to update user requestIds on delete:', error);
        // Don't throw - request is already deleted
      }
    }
  }

  /**
   * Check if request exists
   * @param {string} requestId
   * @returns {Promise<boolean>}
   */
  async exists(requestId) {
    return await this.firestoreDataSource.exists(
      COLLECTIONS.REQUESTS,
      requestId
    );
  }
}

export default RequestRepository;
