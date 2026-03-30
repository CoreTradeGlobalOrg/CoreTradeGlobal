/**
 * Shipment Repository
 *
 * Manages real-time subscriptions to the shipmentTracking subcollection.
 *
 * Path: deals/{dealId}/shipmentTracking
 *
 * Important: No client-side write methods exist in this repository.
 * All writes are performed via Cloud Functions:
 *   - submitShipmentUpdate  (logistics provider)
 *   - confirmInsuranceCoverage  (insurance provider)
 *
 * Follows the QuoteRepository / ContractRepository pattern.
 * All subscription methods return an unsubscribe function for cleanup on unmount.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { ShipmentUpdate } from '@/domain/entities/ShipmentUpdate';

export class ShipmentRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Subscribe to all shipment updates for a deal in chronological order.
   *
   * Returns updates ordered by timestamp ASC so the UI can render a timeline
   * from oldest (top) to newest (bottom).
   *
   * @param {string} dealId - Parent deal document ID
   * @param {Function} callback - Called with ShipmentUpdate[] on each snapshot
   * @param {Function} [onError] - Optional error callback; defaults to console.error.
   *   Callers should set a loaded flag inside onError to prevent infinite loading spinners.
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToShipmentUpdates(dealId, callback, onError) {
    const handleError = onError || ((err) => console.error('ShipmentRepository.subscribeToShipmentUpdates error:', err));

    const q = query(
      collection(db, 'deals', dealId, 'shipmentTracking'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const updates = snap.docs.map((doc) =>
          ShipmentUpdate.fromFirestore({ id: doc.id, ...doc.data() })
        );
        callback(updates);
      },
      handleError
    );
  }

  /**
   * Fetch the single most recent shipment update for a deal.
   * Useful for displaying current status without a real-time subscription.
   *
   * @param {string} dealId - Parent deal document ID
   * @returns {Promise<ShipmentUpdate|null>}
   */
  async getLatestShipmentUpdate(dealId) {
    const q = query(
      collection(db, 'deals', dealId, 'shipmentTracking'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return ShipmentUpdate.fromFirestore({ id: doc.id, ...doc.data() });
  }
}

export default ShipmentRepository;
