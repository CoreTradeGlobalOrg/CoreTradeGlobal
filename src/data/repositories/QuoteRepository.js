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
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
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
   * Used by the Trade Summary to show selected insurance/logistics quotes.
   *
   * Two-step approach: first finds quoteRequests for this deal that the user
   * can access, then subscribes to each one's providerQuotes subcollection.
   * Avoids collectionGroup queries which have permission issues.
   *
   * @param {string} dealId - Deal ID to subscribe to
   * @param {string} uid - Current user's UID (for quoteRequests participants filter)
   * @param {Function} callback - Called with Quote[] on each update
   * @param {Function} [onError] - Optional error callback; defaults to console.error
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToQuotesForDeal(dealId, uid, callback, onError) {
    const handleError = onError || ((err) => console.error('QuoteRepository.subscribeToQuotesForDeal error:', err));
    const unsubs = [];
    let cancelled = false;

    // Step 1: Find all quoteRequests for this deal
    const qrQuery = query(
      collection(db, 'quoteRequests'),
      where('dealId', '==', dealId),
      where('participants', 'array-contains', uid)
    );

    getDocs(qrQuery)
      .then((qrSnap) => {
        if (cancelled) return;

        if (qrSnap.empty) {
          callback([]);
          return;
        }

        // Step 2: Subscribe to providerQuotes under each quoteRequest
        const allQuotes = new Map(); // requestId -> Quote[]

        qrSnap.docs.forEach((qrDoc) => {
          const subQ = query(
            collection(db, 'quoteRequests', qrDoc.id, 'providerQuotes'),
            orderBy('createdAt', 'desc')
          );

          const unsub = onSnapshot(
            subQ,
            (snap) => {
              allQuotes.set(
                qrDoc.id,
                snap.docs.map((d) => Quote.fromFirestore({ id: d.id, ...d.data() }))
              );
              // Merge all quotes and emit
              const merged = Array.from(allQuotes.values()).flat();
              merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
              callback(merged);
            },
            handleError
          );
          unsubs.push(unsub);
        });
      })
      .catch(handleError);

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => fn());
    };
  }
}

export default QuoteRepository;
