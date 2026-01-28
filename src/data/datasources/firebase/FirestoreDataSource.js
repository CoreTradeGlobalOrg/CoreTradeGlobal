/**
 * Firestore DataSource
 *
 * This class provides generic CRUD operations for ALL collections
 *
 * Why generic?
 * - Same CRUD logic for users, products, requests, etc.
 * - DRY principle (Don't Repeat Yourself)
 * - Easy to maintain and test
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

export class FirestoreDataSource {
  /**
   * Constructor
   * @param {Firestore} db - Firestore instance
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new document
   * @param {string} collectionName
   * @param {Object} data
   * @returns {Promise<{id: string, ...data}>}
   *
   * Usage:
   * const user = await firestoreDS.create('users', { name: 'John', email: 'john@example.com' })
   */
  async create(collectionName, data) {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(this.db, collectionName), docData);

    return {
      id: docRef.id,
      ...data,
    };
  }

  /**
   * Create document with custom ID
   * @param {string} collectionName
   * @param {string} docId
   * @param {Object} data
   * @returns {Promise<{id: string, ...data}>}
   *
   * Usage:
   * await firestoreDS.createWithId('users', 'user123', { name: 'John' })
   */
  async createWithId(collectionName, docId, data) {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(this.db, collectionName, docId), docData);

    return {
      id: docId,
      ...data,
    };
  }

  /**
   * Get document by ID
   * @param {string} collectionName
   * @param {string} docId
   * @returns {Promise<Object|null>}
   *
   * Usage:
   * const user = await firestoreDS.getById('users', 'user123')
   */
  async getById(collectionName, docId) {
    const docRef = doc(this.db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  }

  /**
   * Get all documents from collection
   * @param {string} collectionName
   * @returns {Promise<Array>}
   *
   * Usage:
   * const users = await firestoreDS.getAll('users')
   */
  async getAll(collectionName) {
    const querySnapshot = await getDocs(collection(this.db, collectionName));

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Query documents with filters
   * @param {string} collectionName
   * @param {Object} options - { where: [], orderBy: [], limit: number }
   * @returns {Promise<Array>}
   *
   * Usage:
   * const products = await firestoreDS.query('products', {
   *   where: [['companyId', '==', 'company123'], ['price', '>', 100]],
   *   orderBy: [['price', 'desc']],
   *   limit: 10
   * })
   */
  async query(collectionName, options = {}) {
    let q = collection(this.db, collectionName);

    // Apply where filters
    if (options.where && options.where.length > 0) {
      options.where.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
    }

    // Apply orderBy
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });
    }

    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    // Apply startAfter for pagination
    if (options.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Update document
   * @param {string} collectionName
   * @param {string} docId
   * @param {Object} data
   * @returns {Promise<void>}
   *
   * Usage:
   * await firestoreDS.update('users', 'user123', { name: 'John Updated' })
   */
  async update(collectionName, docId, data) {
    const docRef = doc(this.db, collectionName, docId);

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete document
   * @param {string} collectionName
   * @param {string} docId
   * @returns {Promise<void>}
   *
   * Usage:
   * await firestoreDS.delete('users', 'user123')
   */
  async delete(collectionName, docId) {
    const docRef = doc(this.db, collectionName, docId);
    await deleteDoc(docRef);
  }

  /**
   * Check if document exists
   * @param {string} collectionName
   * @param {string} docId
   * @returns {Promise<boolean>}
   *
   * Usage:
   * const exists = await firestoreDS.exists('users', 'user123')
   */
  async exists(collectionName, docId) {
    const docRef = doc(this.db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  /**
   * Subscribe to real-time query updates
   * @param {string} collectionName
   * @param {Object} options - { where: [], orderBy: [], limit: number }
   * @param {Function} onData - Callback with array of documents
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   *
   * Usage:
   * const unsubscribe = firestoreDS.subscribeToQuery('conversations', {
   *   where: [['participants', 'array-contains', 'user123']],
   *   orderBy: [['updatedAt', 'desc']]
   * }, (docs) => console.log(docs), (err) => console.error(err))
   */
  subscribeToQuery(collectionName, options = {}, onData, onError) {
    let q = collection(this.db, collectionName);

    // Apply where filters
    if (options.where && options.where.length > 0) {
      options.where.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
    }

    // Apply orderBy
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });
    }

    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    return onSnapshot(
      q,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        onData(docs);
      },
      onError
    );
  }

  /**
   * Subscribe to a single document
   * @param {string} collectionName
   * @param {string} docId
   * @param {Function} onData - Callback with document data
   * @param {Function} onError - Error callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToDocument(collectionName, docId, onData, onError) {
    const docRef = doc(this.db, collectionName, docId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData({ id: docSnap.id, ...docSnap.data() });
        } else {
          onData(null);
        }
      },
      onError
    );
  }

  /**
   * Create document in subcollection
   * @param {string} parentCollection
   * @param {string} parentDocId
   * @param {string} subcollectionName
   * @param {Object} data
   * @returns {Promise<{id: string, ...data}>}
   */
  async createInSubcollection(parentCollection, parentDocId, subcollectionName, data) {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const subcollectionRef = collection(
      this.db,
      parentCollection,
      parentDocId,
      subcollectionName
    );
    const docRef = await addDoc(subcollectionRef, docData);

    return {
      id: docRef.id,
      ...data,
    };
  }

  /**
   * Get documents from subcollection with query
   * @param {string} parentCollection
   * @param {string} parentDocId
   * @param {string} subcollectionName
   * @param {Object} options - { where: [], orderBy: [], limit: number }
   * @returns {Promise<Array>}
   */
  async querySubcollection(parentCollection, parentDocId, subcollectionName, options = {}) {
    let q = collection(
      this.db,
      parentCollection,
      parentDocId,
      subcollectionName
    );

    // Apply where filters
    if (options.where && options.where.length > 0) {
      options.where.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
    }

    // Apply orderBy
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });
    }

    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Subscribe to subcollection with real-time updates
   * @param {string} parentCollection
   * @param {string} parentDocId
   * @param {string} subcollectionName
   * @param {Object} options
   * @param {Function} onData
   * @param {Function} onError
   * @returns {Function} Unsubscribe function
   */
  subscribeToSubcollection(parentCollection, parentDocId, subcollectionName, options = {}, onData, onError) {
    let q = collection(
      this.db,
      parentCollection,
      parentDocId,
      subcollectionName
    );

    // Apply where filters
    if (options.where && options.where.length > 0) {
      options.where.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
    }

    // Apply orderBy
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });
    }

    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    return onSnapshot(
      q,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        onData(docs);
      },
      onError
    );
  }

  /**
   * Update document in subcollection
   * @param {string} parentCollection
   * @param {string} parentDocId
   * @param {string} subcollectionName
   * @param {string} docId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async updateInSubcollection(parentCollection, parentDocId, subcollectionName, docId, data) {
    const docRef = doc(
      this.db,
      parentCollection,
      parentDocId,
      subcollectionName,
      docId
    );

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete document from subcollection
   * @param {string} parentCollection
   * @param {string} parentDocId
   * @param {string} subcollectionName
   * @param {string} docId
   * @returns {Promise<void>}
   */
  async deleteFromSubcollection(parentCollection, parentDocId, subcollectionName, docId) {
    const docRef = doc(
      this.db,
      parentCollection,
      parentDocId,
      subcollectionName,
      docId
    );
    await deleteDoc(docRef);
  }
}

export default FirestoreDataSource;
