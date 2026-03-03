/**
 * Quote Repository
 *
 * Manages real-time subscriptions to the providerQuotes subcollection.
 *
 * Two subscription patterns:
 *   - Request view: all quotes under a single quoteRequest (provider's submitted quote)
 *   - Deal view: all quotes across all requests for a deal (buyer comparison view)
 *
 * IMPORTANT: Subcollection is named `providerQuotes` (not `quotes`) to avoid
 * collision with the existing `requests/{id}/quotes` subcollection.
 * See Research Pitfall 7.
 *
 * Follows the ContractRepository.js pattern exactly.
 * All subscription methods return an unsubscribe function for cleanup on unmount.
 */

import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { Quote } from '@/domain/entities/Quote';

export class QuoteRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Subscribe to all provider quotes under a specific quote request.
   * Used by the provider to view/edit their submitted quote.
   *
   * Path: quoteRequests/{requestId}/providerQuotes
   *
   * @param {string} requestId - Parent QuoteRequest document ID
   * @param {string} userId - Current user's UID (required for Firestore rules — participants array-contains)
   * @param {Function} callback - Called with Quote[] on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToQuotesForRequest(requestId, userId, callback) {
    const q = query(
      collection(db, 'quoteRequests', requestId, 'providerQuotes'),
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const quotes = snap.docs.map((doc) =>
          Quote.fromFirestore({ id: doc.id, ...doc.data() })
        );
        callback(quotes);
      },
      (error) => {
        console.error('QuoteRepository.subscribeToQuotesForRequest error:', error);
      }
    );
  }

  /**
   * Subscribe to all provider quotes for a specific deal across all quote requests.
   * Used by the buyer comparison view to show all submitted quotes for a deal.
   *
   * Uses collectionGroup('providerQuotes') with a dealId filter.
   * NOTE: This requires a composite index on providerQuotes: dealId + createdAt.
   *       Deploy index via firebase.indexes.json before using in production.
   *
   * @param {string} dealId - Deal ID to subscribe to
   * @param {Function} callback - Called with Quote[] on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToQuotesForDeal(dealId, callback) {
    const q = query(
      collectionGroup(db, 'providerQuotes'),
      where('dealId', '==', dealId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const quotes = snap.docs.map((doc) =>
          Quote.fromFirestore({ id: doc.id, ...doc.data() })
        );
        callback(quotes);
      },
      (error) => {
        console.error('QuoteRepository.subscribeToQuotesForDeal error:', error);
      }
    );
  }
}

export default QuoteRepository;
