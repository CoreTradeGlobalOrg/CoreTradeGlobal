/**
 * Update Request Use Case
 *
 * Handles the business logic for request updates
 * Validates ownership and input
 */

export class UpdateRequestUseCase {
  /**
   * Constructor
   * @param {RequestRepository} requestRepository
   */
  constructor(requestRepository) {
    this.requestRepository = requestRepository;
  }

  /**
   * Execute request update
   * @param {string} requestId - Request ID to update
   * @param {string} userId - User ID performing the update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated request
   * @throws {Error} If validation fails or update fails
   */
  async execute(requestId, userId, updateData) {
    // 1. Validate request ID
    if (!requestId) {
      throw new Error('Request ID is required');
    }

    try {
      // 2. Get existing request
      const existingRequest = await this.requestRepository.getById(requestId);

      if (!existingRequest) {
        throw new Error('Request not found');
      }

      // 3. Validate ownership
      if (existingRequest.userId !== userId) {
        throw new Error('You do not have permission to update this request');
      }

      // 4. Validate update data
      if (updateData.productName) {
        this.validateProductName(updateData.productName);
      }
      if (updateData.quantity !== undefined) {
        this.validateQuantity(updateData.quantity);
      }
      if (updateData.description) {
        this.validateDescription(updateData.description);
      }

      // 5. Prepare update payload
      const updatePayload = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Remove undefined values
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      // 6. Update request
      await this.requestRepository.update(requestId, updatePayload);

      // 7. Return updated request
      return {
        ...existingRequest,
        ...updatePayload,
        id: requestId,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate product name
   * @param {string} productName
   * @throws {Error} If invalid
   */
  validateProductName(productName) {
    if (!productName || productName.trim().length === 0) {
      throw new Error('Product name is required');
    }
    if (productName.length < 2) {
      throw new Error('Product name must be at least 2 characters');
    }
    if (productName.length > 200) {
      throw new Error('Product name is too long');
    }
  }

  /**
   * Validate quantity
   * @param {number} quantity
   * @throws {Error} If invalid
   */
  validateQuantity(quantity) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      throw new Error('Quantity must be a valid number');
    }
    if (qty <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
  }

  /**
   * Validate description
   * @param {string} description
   * @throws {Error} If invalid
   */
  validateDescription(description) {
    if (!description || description.trim().length === 0) {
      throw new Error('Description is required');
    }
    if (description.length < 10) {
      throw new Error('Description must be at least 10 characters');
    }
    if (description.length > 2000) {
      throw new Error('Description is too long');
    }
  }

  /**
   * Handle errors
   * @param {Error} error
   * @returns {Error}
   */
  handleError(error) {
    console.error('UpdateRequestUseCase error:', error);
    return new Error(error.message || 'Failed to update request');
  }
}

export default UpdateRequestUseCase;
