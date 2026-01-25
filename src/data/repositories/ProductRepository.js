/**
 * Product Repository
 *
 * This repository manages product data in Firestore and product images in Storage
 *
 * Responsibilities:
 * - Product CRUD operations
 * - Product image upload/delete
 * - Product queries (by user, by category, etc.)
 */

import { COLLECTIONS } from '@/core/constants/collections';

export class ProductRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   * @param {FirebaseStorageDataSource} storageDataSource
   */
  constructor(firestoreDataSource, storageDataSource) {
    this.firestoreDataSource = firestoreDataSource;
    this.storageDataSource = storageDataSource;
  }

  /**
   * Create new product
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  async create(productData) {
    const product = await this.firestoreDataSource.create(
      COLLECTIONS.PRODUCTS,
      productData
    );

    // Add product ID to user's productIds array
    if (productData.userId && product.id) {
      try {
        const user = await this.firestoreDataSource.getById(
          COLLECTIONS.USERS,
          productData.userId
        );
        const currentProductIds = user?.productIds || [];

        await this.firestoreDataSource.update(
          COLLECTIONS.USERS,
          productData.userId,
          {
            productIds: [...currentProductIds, product.id],
          }
        );
      } catch (error) {
        console.error('Failed to update user productIds:', error);
        // Don't throw - product is already created
      }
    }

    return product;
  }

  /**
   * Get product by ID
   * @param {string} productId
   * @returns {Promise<Object|null>}
   */
  async getById(productId) {
    return await this.firestoreDataSource.getById(
      COLLECTIONS.PRODUCTS,
      productId
    );
  }

  /**
   * Get all products by user ID
   * Fetches products from user's productIds array
   * @param {string} userId
   * @param {Object} options - Query options (orderBy, limit, etc.)
   * @returns {Promise<Array>}
   */
  async getByUserId(userId, options = {}) {
    try {
      const user = await this.firestoreDataSource.getById(COLLECTIONS.USERS, userId);

      if (!user || !user.productIds || user.productIds.length === 0) {
        return [];
      }

      const productPromises = user.productIds.map((productId) =>
        this.firestoreDataSource.getById(COLLECTIONS.PRODUCTS, productId)
      );

      const products = await Promise.all(productPromises);

      const validProducts = products
        .filter((product) => product !== null)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

      return options.limit ? validProducts.slice(0, options.limit) : validProducts;
    } catch (error) {
      console.error('Error in getByUserId:', error);
      return [];
    }
  }

  /**
   * Get products by category ID
   * @param {string} categoryId
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getByCategoryId(categoryId, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.PRODUCTS, {
      where: [
        ['categoryId', '==', categoryId],
        ['status', '==', 'active'],
      ],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit || 20,
    });
  }

  /**
   * Get active products by user
   * @param {string} userId
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getActiveByUserId(userId, options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.PRODUCTS, {
      where: [
        ['userId', '==', userId],
        ['status', '==', 'active'],
      ],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit,
    });
  }

  /**
   * Get all active products
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllActive(options = {}) {
    return await this.firestoreDataSource.query(COLLECTIONS.PRODUCTS, {
      where: [['status', '==', 'active']],
      orderBy: options.orderBy || [['createdAt', 'desc']],
      limit: options.limit || 50,
    });
  }

  /**
   * Update product
   * @param {string} productId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(productId, data) {
    await this.firestoreDataSource.update(COLLECTIONS.PRODUCTS, productId, data);
  }

  /**
   * Delete product (soft delete by marking as inactive)
   * Also removes from user's productIds array
   * @param {string} productId
   * @returns {Promise<void>}
   */
  async delete(productId) {
    // Get product to find userId
    const product = await this.firestoreDataSource.getById(
      COLLECTIONS.PRODUCTS,
      productId
    );

    // Soft delete the product
    await this.firestoreDataSource.update(COLLECTIONS.PRODUCTS, productId, {
      status: 'inactive',
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    // Remove from user's productIds array
    if (product && product.userId) {
      try {
        const user = await this.firestoreDataSource.getById(
          COLLECTIONS.USERS,
          product.userId
        );

        if (user && user.productIds) {
          const updatedProductIds = user.productIds.filter(
            (id) => id !== productId
          );

          await this.firestoreDataSource.update(
            COLLECTIONS.USERS,
            product.userId,
            {
              productIds: updatedProductIds,
            }
          );
        }
      } catch (error) {
        console.error('Failed to update user productIds on delete:', error);
        // Don't throw - product is already deleted
      }
    }
  }

  /**
   * Hard delete product (permanently remove)
   * @param {string} productId
   * @returns {Promise<void>}
   */
  async hardDelete(productId) {
    await this.firestoreDataSource.delete(COLLECTIONS.PRODUCTS, productId);
  }

  /**
   * Upload single product image
   * @param {string} userId
   * @param {string} productId
   * @param {File} file
   * @param {number} index - Image index (0-4)
   * @returns {Promise<string>} Download URL
   */
  async uploadProductImage(userId, productId, file, index = 0) {
    const fileExtension = file.name.split('.').pop();
    const fileName = `image-${index}.${fileExtension}`;
    const storagePath = `${userId}/products/${productId}/${fileName}`;

    return await this.storageDataSource.uploadFile(storagePath, file, {
      userId,
      productId,
      uploadType: 'product-image',
      imageIndex: index,
    });
  }

  /**
   * Upload multiple product images
   * @param {string} userId
   * @param {string} productId
   * @param {Array<File>} files
   * @returns {Promise<Array<string>>} Array of download URLs
   */
  async uploadProductImages(userId, productId, files) {
    const uploadPromises = files.map((file, index) =>
      this.uploadProductImage(userId, productId, file, index)
    );
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete product image from storage
   * @param {string} userId
   * @param {string} productId
   * @param {number} index - Image index
   * @param {string} extension - File extension
   * @returns {Promise<void>}
   */
  async deleteProductImage(userId, productId, index, extension = 'jpg') {
    const storagePath = `${userId}/products/${productId}/image-${index}.${extension}`;
    try {
      await this.storageDataSource.deleteFile(storagePath);
    } catch (error) {
      // Ignore if file doesn't exist
      console.warn(`Failed to delete image at ${storagePath}:`, error.message);
    }
  }

  /**
   * Delete all product images
   * @param {string} userId
   * @param {string} productId
   * @param {Array<string>} imageUrls - Array of image URLs to extract extensions
   * @returns {Promise<void>}
   */
  async deleteAllProductImages(userId, productId, imageUrls = []) {
    const deletePromises = imageUrls.map((url, index) => {
      // Extract extension from URL
      const extension = url.split('.').pop().split('?')[0]; // Remove query params
      return this.deleteProductImage(userId, productId, index, extension);
    });

    await Promise.allSettled(deletePromises);
  }

  /**
   * Check if product exists
   * @param {string} productId
   * @returns {Promise<boolean>}
   */
  async exists(productId) {
    return await this.firestoreDataSource.exists(
      COLLECTIONS.PRODUCTS,
      productId
    );
  }
}

export default ProductRepository;
