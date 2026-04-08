/**
 * Deal Repository
 *
 * Manages deal data in Firestore.
 * Handles CRUD and real-time subscriptions for the deals collection.
 *
 * Follows the ConversationRepository.js pattern closely.
 *
 * Note: All state-changing writes (accept, reject, counter, withdraw) go
 *       through Cloud Functions — this repository is READ-only for clients.
 */

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/core/constants/collections';
import { Deal } from '@/domain/entities/Deal';

export class DealRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Get deal by ID
   * @param {string} dealId
   * @returns {Promise<Deal|null>}
   */
  async getById(dealId) {
    const data = await this.firestoreDataSource.getById(COLLECTIONS.DEALS, dealId);
    if (!data) return null;
    return Deal.fromFirestore(data);
  }

  /**
   * Get all deals where uid is buyer OR seller
   *
   * Firestore does not support OR queries across different fields in a single query,
   * so we run two separate queries and merge/sort client-side.
   * (Per research recommendation — mirrors ConversationRepository two-query pattern)
   *
   * @param {string} uid - User ID (buyer or seller)
   * @returns {Promise<Deal[]>} Deals sorted by updatedAt descending
   */
  async getByParticipant(uid) {
    const db = this.firestoreDataSource.db;

    const [buyerSnap, sellerSnap] = await Promise.all([
      // Deals where user is buyer
      import('firebase/firestore').then(({ getDocs }) =>
        getDocs(
          query(
            collection(db, COLLECTIONS.DEALS),
            where('buyerId', '==', uid),
            orderBy('updatedAt', 'desc')
          )
        )
      ),
      // Deals where user is seller
      import('firebase/firestore').then(({ getDocs }) =>
        getDocs(
          query(
            collection(db, COLLECTIONS.DEALS),
            where('sellerId', '==', uid),
            orderBy('updatedAt', 'desc')
          )
        )
      ),
    ]);

    const buyerDeals = buyerSnap.docs.map((d) => Deal.fromFirestore({ id: d.id, ...d.data() }));
    const sellerDeals = sellerSnap.docs.map((d) => Deal.fromFirestore({ id: d.id, ...d.data() }));

    // Merge, deduplicate (unlikely but possible if buyer === seller), sort
    const allDeals = [...buyerDeals, ...sellerDeals];
    const seen = new Set();
    const unique = allDeals.filter((deal) => {
      if (seen.has(deal.id)) return false;
      seen.add(deal.id);
      return true;
    });

    // Sort by updatedAt descending
    return unique.sort((a, b) => {
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
      return bTime - aTime;
    });
  }

  /**
   * Subscribe to a single deal in real-time
   * @param {string} dealId
   * @param {Function} callback - Called with Deal entity (or null if deleted)
   * @param {Function} [onError] - Optional error callback; defaults to console.error
   * @returns {Function} Unsubscribe function
   */
  subscribeToDeal(dealId, callback, onError) {
    const handleError = onError || ((err) => console.error('DealRepository.subscribeToDeal error:', err));
    return this.firestoreDataSource.subscribeToDocument(
      COLLECTIONS.DEALS,
      dealId,
      (data) => {
        if (data) {
          callback(Deal.fromFirestore(data));
        } else {
          callback(null);
        }
      },
      handleError
    );
  }

  /**
   * Subscribe to all deals where uid is buyer OR seller (real-time My Deals list)
   *
   * Uses two separate onSnapshot listeners (one for buyerId, one for sellerId)
   * and merges results client-side. Both listeners must be unsubscribed on cleanup.
   *
   * @param {string} uid - User ID
   * @param {Function} callback - Called with Deal[] sorted by updatedAt desc
   * @returns {Function} Unsubscribe function (unsubscribes both listeners)
   */
  subscribeToDeals(uid, callback) {
    const db = this.firestoreDataSource.db;

    // Track results from both queries separately
    let buyerDeals = [];
    let sellerDeals = [];

    function mergeAndEmit() {
      const allDeals = [...buyerDeals, ...sellerDeals];
      const seen = new Set();
      const unique = allDeals.filter((deal) => {
        if (seen.has(deal.id)) return false;
        seen.add(deal.id);
        return true;
      });
      const sorted = unique.sort((a, b) => {
        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
        return bTime - aTime;
      });
      callback(sorted);
    }

    // Buyer query
    const buyerQuery = query(
      collection(db, COLLECTIONS.DEALS),
      where('buyerId', '==', uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubBuyer = onSnapshot(
      buyerQuery,
      (snap) => {
        buyerDeals = snap.docs.map((d) => Deal.fromFirestore({ id: d.id, ...d.data() }));
        mergeAndEmit();
      },
      (error) => console.error('DealRepository.subscribeToDeals (buyer) error:', error)
    );

    // Seller query
    const sellerQuery = query(
      collection(db, COLLECTIONS.DEALS),
      where('sellerId', '==', uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubSeller = onSnapshot(
      sellerQuery,
      (snap) => {
        sellerDeals = snap.docs.map((d) => Deal.fromFirestore({ id: d.id, ...d.data() }));
        mergeAndEmit();
      },
      (error) => console.error('DealRepository.subscribeToDeals (seller) error:', error)
    );

    // Return combined unsubscribe
    return () => {
      unsubBuyer();
      unsubSeller();
    };
  }
}

export default DealRepository;
