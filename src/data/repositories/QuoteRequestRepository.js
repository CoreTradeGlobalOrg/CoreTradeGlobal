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

import { collection, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
   * Subscribe to a single quote request by ID.
   * Used by the provider quote detail page for real-time updates on a specific request.
   *
   * @param {string} requestId - QuoteRequest document ID
   * @param {Function} callback - Called with QuoteRequest|null on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToRequest(requestId, callback) {
    const docRef = doc(db, 'quoteRequests', requestId);

    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const request = QuoteRequest.fromFirestore({ id: snap.id, ...snap.data() });
        callback(request);
      },
      (error) => {
        console.error('QuoteRequestRepository.subscribeToRequest error:', error);
      }
    );
  }

  /**
   * Subscribe to all quote requests for a specific deal.
   * Used by the buyer quote comparison page to show all providers' request statuses.
   *
   * @param {string} dealId - Deal ID to subscribe to
   * @param {string} userId - Current user's UID (required for Firestore rules — participants array-contains)
   * @param {Function} callback - Called with QuoteRequest[] on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToRequestsForDeal(dealId, userId, callback) {
    const q = query(
      collection(db, 'quoteRequests'),
      where('dealId', '==', dealId),
      where('participants', 'array-contains', userId),
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
