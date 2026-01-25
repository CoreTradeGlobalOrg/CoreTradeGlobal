/**
 * Firestore Collection Names
 *
 * We keep all collection names here to avoid hardcoded strings in code
 *
 * Usage example:
 * await addDoc(collection(db, COLLECTIONS.USERS), userData)
 */

export const COLLECTIONS = {
  // Auth & User Management
  USERS: 'users',              // User information
  COMPANIES: 'companies',       // Company information

  // Products
  PRODUCTS: 'products',         // Products
  CATEGORIES: 'categories',     // Product categories

  // Requests & Orders
  REQUESTS: 'requests',         // B2B requests/orders

  // Homepage Content
  FAIRS: 'fairs',               // Trade fairs/exhibitions
  NEWS: 'news',                 // Trade news/articles

  // Messaging
  CONVERSATIONS: 'conversations', // Message conversations
  MESSAGES: 'messages',          // Messages

  // Newsletter (existing)
  NEWSLETTER: 'newsletter',      // Newsletter subscribers
};

/**
 * Subcollection Names
 * For nested collections in Firestore
 *
 * Example: users/{userId}/notifications
 */
export const SUBCOLLECTIONS = {
  NOTIFICATIONS: 'notifications',
  REVIEWS: 'reviews',
};

export default COLLECTIONS;
