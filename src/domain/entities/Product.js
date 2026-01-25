/**
 * Product Entity
 *
 * This represents the Product domain model
 * Pure JavaScript class - framework independent
 *
 * Contains:
 * - Product properties
 * - Business logic methods (validation, permissions, etc.)
 */

export class Product {
  /**
   * Constructor
   * @param {string} id - Product ID
   * @param {string} userId - Owner user ID
   * @param {string} name - Product name
   * @param {string} categoryId - Category ID
   * @param {number} stockQuantity - Stock quantity
   * @param {string} unit - UNECE unit code (e.g., PCE, KGM, LTR)
   * @param {string} unitCategory - Unit category (e.g., Quantity, Weight, Volume)
   * @param {number} price - Product price
   * @param {string} currency - Price currency (USD, EUR, etc.)
   * @param {string} description - Product description
   * @param {Array<string>} images - Product image URLs
   * @param {string} status - Product status (active, inactive)
   * @param {Date} createdAt - Creation date
   * @param {Date} updatedAt - Last update date
   */
  constructor(
    id,
    userId,
    name,
    categoryId,
    stockQuantity,
    unit,
    unitCategory,
    price,
    currency,
    description,
    images,
    status,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.categoryId = categoryId;
    this.stockQuantity = stockQuantity || 0;
    this.unit = unit || 'PCE';
    this.unitCategory = unitCategory || 'Quantity';
    this.price = price || 0;
    this.currency = currency || 'USD';
    this.description = description || '';
    this.images = images || [];
    this.status = status || 'active';
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Product from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Product}
   */
  static fromFirestore(data) {
    return new Product(
      data.id,
      data.userId,
      data.name,
      data.categoryId,
      data.stockQuantity,
      data.unit,
      data.unitCategory,
      data.price,
      data.currency,
      data.description,
      data.images,
      data.status,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Convert Product to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      userId: this.userId,
      name: this.name,
      categoryId: this.categoryId,
      stockQuantity: this.stockQuantity,
      unit: this.unit,
      unitCategory: this.unitCategory,
      price: this.price,
      currency: this.currency,
      description: this.description,
      images: this.images,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if product is active
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Check if product is in stock
   * @returns {boolean}
   */
  isInStock() {
    return this.stockQuantity > 0;
  }

  /**
   * Check if user can edit this product
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canEdit(userId) {
    return this.userId === userId;
  }

  /**
   * Check if user can delete this product
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canDelete(userId) {
    return this.userId === userId;
  }

  /**
   * Get main product image
   * @returns {string|null}
   */
  getMainImage() {
    return this.images.length > 0 ? this.images[0] : null;
  }

  /**
   * Add image to product
   * @param {string} imageUrl - Image URL to add
   */
  addImage(imageUrl) {
    if (this.images.length < 5) {
      this.images.push(imageUrl);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove image from product
   * @param {number} index - Image index to remove
   */
  removeImage(index) {
    if (index >= 0 && index < this.images.length) {
      this.images.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Mark product as inactive
   */
  markAsInactive() {
    this.status = 'inactive';
    this.updatedAt = new Date();
  }

  /**
   * Mark product as active
   */
  markAsActive() {
    this.status = 'active';
    this.updatedAt = new Date();
  }

  /**
   * Update stock quantity
   * @param {number} quantity - New stock quantity
   */
  updateStock(quantity) {
    this.stockQuantity = Math.max(0, quantity);
    this.updatedAt = new Date();
  }

  /**
   * Format price with currency
   * @returns {string}
   */
  getFormattedPrice() {
    return `${this.price.toFixed(2)} ${this.currency}`;
  }

  /**
   * Format quantity with unit
   * @returns {string}
   */
  getFormattedQuantity() {
    return `${this.stockQuantity} ${this.unit}`;
  }

  /**
   * Check if user can manage this product
   * @param {string} userId - User ID to check
   * @param {Object} productData - Product data
   * @returns {boolean}
   */
  static canManageProduct(userId, productData) {
    return productData.userId === userId;
  }
}

export default Product;
