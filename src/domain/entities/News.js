/**
 * News Entity
 *
 * This represents the News domain model for trade news/articles
 * Pure JavaScript class - framework independent
 *
 * Contains:
 * - News properties
 * - Business logic methods (validation, status checks, etc.)
 */

export class News {
  /**
   * Constructor
   * @param {string} id - News ID
   * @param {string} title - News title
   * @param {string} excerpt - Short excerpt/summary
   * @param {string} content - Full news content
   * @param {string} category - News category (Logistics, Regulations, Trends, etc.)
   * @param {string} imageUrl - News image URL
   * @param {string} sourceUrl - Original source URL
   * @param {string} sourceName - Source name
   * @param {Date} publishedAt - Publication date
   * @param {string} status - News status (published, draft)
   * @param {number} viewCount - View count
   * @param {Date} createdAt - Creation date
   * @param {Date} updatedAt - Last update date
   */
  constructor(
    id,
    title,
    excerpt,
    content,
    category,
    imageUrl,
    sourceUrl,
    sourceName,
    publishedAt,
    status,
    viewCount,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.title = title;
    this.excerpt = excerpt || '';
    this.content = content || '';
    this.category = category || 'General';
    this.imageUrl = imageUrl || '';
    this.sourceUrl = sourceUrl || '';
    this.sourceName = sourceName || '';
    this.publishedAt = publishedAt || new Date();
    this.status = status || 'draft';
    this.viewCount = viewCount || 0;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create News from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {News}
   */
  static fromFirestore(data) {
    return new News(
      data.id,
      data.title,
      data.excerpt,
      data.content,
      data.category,
      data.imageUrl,
      data.sourceUrl,
      data.sourceName,
      data.publishedAt?.toDate ? data.publishedAt.toDate() : data.publishedAt,
      data.status,
      data.viewCount,
      data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    );
  }

  /**
   * Convert News to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      title: this.title,
      excerpt: this.excerpt,
      content: this.content,
      category: this.category,
      imageUrl: this.imageUrl,
      sourceUrl: this.sourceUrl,
      sourceName: this.sourceName,
      publishedAt: this.publishedAt,
      status: this.status,
      viewCount: this.viewCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if news is published
   * @returns {boolean}
   */
  isPublished() {
    return this.status === 'published';
  }

  /**
   * Check if news is draft
   * @returns {boolean}
   */
  isDraft() {
    return this.status === 'draft';
  }

  /**
   * Publish the news
   */
  publish() {
    this.status = 'published';
    this.publishedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Unpublish the news (make draft)
   */
  unpublish() {
    this.status = 'draft';
    this.updatedAt = new Date();
  }

  /**
   * Increment view count
   */
  incrementViewCount() {
    this.viewCount += 1;
  }

  /**
   * Get formatted publication date
   * @returns {string}
   */
  getFormattedDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return this.publishedAt.toLocaleDateString('tr-TR', options);
  }

  /**
   * Get relative time string (e.g., "2 days ago")
   * @returns {string}
   */
  getRelativeTime() {
    const now = new Date();
    const diffTime = now - this.publishedAt;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} dakika önce`;
    } else if (diffHours < 24) {
      return `${diffHours} saat önce`;
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} hafta önce`;
    } else {
      return this.getFormattedDate();
    }
  }

  /**
   * Get truncated excerpt
   * @param {number} maxLength - Maximum length
   * @returns {string}
   */
  getTruncatedExcerpt(maxLength = 150) {
    if (this.excerpt.length <= maxLength) {
      return this.excerpt;
    }
    return this.excerpt.substring(0, maxLength).trim() + '...';
  }

  /**
   * Get category color class
   * @returns {string}
   */
  getCategoryColor() {
    const colors = {
      'Logistics': 'blue',
      'Regulations': 'red',
      'Trends': 'green',
      'Technology': 'purple',
      'Markets': 'orange',
      'General': 'gray',
    };
    return colors[this.category] || 'gray';
  }
}

export default News;
