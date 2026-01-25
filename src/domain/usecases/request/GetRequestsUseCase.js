/**
 * Get Requests Use Case
 *
 * Handles the business logic for fetching requests
 * Supports filtering by user, category, country, status
 */

export class GetRequestsUseCase {
  /**
   * Constructor
   * @param {RequestRepository} requestRepository
   */
  constructor(requestRepository) {
    this.requestRepository = requestRepository;
  }

  /**
   * Get requests by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Requests
   */
  async getByUserId(userId, options = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      return await this.requestRepository.getByUserId(userId, options);
    } catch (error) {
      console.error('GetRequestsUseCase error (getByUserId):', error);
      throw new Error('Failed to fetch requests');
    }
  }

  /**
   * Get requests by category ID
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Requests
   */
  async getByCategoryId(categoryId, options = {}) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    try {
      return await this.requestRepository.getByCategoryId(categoryId, options);
    } catch (error) {
      console.error('GetRequestsUseCase error (getByCategoryId):', error);
      throw new Error('Failed to fetch requests');
    }
  }

  /**
   * Get requests by target country
   * @param {string} targetCountry - Target country
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Requests
   */
  async getByTargetCountry(targetCountry, options = {}) {
    if (!targetCountry) {
      throw new Error('Target country is required');
    }

    try {
      return await this.requestRepository.getByTargetCountry(
        targetCountry,
        options
      );
    } catch (error) {
      console.error('GetRequestsUseCase error (getByTargetCountry):', error);
      throw new Error('Failed to fetch requests');
    }
  }

  /**
   * Get active requests by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Active requests
   */
  async getActiveByUserId(userId, options = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      return await this.requestRepository.getActiveByUserId(userId, options);
    } catch (error) {
      console.error('GetRequestsUseCase error (getActiveByUserId):', error);
      throw new Error('Failed to fetch active requests');
    }
  }

  /**
   * Get all active requests
   * @param {Object} options - Query options
   * @returns {Promise<Array>} All active requests
   */
  async getAllActive(options = {}) {
    try {
      return await this.requestRepository.getAllActive(options);
    } catch (error) {
      console.error('GetRequestsUseCase error (getAllActive):', error);
      throw new Error('Failed to fetch requests');
    }
  }
}

export default GetRequestsUseCase;
