/**
 * Dependency Injection Container
 *
 * This is our DI container that manages all dependencies
 * All instances are singletons (created once and reused)
 *
 * Why use DI Container?
 * - Centralized dependency management
 * - Easy to test (can inject mocks)
 * - Avoid circular dependencies
 * - Single source of truth for instances
 */

import { auth, db } from '@/core/config/firebase.config';
import { FirebaseAuthDataSource } from '@/data/datasources/firebase/FirebaseAuthDataSource';
import { FirestoreDataSource } from '@/data/datasources/firebase/FirestoreDataSource';
import { FirebaseStorageDataSource } from '@/data/datasources/firebase/FirebaseStorageDataSource';
import { AuthRepository } from '@/data/repositories/AuthRepository';
import { UserRepository } from '@/data/repositories/UserRepository';

/**
 * Singleton instances
 * These will be created only once and reused throughout the app
 */
let firebaseAuthDataSource = null;
let firestoreDataSource = null;
let firebaseStorageDataSource = null;
let authRepository = null;
let userRepository = null;

/**
 * DI Container
 *
 * Usage in hooks/components:
 * import { container } from '@/core/di/container'
 * const authRepo = container.getAuthRepository()
 */
export const container = {
  /**
   * Get Firebase Auth DataSource instance
   * @returns {FirebaseAuthDataSource}
   */
  getFirebaseAuthDataSource() {
    if (!firebaseAuthDataSource) {
      firebaseAuthDataSource = new FirebaseAuthDataSource(auth);
    }
    return firebaseAuthDataSource;
  },

  /**
   * Get Firestore DataSource instance
   * @returns {FirestoreDataSource}
   */
  getFirestoreDataSource() {
    if (!firestoreDataSource) {
      firestoreDataSource = new FirestoreDataSource(db);
    }
    return firestoreDataSource;
  },

  /**
   * Get Firebase Storage DataSource instance
   * @returns {FirebaseStorageDataSource}
   */
  getFirebaseStorageDataSource() {
    if (!firebaseStorageDataSource) {
      firebaseStorageDataSource = new FirebaseStorageDataSource();
    }
    return firebaseStorageDataSource;
  },

  /**
   * Get Auth Repository instance
   * @returns {AuthRepository}
   */
  getAuthRepository() {
    if (!authRepository) {
      authRepository = new AuthRepository(
        this.getFirebaseAuthDataSource(),
        this.getFirestoreDataSource(),
        this.getFirebaseStorageDataSource()
      );
    }
    return authRepository;
  },

  /**
   * Get User Repository instance
   * @returns {UserRepository}
   */
  getUserRepository() {
    if (!userRepository) {
      userRepository = new UserRepository(this.getFirestoreDataSource());
    }
    return userRepository;
  },

  /**
   * Reset all instances (useful for testing)
   * DO NOT use this in production code
   */
  _reset() {
    firebaseAuthDataSource = null;
    firestoreDataSource = null;
    firebaseStorageDataSource = null;
    authRepository = null;
    userRepository = null;
  },
};

export default container;
