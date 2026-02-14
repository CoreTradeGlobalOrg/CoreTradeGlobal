/**
 * Delete Product Use Case
 *
 * Handles the business logic for product deletion
 * Validates ownership, deletes images from storage, deletes product record
 */

export class DeleteProductUseCase {
  /**
   * Constructor
   * @param {ProductRepository} productRepository
   */
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  /**
   * Execute product deletion
   * @param {string} productId - Product ID to delete
   * @param {string} userId - User ID performing the deletion
   * @returns {Promise<void>}
   * @throws {Error} If validation fails or deletion fails
   */
  async execute(productId, userId, { isAdmin = false } = {}) {
    // 1. Validate inputs
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // 2. Get existing product
      const product = await this.productRepository.getById(productId);

      if (!product) {
        throw new Error('Product not found');
      }

      // 3. Validate ownership (admins can delete any product)
      if (!isAdmin && product.userId !== userId) {
        throw new Error('You do not have permission to delete this product');
      }

      // 4. Delete product images from storage
      if (product.images && product.images.length > 0) {
        try {
          await this.productRepository.deleteAllProductImages(
            userId,
            productId,
            product.images
          );
        } catch (imageError) {
          console.error('Failed to delete product images:', imageError);
          // Continue with product deletion even if image deletion fails
        }
      }

      // 5. Delete product record (soft delete)
      await this.productRepository.delete(productId);
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
    console.error('DeleteProductUseCase error:', error);
    return new Error(error.message || 'Failed to delete product');
  }
}

export default DeleteProductUseCase;
