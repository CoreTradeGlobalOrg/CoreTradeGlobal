/**
 * Delete Request Use Case
 *
 * Handles the business logic for request deletion
 * Validates ownership and deletes request record
 */

export class DeleteRequestUseCase {
  /**
   * Constructor
   * @param {RequestRepository} requestRepository
   */
  constructor(requestRepository) {
    this.requestRepository = requestRepository;
  }

  /**
   * Execute request deletion
   * @param {string} requestId - Request ID to delete
   * @param {string} userId - User ID performing the deletion
   * @returns {Promise<void>}
   * @throws {Error} If validation fails or deletion fails
   */
  async execute(requestId, userId, { isAdmin = false } = {}) {
    // 1. Validate inputs
    if (!requestId) {
      throw new Error('Request ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // 2. Get existing request
      const request = await this.requestRepository.getById(requestId);

      if (!request) {
        throw new Error('Request not found');
      }

      // 3. Validate ownership (admins can delete any request)
      if (!isAdmin && request.userId !== userId) {
        throw new Error('You do not have permission to delete this request');
      }

      // 4. Delete request record
      await this.requestRepository.delete(requestId);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle errors
   * @param {Error} error
   * @returns {Error}
   */
  handleError(error) {
    console.error('DeleteRequestUseCase error:', error);
    return new Error(error.message || 'Failed to delete request');
  }
}

export default DeleteRequestUseCase;
