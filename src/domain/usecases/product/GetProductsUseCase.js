/**
 * Get Products Use Case
 *
 * Handles the business logic for fetching products
 * Supports filtering by user, category, status
 */

export class GetProductsUseCase {
  /**
   * Constructor
   * @param {ProductRepository} productRepository
   */
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  /**
   * Get products by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Products
   */
  async getByUserId(userId, options = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      return await this.productRepository.getByUserId(userId, options);
    } catch (error) {
      console.error('GetProductsUseCase error (getByUserId):', error);
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get products by category ID
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Products
   */
  async getByCategoryId(categoryId, options = {}) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    try {
      return await this.productRepository.getByCategoryId(categoryId, options);
    } catch (error) {
      console.error('GetProductsUseCase error (getByCategoryId):', error);
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get active products by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Active products
   */
  async getActiveByUserId(userId, options = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      return await this.productRepository.getActiveByUserId(userId, options);
    } catch (error) {
      console.error('GetProductsUseCase error (getActiveByUserId):', error);
      throw new Error('Failed to fetch active products');
    }
  }

  /**
   * Get all active products
   * @param {Object} options - Query options
   * @returns {Promise<Array>} All active products
   */
  async getAllActive(options = {}) {
    try {
      return await this.productRepository.getAllActive(options);
    } catch (error) {
      console.error('GetProductsUseCase error (getAllActive):', error);
      throw new Error('Failed to fetch products');
    }
  }
}

export default GetProductsUseCase;
