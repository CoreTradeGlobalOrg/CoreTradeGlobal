/**
 * Offer Repository
 *
 * Manages offer data in the deals/{dealId}/offers subcollection.
 * Provides access to offer history for a deal.
 *
 * All writes go through Cloud Functions — this repository is READ-only for clients.
 */

import { COLLECTIONS, SUBCOLLECTIONS } from '@/core/constants/collections';
import { Offer } from '@/domain/entities/Offer';

export class OfferRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Get all offers for a deal, ordered by round ascending
   * Returns the complete offer history for the deal page timeline.
   *
   * @param {string} dealId - Deal document ID
   * @returns {Promise<Offer[]>} Offers sorted by round ascending
   */
  async getByDealId(dealId) {
    const data = await this.firestoreDataSource.querySubcollection(
      COLLECTIONS.DEALS,
      dealId,
      SUBCOLLECTIONS.OFFERS,
      {
        orderBy: [['round', 'asc']],
      }
    );

    return data.map((d) => Offer.fromFirestore(d));
  }

  /**
   * Subscribe to all offers for a deal in real-time
   * Used by the deal page to display the offer timeline with live updates.
   *
   * @param {string} dealId - Deal document ID
   * @param {Function} callback - Called with Offer[] sorted by round ascending
   * @returns {Function} Unsubscribe function
   */
  subscribeToOffers(dealId, callback) {
    return this.firestoreDataSource.subscribeToSubcollection(
      COLLECTIONS.DEALS,
      dealId,
      SUBCOLLECTIONS.OFFERS,
      {
        orderBy: [['round', 'asc']],
      },
      (data) => {
        callback(data.map((d) => Offer.fromFirestore(d)));
      },
      (error) => {
        console.error('[DEBUG] OFFERS subscription failed:', error);
      }
    );
  }
}

export default OfferRepository;
