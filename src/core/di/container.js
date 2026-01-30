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
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { RequestRepository } from '@/data/repositories/RequestRepository';
import { CategoryRepository } from '@/data/repositories/CategoryRepository';
import { FairsRepository } from '@/data/repositories/FairsRepository';
import { NewsRepository } from '@/data/repositories/NewsRepository';
import { ConversationRepository } from '@/data/repositories/ConversationRepository';
import { MessageRepository } from '@/data/repositories/MessageRepository';
import { NotificationRepository } from '@/data/repositories/NotificationRepository';

/**
 * Singleton instances
 * These will be created only once and reused throughout the app
 */
let firebaseAuthDataSource = null;
let firestoreDataSource = null;
let firebaseStorageDataSource = null;
let authRepository = null;
let userRepository = null;
let productRepository = null;
let requestRepository = null;
let categoryRepository = null;
let fairsRepository = null;
let newsRepository = null;
let conversationRepository = null;
let messageRepository = null;
let notificationRepository = null;

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
      userRepository = new UserRepository(
        this.getFirestoreDataSource(),
        this.getFirebaseStorageDataSource()
      );
    }
    return userRepository;
  },

  /**
   * Get Product Repository instance
   * @returns {ProductRepository}
   */
  getProductRepository() {
    if (!productRepository) {
      productRepository = new ProductRepository(
        this.getFirestoreDataSource(),
        this.getFirebaseStorageDataSource()
      );
    }
    return productRepository;
  },

  /**
   * Get Request Repository instance
   * @returns {RequestRepository}
   */
  getRequestRepository() {
    if (!requestRepository) {
      requestRepository = new RequestRepository(this.getFirestoreDataSource());
    }
    return requestRepository;
  },

  /**
   * Get Category Repository instance
   * @returns {CategoryRepository}
   */
  getCategoryRepository() {
    if (!categoryRepository) {
      categoryRepository = new CategoryRepository(
        this.getFirestoreDataSource()
      );
    }
    return categoryRepository;
  },

  /**
   * Get Fairs Repository instance
   * @returns {FairsRepository}
   */
  getFairsRepository() {
    if (!fairsRepository) {
      fairsRepository = new FairsRepository(this.getFirestoreDataSource());
    }
    return fairsRepository;
  },

  /**
   * Get News Repository instance
   * @returns {NewsRepository}
   */
  getNewsRepository() {
    if (!newsRepository) {
      newsRepository = new NewsRepository(this.getFirestoreDataSource());
    }
    return newsRepository;
  },

  /**
   * Get Conversation Repository instance
   * @returns {ConversationRepository}
   */
  getConversationRepository() {
    if (!conversationRepository) {
      conversationRepository = new ConversationRepository(
        this.getFirestoreDataSource()
      );
    }
    return conversationRepository;
  },

  /**
   * Get Message Repository instance
   * @returns {MessageRepository}
   */
  getMessageRepository() {
    if (!messageRepository) {
      messageRepository = new MessageRepository(this.getFirestoreDataSource());
    }
    return messageRepository;
  },

  /**
   * Get Notification Repository instance
   * @returns {NotificationRepository}
   */
  getNotificationRepository() {
    if (!notificationRepository) {
      notificationRepository = new NotificationRepository(
        this.getFirestoreDataSource()
      );
    }
    return notificationRepository;
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
    productRepository = null;
    requestRepository = null;
    categoryRepository = null;
    fairsRepository = null;
    newsRepository = null;
    conversationRepository = null;
    messageRepository = null;
    notificationRepository = null;
  },
};

export default container;
