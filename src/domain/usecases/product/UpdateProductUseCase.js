/**
 * Update Product Use Case
 *
 * Handles the business logic for product updates
 * Validates ownership, handles image updates
 */

export class UpdateProductUseCase {
  /**
   * Constructor
   * @param {ProductRepository} productRepository
   */
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  /**
   * Execute product update
   * @param {string} productId - Product ID to update
   * @param {string} userId - User ID performing the update
   * @param {Object} updateData - Data to update
   * @param {Array<File>} newImageFiles - Optional new image files to add
   * @returns {Promise<Object>} Updated product
   * @throws {Error} If validation fails or update fails
   */
  async execute(productId, userId, updateData, newImageFiles = []) {
    // 1. Validate product ID
    if (!productId) {
      throw new Error('Product ID is required');
    }

    try {
      // 2. Get existing product
      const existingProduct = await this.productRepository.getById(productId);

      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // 3. Validate ownership
      if (existingProduct.userId !== userId) {
        throw new Error('You do not have permission to update this product');
      }

      // 4. Validate update data
      if (updateData.name) {
        this.validateName(updateData.name);
      }
      if (updateData.price !== undefined) {
        this.validatePrice(updateData.price);
      }
      if (updateData.stockQuantity !== undefined) {
        this.validateStockQuantity(updateData.stockQuantity);
      }
      if (updateData.description) {
        this.validateDescription(updateData.description);
      }

      // 5. Handle new image uploads
      let imageUrls = existingProduct.images || [];
      if (newImageFiles && newImageFiles.length > 0) {
        // Check total image count
        if (imageUrls.length + newImageFiles.length > 5) {
          throw new Error('Maximum 5 images allowed. Remove existing images first.');
        }

        try {
          const newImageUrls = await this.productRepository.uploadProductImages(
            userId,
            productId,
            newImageFiles
          );
          imageUrls = [...imageUrls, ...newImageUrls];
        } catch (imageError) {
          console.error('Failed to upload new images:', imageError);
          // Don't fail update if image upload fails
        }
      }

      // 6. Prepare update payload
      const updatePayload = {
        ...updateData,
        images: imageUrls,
        updatedAt: new Date(),
      };

      // Remove undefined values
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      // 7. Update product
      await this.productRepository.update(productId, updatePayload);

      // 8. Return updated product
      return {
        ...existingProduct,
        ...updatePayload,
        id: productId,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate product name
   * @param {string} name
   * @throws {Error} If invalid
   */
  validateName(name) {
    if (!name || name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    if (name.length < 2) {
      throw new Error('Product name must be at least 2 characters');
    }
    if (name.length > 200) {
      throw new Error('Product name is too long');
    }
  }

  /**
   * Validate stock quantity
   * @param {number} stockQuantity
   * @throws {Error} If invalid
   */
  validateStockQuantity(stockQuantity) {
    const quantity = parseInt(stockQuantity, 10);
    if (isNaN(quantity)) {
      throw new Error('Stock quantity must be a valid number');
    }
    if (quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }
  }

  /**
   * Validate price
   * @param {number} price
   * @throws {Error} If invalid
   */
  validatePrice(price) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      throw new Error('Price must be a valid number');
    }
    if (priceNum <= 0) {
      throw new Error('Price must be greater than 0');
    }
  }

  /**
   * Validate description
   * @param {string} description
   * @throws {Error} If invalid
   */
  validateDescription(description) {
    if (!description || description.trim().length === 0) {
      throw new Error('Product description is required');
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
    console.error('UpdateProductUseCase error:', error);
    return new Error(error.message || 'Failed to update product');
  }
}

export default UpdateProductUseCase;
