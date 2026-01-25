/**
 * News Repository
 *
 * This repository manages trade news/articles in Firestore
 *
 * Responsibilities:
 * - News CRUD operations
 * - News queries (by category, published, etc.)
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class NewsRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Create new news article
   * @param {Object} newsData
   * @returns {Promise<Object>}
   */
  async create(newsData) {
    return await this.firestoreDataSource.create(COLLECTIONS.NEWS, {
      ...newsData,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get news by ID
   * @param {string} newsId
   * @returns {Promise<Object|null>}
   */
  async getById(newsId) {
    return await this.firestoreDataSource.getById(COLLECTIONS.NEWS, newsId);
  }

  /**
   * Get all news articles
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAll(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.NEWS, {
      orderBy: options.orderBy || [['publishedAt', 'desc']],
      limit: options.limit || 50,
    });
  }

  /**
   * Get published news articles
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getPublished(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.NEWS, {
      where: [['status', '==', 'published']],
      orderBy: options.orderBy || [['publishedAt', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get draft news articles
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getDrafts(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.NEWS, {
      where: [['status', '==', 'draft']],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get news by category
   * @param {string} category
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getByCategory(category, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.NEWS, {
      where: [
        ['category', '==', category],
        ['status', '==', 'published'],
      ],
      orderBy: options.orderBy || [['publishedAt', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get latest published news
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getLatest(limit = 5) {
    return await this.getPublished({ limit });
  }

  /**
   * Get most viewed news
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getMostViewed(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.NEWS, {
      where: [['status', '==', 'published']],
      orderBy: [['viewCount', 'desc']],
      limit: options.limit || 10,
    });
  }

  /**
   * Update news article
   * @param {string} newsId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(newsId, data) {
    await this.firestoreDataSource.update(COLLECTIONS.NEWS, newsId, {
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete news article
   * @param {string} newsId
   * @returns {Promise<void>}
   */
  async delete(newsId) {
    await this.firestoreDataSource.delete(COLLECTIONS.NEWS, newsId);
  }

  /**
   * Publish news article
   * @param {string} newsId
   * @returns {Promise<void>}
   */
  async publish(newsId) {
    await this.update(newsId, {
      status: 'published',
      publishedAt: new Date(),
    });
  }

  /**
   * Unpublish news article (set to draft)
   * @param {string} newsId
   * @returns {Promise<void>}
   */
  async unpublish(newsId) {
    await this.update(newsId, { status: 'draft' });
  }

  /**
   * Increment view count
   * @param {string} newsId
   * @returns {Promise<void>}
   */
  async incrementViewCount(newsId) {
    const news = await this.getById(newsId);
    if (news) {
      await this.firestoreDataSource.update(COLLECTIONS.NEWS, newsId, {
        viewCount: (news.viewCount || 0) + 1,
      });
    }
  }

  /**
   * Check if news exists
   * @param {string} newsId
   * @returns {Promise<boolean>}
   */
  async exists(newsId) {
    return await this.firestoreDataSource.exists(COLLECTIONS.NEWS, newsId);
  }
}

export default NewsRepository;
