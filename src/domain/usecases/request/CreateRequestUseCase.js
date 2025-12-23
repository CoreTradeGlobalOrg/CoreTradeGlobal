/**
 * Create Request Use Case
 *
 * Handles the business logic for request (RFQ) creation
 * Validates input and creates request in Firestore
 */

export class CreateRequestUseCase {
  /**
   * Constructor
   * @param {RequestRepository} requestRepository
   */
  constructor(requestRepository) {
    this.requestRepository = requestRepository;
  }

  /**
   * Execute request creation
   * @param {Object} requestData
   * @param {string} requestData.userId - Owner user ID
   * @param {string} requestData.productName - Requested product name
   * @param {string} requestData.categoryId - Category ID
   * @param {string} requestData.targetCountry - Target country
   * @param {number} requestData.quantity - Requested quantity
   * @param {string} requestData.description - Request description
   * @returns {Promise<Object>} Created request
   * @throws {Error} If validation fails or creation fails
   */
  async execute(requestData) {
    const {
      userId,
      productName,
      categoryId,
      targetCountry,
      quantity,
      description,
    } = requestData;

    // 1. Validate all inputs
    this.validateProductName(productName);
    this.validateCategory(categoryId);
    this.validateTargetCountry(targetCountry);
    this.validateQuantity(quantity);
    this.validateDescription(description);

    try {
      // 2. Prepare request data
      const newRequestData = {
        userId,
        productName,
        categoryId,
        targetCountry,
        quantity: parseInt(quantity, 10),
        description,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3. Create request record
      const request = await this.requestRepository.create(newRequestData);

      return request;
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
      throw new Error('Product name is too long (max 200 characters)');
    }
  }

  /**
   * Validate category ID
   * @param {string} categoryId
   * @throws {Error} If invalid
   */
  validateCategory(categoryId) {
    if (!categoryId || categoryId.trim().length === 0) {
      throw new Error('Category is required');
    }
  }

  /**
   * Validate target country
   * @param {string} targetCountry
   * @throws {Error} If invalid
   */
  validateTargetCountry(targetCountry) {
    if (!targetCountry || targetCountry.trim().length === 0) {
      throw new Error('Target country is required');
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
      throw new Error('Description is too long (max 2000 characters)');
    }
  }

  /**
   * Handle errors
   * @param {Error} error
   * @returns {Error}
   */
  handleError(error) {
    console.error('CreateRequestUseCase error:', error);
    return new Error(error.message || 'Failed to create request');
  }
}

export default CreateRequestUseCase;
