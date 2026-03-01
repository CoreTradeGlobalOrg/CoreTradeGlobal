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
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToContract(dealId, callback) {
    const contractRef = doc(db, 'deals', dealId, 'contract', 'main');

    return onSnapshot(
      contractRef,
      (snap) => {
        if (snap.exists()) {
          callback(Contract.fromFirestore(snap));
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('ContractRepository.subscribeToContract error:', error);
      }
    );
  }
}

export default ContractRepository;
