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

  // Deals & Negotiation
  DEALS: 'deals',                // Deal negotiations

  // Phase 4: Provider Portals & Quotes
  QUOTE_REQUESTS: 'quoteRequests', // Quote requests sent to providers on contract_approved

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
  OFFERS: 'offers',              // Offers subcollection under deals
  // Phase 4: named `providerQuotes` (not `quotes`) to avoid collision with requests/{id}/quotes
  PROVIDER_QUOTES: 'providerQuotes', // Provider quote submissions under quoteRequests
};

export default COLLECTIONS;
