/**
 * Fair Entity
 *
 * This represents the Fair domain model for trade fairs/exhibitions
 * Pure JavaScript class - framework independent
 *
 * Contains:
 * - Fair properties
 * - Business logic methods (validation, status checks, etc.)
 */

export class Fair {
  /**
   * Constructor
   * @param {string} id - Fair ID
   * @param {string} name - Fair name
   * @param {string} location - Fair location
   * @param {Date} startDate - Fair start date
   * @param {Date} endDate - Fair end date
   * @param {string} description - Fair description
   * @param {string} imageUrl - Fair image URL
   * @param {string} websiteUrl - Fair website URL
   * @param {string} status - Fair status (upcoming, ongoing, past)
   * @param {Date} createdAt - Creation date
   * @param {Date} updatedAt - Last update date
   */
  constructor(
    id,
    name,
    location,
    startDate,
    endDate,
    description,
    imageUrl,
    websiteUrl,
    status,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.name = name;
    this.location = location || '';
    this.startDate = startDate;
    this.endDate = endDate;
    this.description = description || '';
    this.imageUrl = imageUrl || '';
    this.websiteUrl = websiteUrl || '';
    this.status = status || 'upcoming';
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Create Fair from Firestore document
   * @param {Object} data - Firestore document data
   * @returns {Fair}
   */
  static fromFirestore(data) {
    return new Fair(
      data.id,
      data.name,
      data.location,
      data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      data.description,
      data.imageUrl,
      data.websiteUrl,
      data.status,
      data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    );
  }

  /**
   * Convert Fair to Firestore document
   * @returns {Object}
   */
  toFirestore() {
    return {
      name: this.name,
      location: this.location,
      startDate: this.startDate,
      endDate: this.endDate,
      description: this.description,
      imageUrl: this.imageUrl,
      websiteUrl: this.websiteUrl,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if fair is upcoming
   * @returns {boolean}
   */
  isUpcoming() {
    return this.status === 'upcoming';
  }

  /**
   * Check if fair is ongoing
   * @returns {boolean}
   */
  isOngoing() {
    return this.status === 'ongoing';
  }

  /**
   * Check if fair is past
   * @returns {boolean}
   */
  isPast() {
    return this.status === 'past';
  }

  /**
   * Calculate status based on current date
   * @returns {string}
   */
  calculateStatus() {
    const now = new Date();
    if (now < this.startDate) {
      return 'upcoming';
    } else if (now >= this.startDate && now <= this.endDate) {
      return 'ongoing';
    } else {
      return 'past';
    }
  }

  /**
   * Update status based on current date
   */
  updateStatusByDate() {
    this.status = this.calculateStatus();
    this.updatedAt = new Date();
  }

  /**
   * Get formatted date range
   * @returns {string}
   */
  getFormattedDateRange() {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const start = this.startDate.toLocaleDateString('tr-TR', options);
    const end = this.endDate.toLocaleDateString('tr-TR', options);
    return `${start} - ${end}`;
  }

  /**
   * Get days until fair starts
   * @returns {number|null}
   */
  getDaysUntilStart() {
    if (this.status !== 'upcoming') return null;
    const now = new Date();
    const diffTime = this.startDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Get duration in days
   * @returns {number}
   */
  getDurationDays() {
    const diffTime = this.endDate - this.startDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

export default Fair;
