/**
 * Contract Repository
 *
 * Manages real-time subscription to the contract subcollection document.
 *
 * The contract is stored at: deals/{dealId}/contract/main
 * It is written exclusively by Cloud Functions (Admin SDK); this repository is READ-only.
 *
 * Follows the DealRepository.js pattern exactly.
 */

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { Contract } from '@/domain/entities/Contract';

export class ContractRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Subscribe to the contract document for a deal in real-time.
   *
   * The contract document lives at: deals/{dealId}/contract/main
   * If the document does not exist yet (contract not yet generated), callback is called with null.
   *
   * @param {string} dealId - Parent deal ID
   * @param {Function} callback - Called with Contract entity or null if not yet generated
   * @param {Function} [onError] - Optional error callback; defaults to console.error
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToContract(dealId, callback, onError) {
    const handleError = onError || ((err) => console.error('ContractRepository.subscribeToContract error:', err));
    const contractRef = doc(db, 'deals', dealId, 'contract', 'main');

    return onSnapshot(
      contractRef,
      { includeMetadataChanges: true },
      (snap) => {
        // Skip snapshots with pending writes to avoid overwriting optimistic UI
        if (snap.metadata.hasPendingWrites) return;

        if (snap.exists()) {
          callback(Contract.fromFirestore(snap));
        } else {
          callback(null);
        }
      },
      handleError
    );
  }
}

export default ContractRepository;
