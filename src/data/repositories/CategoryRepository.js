/**
 * Category Repository
 *
 * This repository manages category data in Firestore
 *
 * Responsibilities:
 * - Category CRUD operations (mostly read operations)
 * - Category queries (parent categories, subcategories)
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class CategoryRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Get all categories
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAll(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.CATEGORIES, {
      orderBy: options.orderBy || [['name', 'asc']],
      limit: options.limit,
    });
  }

  /**
   * Get category by ID
   * @param {string} categoryId
   * @returns {Promise<Object|null>}
   */
  async getById(categoryId) {
    return await this.firestoreDataSource.getById(
      COLLECTIONS.CATEGORIES,
      categoryId
    );
  }

  /**
   * Get parent categories (top-level categories)
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getParentCategories(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.CATEGORIES, {
      where: [['parentId', '==', null]],
      orderBy: options.orderBy || [['name', 'asc']],
      limit: options.limit,
    });
  }

  /**
   * Get subcategories of a parent category
   * @param {string} parentId - Parent category ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getSubCategories(parentId, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.CATEGORIES, {
      where: [['parentId', '==', parentId]],
      orderBy: options.orderBy || [['name', 'asc']],
      limit: options.limit,
    });
  }

  /**
   * Create new category (admin only)
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  async create(categoryData) {
    return await this.firestoreDataSource.create(
      COLLECTIONS.CATEGORIES,
      categoryData
    );
  }

  /**
   * Update category (admin only)
   * @param {string} categoryId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(categoryId, data) {
    await this.firestoreDataSource.update(
      COLLECTIONS.CATEGORIES,
      categoryId,
      data
    );
  }

  /**
   * Delete category (admin only)
   * @param {string} categoryId
   * @returns {Promise<void>}
   */
  async delete(categoryId) {
    await this.firestoreDataSource.delete(COLLECTIONS.CATEGORIES, categoryId);
  }

  /**
   * Check if category exists
   * @param {string} categoryId
   * @returns {Promise<boolean>}
   */
  async exists(categoryId) {
    return await this.firestoreDataSource.exists(
      COLLECTIONS.CATEGORIES,
      categoryId
    );
  }
}

export default CategoryRepository;
