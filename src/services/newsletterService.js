/**
 * Newsletter Service
 * Handles all newsletter-related business logic and Firebase operations
 * Single Responsibility Principle: Only manages newsletter subscriptions
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validators } from '@/utils/validation';

class NewsletterService {
  constructor() {
    this.collectionName = process.env.NEXT_PUBLIC_NEWSLETTER_COLLECTION || 'newsletter';
  }

  /**
   * Subscribe a user to the newsletter
   * @param {string} email - User's email address
   * @param {Object} metadata - Additional metadata (optional)
   * @returns {Promise<Object>} { success: boolean, message: string, docId?: string }
   */
  async subscribe(email, metadata = {}) {
    try {
      // Validate email
      const validation = validators.email(email);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error,
        };
      }

      // Sanitize email
      const sanitizedEmail = validators.sanitizeEmail(email);

      // Prepare document data
      const docData = {
        email: sanitizedEmail,
        subscribedAt: serverTimestamp(),
        timestamp: Date.now(),
        source: metadata.source || 'landing_page',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ...metadata,
      };

      // Save to Firebase
      const docRef = await addDoc(collection(db, this.collectionName), docData);

      // Log success (you can replace with analytics)
      if (process.env.NODE_ENV === 'development') {
        console.log('Newsletter subscription successful:', docRef.id);
      }

      return {
        success: true,
        message: 'Thank you for subscribing! 🎉',
        docId: docRef.id,
      };
    } catch (error) {
      // Log error for debugging
      console.error('Newsletter subscription error:', error);

      // Handle specific Firebase errors
      if (error.code === 'permission-denied') {
        return {
          success: false,
          message: 'Unable to subscribe at this time. Please try again later.',
        };
      }

      if (error.code === 'unavailable') {
        return {
          success: false,
          message: 'Service temporarily unavailable. Please try again.',
        };
      }

      // Generic error message
      return {
        success: false,
        message: 'Something went wrong. Please try again.',
      };
    }
  }

  /**
   * Check if email already exists (future feature)
   * @param {string} email - Email to check
   * @returns {Promise<boolean>}
   */
  async isSubscribed(email) {
    // TODO: Implement duplicate check
    // This requires a Firestore index on email field
    return false;
  }
}

// Export singleton instance
export const newsletterService = new NewsletterService();
export default newsletterService;