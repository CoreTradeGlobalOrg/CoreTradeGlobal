/**
 * Create Product Use Case
 *
 * Handles the business logic for product creation
 * Validates input, uploads images, and creates product in Firestore
 */

export class CreateProductUseCase {
  /**
   * Constructor
   * @param {ProductRepository} productRepository
   */
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  /**
   * Execute product creation
   * @param {Object} productData
   * @param {string} productData.userId - Owner user ID
   * @param {string} productData.name - Product name
   * @param {string} productData.categoryId - Category ID
   * @param {number} productData.stockQuantity - Stock quantity
   * @param {number} productData.price - Product price
   * @param {string} productData.currency - Price currency
   * @param {string} productData.description - Product description
   * @param {Array<File>} imageFiles - Optional image files (max 5)
   * @returns {Promise<Object>} Created product
   * @throws {Error} If validation fails or creation fails
   */
  async execute(productData, imageFiles = []) {
    const {
      userId,
      name,
      categoryId,
      stockQuantity,
      unit,
      unitCategory,
      price,
      currency,
      description,
      createdByAdmin,
    } = productData;

    // 1. Validate all inputs
    this.validateName(name);
    this.validateCategory(categoryId);
    this.validateStockQuantity(stockQuantity);
    this.validatePrice(price);
    this.validateCurrency(currency);
    this.validateDescription(description);
    this.validateImages(imageFiles);

    try {
      // 2. Prepare product data (without image URLs yet)
      const newProductData = {
        userId,
        name,
        categoryId,
        stockQuantity: parseInt(stockQuantity, 10),
        unit: unit || 'PCE',
        unitCategory: unitCategory || 'Quantity',
        price: parseFloat(price),
        currency: currency || 'USD',
        description,
        images: [],
        status: 'active',
        ...(createdByAdmin && { createdByAdmin }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3. Create product record
      const product = await this.productRepository.create(newProductData);

      // 4. Upload images if provided
      if (imageFiles && imageFiles.length > 0) {
        try {
          const imageUrls = await this.productRepository.uploadProductImages(
            userId,
            product.id,
            imageFiles
          );

          // Update product with image URLs
          await this.productRepository.update(product.id, {
            images: imageUrls,
            updatedAt: new Date(),
          });

          product.images = imageUrls;
        } catch (imageError) {
          console.error('Failed to upload product images:', imageError);
          // Don't fail product creation if image upload fails
        }
      }

      return product;
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
      throw new Error('Product category is required');
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
    if (priceNum < 0) {
      throw new Error('Price cannot be negative');
    }
  }

  /**
   * Validate currency
   * @param {string} currency
   * @throws {Error} If invalid
   */
  validateCurrency(currency) {
    if (!currency || currency.trim().length === 0) {
      throw new Error('Currency is required');
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
      throw new Error('Description is too long (max 2000 characters)');
    }
  }

  /**
   * Validate image files
   * @param {Array<File>} imageFiles
   * @throws {Error} If invalid
   */
  validateImages(imageFiles) {
    if (!imageFiles || !Array.isArray(imageFiles)) {
      return; // Images are optional
    }

    if (imageFiles.length > 5) {
      throw new Error('Maximum 5 images allowed');
    }

    imageFiles.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        throw new Error(`File ${index + 1} is not an image`);
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`Image ${index + 1} is too large (max 5MB)`);
      }
    });
  }

  /**
   * Handle errors and provide user-friendly messages
   * @param {Error} error
   * @returns {Error}
   */
  handleError(error) {
    console.error('CreateProductUseCase error:', error);
    return new Error(error.message || 'Failed to create product');
  }
}

export default CreateProductUseCase;
