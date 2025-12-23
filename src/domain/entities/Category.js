/**
 * Category Entity
 *
 * This represents the Category domain model
 * Pure JavaScript class - framework independent
 *
 * Contains:
 * - Category properties
 * - Business logic methods
 */

export class Category {
  /**
   * Constructor
   * @param {string} id - Category ID
   * @param {string} name - Category name
   * @param {string} iconUrl - Category icon URL
   * @param {string|null} parentId - Parent category ID (null for top-level)
   * @param {Date} createdAt - Creation date
   */
  constructor(id, name, iconUrl, parentId, createdAt) {
    this.id = id;
    this.name = name;
    this.iconUrl = iconUrl || null;
    this.parentId = parentId || null;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Create Category from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Category}
   */
  static fromFirestore(data) {
    return new Category(
      data.id,
      data.name,
      data.iconUrl,
      data.parentId,
      data.createdAt
    );
  }

  /**
   * Convert Category to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      name: this.name,
      iconUrl: this.iconUrl,
      parentId: this.parentId,
      createdAt: this.createdAt,
    };
  }

  /**
   * Check if category is a parent category
   * @returns {boolean}
   */
  isParentCategory() {
    return this.parentId === null;
  }

  /**
   * Check if category has a parent
   * @returns {boolean}
   */
  hasParent() {
    return this.parentId !== null;
  }

  /**
   * Get category display name with icon
   * @returns {string}
   */
  getDisplayName() {
    return this.iconUrl ? `${this.name}` : this.name;
  }
}

export default Category;
