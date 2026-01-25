/**
 * Fairs Repository
 *
 * This repository manages trade fair data in Firestore
 *
 * Responsibilities:
 * - Fair CRUD operations
 * - Fair queries (by status, upcoming, etc.)
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class FairsRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Create new fair
   * @param {Object} fairData
   * @returns {Promise<Object>}
   */
  async create(fairData) {
    return await this.firestoreDataSource.create(COLLECTIONS.FAIRS, {
      ...fairData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get fair by ID
   * @param {string} fairId
   * @returns {Promise<Object|null>}
   */
  async getById(fairId) {
    return await this.firestoreDataSource.getById(COLLECTIONS.FAIRS, fairId);
  }

  /**
   * Get all fairs
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAll(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.FAIRS, {
      orderBy: options.orderBy || [['startDate', 'asc']],
      limit: options.limit || 50,
    });
  }

  /**
   * Get fairs by status
   * @param {string} status - upcoming, ongoing, past
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getByStatus(status, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.FAIRS, {
      where: [['status', '==', status]],
      orderBy: options.orderBy || [['startDate', 'asc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get upcoming fairs
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getUpcoming(options = {}) {
    return await this.getByStatus('upcoming', options);
  }

  /**
   * Get ongoing fairs
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOngoing(options = {}) {
    return await this.getByStatus('ongoing', options);
  }

  /**
   * Get past fairs
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getPast(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.FAIRS, {
      where: [['status', '==', 'past']],
      orderBy: options.orderBy || [['startDate', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get upcoming and ongoing fairs (active fairs)
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getActive(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.FAIRS, {
      where: [['status', 'in', ['upcoming', 'ongoing']]],
      orderBy: options.orderBy || [['startDate', 'asc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Update fair
   * @param {string} fairId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(fairId, data) {
    await this.firestoreDataSource.update(COLLECTIONS.FAIRS, fairId, {
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete fair
   * @param {string} fairId
   * @returns {Promise<void>}
   */
  async delete(fairId) {
    await this.firestoreDataSource.delete(COLLECTIONS.FAIRS, fairId);
  }

  /**
   * Update fair status
   * @param {string} fairId
   * @param {string} status - upcoming, ongoing, past
   * @returns {Promise<void>}
   */
  async updateStatus(fairId, status) {
    await this.update(fairId, { status });
  }

  /**
   * Update all fair statuses based on dates
   * This should be called periodically to keep statuses up to date
   * @returns {Promise<void>}
   */
  async updateAllStatuses() {
    const allFairs = await this.getAll({ limit: 100 });
    const now = new Date();

    for (const fair of allFairs) {
      const startDate = fair.startDate?.toDate ? fair.startDate.toDate() : new Date(fair.startDate);
      const endDate = fair.endDate?.toDate ? fair.endDate.toDate() : new Date(fair.endDate);

      let newStatus;
      if (now < startDate) {
        newStatus = 'upcoming';
      } else if (now >= startDate && now <= endDate) {
        newStatus = 'ongoing';
      } else {
        newStatus = 'past';
      }

      if (fair.status !== newStatus) {
        await this.updateStatus(fair.id, newStatus);
      }
    }
  }

  /**
   * Check if fair exists
   * @param {string} fairId
   * @returns {Promise<boolean>}
   */
  async exists(fairId) {
    return await this.firestoreDataSource.exists(COLLECTIONS.FAIRS, fairId);
  }
}

export default FairsRepository;
