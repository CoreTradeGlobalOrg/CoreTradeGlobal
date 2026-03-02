/**
 * QuoteRequest Repository
 *
 * Manages real-time subscriptions to the quoteRequests collection.
 *
 * Two subscription patterns:
 *   - Provider view: all requests for a specific provider UID
 *   - Deal view: all requests for a specific deal (buyer/seller overview)
 *
 * Follows the ContractRepository.js pattern exactly.
 * All subscription methods return an unsubscribe function for cleanup on unmount.
 */

import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { QuoteRequest } from '@/domain/entities/QuoteRequest';

export class QuoteRequestRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Subscribe to all quote requests assigned to a specific provider.
   * Used by the provider kanban dashboard to populate all kanban columns.
   *
   * @param {string} providerUid - UID of the provider
   * @param {Function} callback - Called with QuoteRequest[] on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToRequestsForProvider(providerUid, callback) {
    const q = query(
      collection(db, 'quoteRequests'),
      where('providerUid', '==', providerUid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const requests = snap.docs.map((doc) =>
          QuoteRequest.fromFirestore({ id: doc.id, ...doc.data() })
        );
        callback(requests);
      },
      (error) => {
        console.error('QuoteRequestRepository.subscribeToRequestsForProvider error:', error);
      }
    );
  }

  /**
   * Subscribe to all quote requests for a specific deal.
   * Used by the buyer quote comparison page to show all providers' request statuses.
   *
   * @param {string} dealId - Deal ID to subscribe to
   * @param {Function} callback - Called with QuoteRequest[] on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToRequestsForDeal(dealId, callback) {
    const q = query(
      collection(db, 'quoteRequests'),
      where('dealId', '==', dealId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const requests = snap.docs.map((doc) =>
          QuoteRequest.fromFirestore({ id: doc.id, ...doc.data() })
        );
        callback(requests);
      },
      (error) => {
        console.error('QuoteRequestRepository.subscribeToRequestsForDeal error:', error);
      }
    );
  }
}

export default QuoteRequestRepository;
