/**
 * Legal Message Repository
 *
 * Manages real-time subscriptions and write operations for the legalMessages
 * subcollection within a legal engagement.
 *
 * Handles both text/quick-action messages and file attachments/draft uploads.
 *
 * Firestore path: legalEngagements/{engagementId}/legalMessages/{messageId}
 * Storage paths:
 *   - Attachments: legal/attachments/{engagementId}/{timestamp}_{filename}
 *   - Drafts:      legal/drafts/{engagementId}/{timestamp}_{filename}
 *
 * Security:
 *   - Read: participants (clientId + lawyerId) only
 *   - Create: participants only, engagement must be 'active', senderId == request.auth.uid
 *   - Update/Delete: not permitted (messages are immutable)
 *
 * Follows ContractRepository.js and MessageRepository.js patterns.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/core/config/firebase.config';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/core/constants/collections';
import { LegalMessage } from '@/domain/entities/LegalMessage';

export class LegalMessageRepository {
  /**
   * Constructor
   * @param {FirestoreDataSource} firestoreDataSource
   */
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Subscribe to messages for a legal engagement in real-time.
   * Ordered by createdAt ascending (chronological order for chat display).
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {Function} callback - Called with LegalMessage[] on each update
   * @param {number} [limitCount=100] - Maximum messages to load
   * @returns {Function} Unsubscribe function — call on component unmount
   */
  subscribeToMessages(engagementId, callback, limitCount = 100) {
    const q = query(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.LEGAL_MESSAGES),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snap) => {
        const messages = snap.docs.map((docSnap) =>
          LegalMessage.fromFirestore({ id: docSnap.id, ...docSnap.data() })
        );
        callback(messages);
      },
      (error) => {
        console.error('LegalMessageRepository.subscribeToMessages error:', error);
      }
    );
  }

  /**
   * Send a message to a legal engagement's message channel.
   *
   * The Firestore rule enforces:
   *   - request.auth.uid in engagement.participants (read from parent doc via get())
   *   - engagement.status == 'active'
   *   - messageData.senderId == request.auth.uid
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {Object} messageData - Message document data
   * @param {string} messageData.senderId - Must equal request.auth.uid
   * @param {string} messageData.senderName - Display name of the sender
   * @param {string} messageData.content - Message text content
   * @param {string} messageData.type - LEGAL_MESSAGE_TYPE value
   * @param {Object|null} [messageData.quickAction] - Quick action data ({ action, label }) or null
   * @param {Array|null} [messageData.attachments] - Array of attachment objects or null
   * @returns {Promise<import('firebase/firestore').DocumentReference>}
   */
  async sendMessage(engagementId, messageData) {
    return await addDoc(
      collection(db, COLLECTIONS.LEGAL_ENGAGEMENTS, engagementId, SUBCOLLECTIONS.LEGAL_MESSAGES),
      {
        ...messageData,
        createdAt: serverTimestamp(),
      }
    );
  }

  /**
   * Upload an attachment file to Firebase Storage for a legal engagement.
   * Storage path: legal/attachments/{engagementId}/{timestamp}_{filename}
   *
   * Follows MessageRepository.uploadAttachment pattern.
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {File} file - File object to upload
   * @returns {Promise<{url: string, storagePath: string, name: string, type: string, size: number}>}
   */
  async uploadAttachment(engagementId, file) {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storagePath = `legal/attachments/${engagementId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    const url = await getDownloadURL(snapshot.ref);

    return {
      url,
      storagePath,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  }

  /**
   * Upload a contract draft file to Firebase Storage.
   * Storage path: legal/drafts/{engagementId}/{timestamp}_{filename}
   *
   * Used when a lawyer sends a new contract draft version via the chat.
   *
   * @param {string} engagementId - Parent engagement ID
   * @param {File} file - File object to upload
   * @returns {Promise<{url: string, storagePath: string, name: string, type: string, size: number}>}
   */
  async uploadDraftFile(engagementId, file) {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storagePath = `legal/drafts/${engagementId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    const url = await getDownloadURL(snapshot.ref);

    return {
      url,
      storagePath,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  }
}

export default LegalMessageRepository;
