/**
 * Legal Engagement Repository
 *
 * Manages real-time subscriptions and write operations for legalEngagements
 * and their subcollections: contractDrafts, riskItems.
 *
 * All subscription methods return an unsubscribe function for cleanup on unmount.
 *
 * Security model:
 *   - legalEngagements: read via participants array-contains rule (client + lawyer only)
 *   - Creates/updates of the parent engagement: Cloud Functions only (Admin SDK)
 *   - contractDrafts: participants can create (status == 'active'); no updates/deletes
 *   - riskItems: lawyerId only can create/update (status == 'active')
 *
 * Follows the ContractRepository.js and QuoteRepository.js patterns.
 */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/core/constants/collections';
import { LegalEngagement } from '@/domain/entities/LegalEngagement';

export class LegalEngagementRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Subscribe to a single legal engagement document in real-time.
   *
   * Follows the ContractRepository.subscribeToContract pattern exactly:
   * - Uses includeMetadataChanges: true
   * - Skips snapshots with pending local writes
   * - Calls callback with LegalEngagement entity or null if doc doesn't exist
   *
   * @param {string} engagementId - Engagement document ID
   * @param {Function} callback - Called with LegalEngagement or null
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToEngagement(engagementId, callback) {
    const engagementRef = doc(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId);

    return onSnapshot(
      engagementRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;

        if (snap.exists()) {
          callback(LegalEngagement.fromFirestore({ id: snap.id, ...snap.data() }));
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('LegalEngagementRepository.subscribeToEngagement error:', error);
      }
    );
  }

  /**
   * Subscribe to all engagements for a lawyer in real-time (lawyer dashboard).
   *
   * Query: legalEngagements where participants array-contains lawyerId, orderBy updatedAt desc
   * This satisfies the Firestore rule: request.auth.uid in resource.data.participants
   *
   * NOTE: Requires composite index on legalEngagements: participants (arrayConfig: CONTAINS) + updatedAt (DESCENDING)
   *
   * @param {string} lawyerId - UID of the lawyer
   * @param {Function} callback - Called with LegalEngagement[] on each update
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToEngagementsForLawyer(lawyerId, callback) {
    const q = query(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS),
      where('participants', 'array-contains', lawyerId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const engagements = snap.docs.map((docSnap) =>
          LegalEngagement.fromFirestore({ id: docSnap.id, ...docSnap.data() })
        );
        callback(engagements);
      },
      (error) => {
        console.error('LegalEngagementRepository.subscribeToEngagementsForLawyer error:', error);
      }
    );
  }

  /**
   * Subscribe to the engagement for a specific deal+client combination in real-time.
   * Used by the deal page banner to detect if a legal engagement exists for this deal.
   *
   * Query: legalEngagements where dealId == dealId AND clientId == clientId
   * Returns single LegalEngagement or null (first matching document).
   *
   * NOTE: Requires composite index on legalEngagements: dealId (ASCENDING) + clientId (ASCENDING)
   *
   * @param {string} dealId - Deal ID
   * @param {string} clientId - UID of the client
   * @param {Function} callback - Called with LegalEngagement or null
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToEngagementForDeal(dealId, clientId, callback) {
    const q = query(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS),
      where('dealId', '==', dealId),
      where('participants', 'array-contains', clientId)
    );

    return onSnapshot(
      q,
      (snap) => {
        if (snap.docs.length > 0) {
          const docSnap = snap.docs[0];
          callback(LegalEngagement.fromFirestore({ id: docSnap.id, ...docSnap.data() }));
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('LegalEngagementRepository.subscribeToEngagementForDeal error:', error);
      }
    );
  }

  /**
   * Subscribe to contract drafts for an engagement in real-time.
   * Ordered by version ascending so the latest draft is last.
   *
   * Returns array of plain objects (no entity class needed for drafts).
   * Draft shape: { id, version, fileName, fileUrl, storagePath, fileSize, uploaderUid, uploaderName, createdAt }
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {Function} callback - Called with draft objects array
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToContractDrafts(engagementId, callback) {
    const q = query(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.CONTRACT_DRAFTS),
      orderBy('version', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const drafts = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.() || docSnap.data().createdAt || null,
        }));
        callback(drafts);
      },
      (error) => {
        console.error('LegalEngagementRepository.subscribeToContractDrafts error:', error);
      }
    );
  }

  /**
   * Subscribe to risk items for an engagement in real-time.
   * Ordered by createdAt descending (newest risks first).
   *
   * Returns array of plain objects (no entity class needed for risk items).
   * Risk item shape: { id, title, description, severity, status, createdAt, resolvedAt }
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {Function} callback - Called with risk item objects array
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToRiskItems(engagementId, callback) {
    const q = query(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.RISK_ITEMS),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const riskItems = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.() || docSnap.data().createdAt || null,
          resolvedAt: docSnap.data().resolvedAt?.toDate?.() || docSnap.data().resolvedAt || null,
        }));
        callback(riskItems);
      },
      (error) => {
        console.error('LegalEngagementRepository.subscribeToRiskItems error:', error);
      }
    );
  }

  /**
   * Add a new contract draft to an engagement's contractDrafts subcollection.
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {Object} draftData - Draft document data
   * @param {number} draftData.version - Version number (use getMaxDraftVersion + 1)
   * @param {string} draftData.fileName - Original file name
   * @param {string} draftData.fileUrl - Firebase Storage download URL
   * @param {string} draftData.storagePath - Firebase Storage path for deletion
   * @param {number} draftData.fileSize - File size in bytes
   * @param {string} draftData.uploaderUid - UID of the uploader
   * @param {string} draftData.uploaderName - Display name of the uploader
   * @returns {Promise<import('firebase/firestore').DocumentReference>}
   */
  async addContractDraft(engagementId, draftData) {
    return await addDoc(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.CONTRACT_DRAFTS),
      {
        ...draftData,
        createdAt: serverTimestamp(),
      }
    );
  }

  /**
   * Add a new risk item to an engagement's riskItems subcollection.
   * Only the lawyer may call this (enforced by Firestore rules).
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {Object} riskData - Risk item document data
   * @param {string} riskData.title - Short title of the risk
   * @param {string} riskData.description - Detailed description
   * @param {string} riskData.severity - RISK_SEVERITY value
   * @param {string} riskData.status - RISK_STATUS value (default: 'open')
   * @returns {Promise<import('firebase/firestore').DocumentReference>}
   */
  async addRiskItem(engagementId, riskData) {
    return await addDoc(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.RISK_ITEMS),
      {
        ...riskData,
        createdAt: serverTimestamp(),
      }
    );
  }

  /**
   * Update a risk item (e.g., to mark it as resolved).
   * Only the lawyer may call this (enforced by Firestore rules).
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {string} riskId - Risk item document ID
   * @param {Object} updates - Partial update data (e.g., { status: 'resolved', resolvedAt: serverTimestamp() })
   * @returns {Promise<void>}
   */
  async updateRiskItem(engagementId, riskId, updates) {
    const riskRef = doc(
      db,
      COLLECTIONS.LEGAL_ENGAGEMENTS,
      engagementId,
      SUBCOLLECTIONS.RISK_ITEMS,
      riskId
    );
    await updateDoc(riskRef, updates);
  }

  /**
   * Get the highest version number among existing contract drafts for an engagement.
   * Used to determine the version number for a new draft (call this + 1).
   *
   * Returns 0 if no drafts exist yet.
   *
   * @param {string} engagementId - Parent engagement ID
   * @returns {Promise<number>} Maximum version number, or 0 if none
   */
  async getMaxDraftVersion(engagementId) {
    const q = query(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.CONTRACT_DRAFTS),
      orderBy('version', 'desc'),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return 0;

    return snap.docs[0].data().version || 0;
  }
}

export default LegalEngagementRepository;
