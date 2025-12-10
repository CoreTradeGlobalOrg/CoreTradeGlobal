/**
 * Cloud Functions for CoreTradeGlobal
 *
 * These functions use Firebase Admin SDK to perform privileged operations
 * that cannot be done from the client side.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Delete User Account (Hard Delete)
 *
 * Completely removes user from both Firebase Auth and Firestore
 * Can be called by the user themselves or by an admin
 *
 * @param {Object} data - { userId: string }
 * @param {Object} context - Firebase auth context
 * @returns {Promise<Object>} - Success message
 */
exports.deleteUser = onCall(
  {
    cors: true, // Enable CORS for development
  },
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    // Check if user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in to delete an account.');
    }

    // Check authorization: user can delete their own account OR admin can delete any account
    const isOwnAccount = auth.uid === userId;
    const isAdmin = auth.token.role === 'admin';

    if (!isOwnAccount && !isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to delete this account.'
      );
    }

    try {
      console.log(`🗑️  Deleting user account: ${userId}`);

      // 1. Delete user from Firebase Authentication
      await admin.auth().deleteUser(userId);
      console.log(`✅ Deleted from Firebase Auth: ${userId}`);

      // 2. Delete user document from Firestore
      await admin.firestore().collection('users').doc(userId).delete();
      console.log(`✅ Deleted from Firestore: ${userId}`);

      // 3. Optionally: Delete user's storage files (company logo, etc.)
      // const bucket = admin.storage().bucket();
      // await bucket.deleteFiles({ prefix: `${userId}/` });
      // console.log(`✅ Deleted storage files: ${userId}`);

      return {
        success: true,
        message: 'User account has been permanently deleted.',
        userId: userId,
      };
    } catch (error) {
      console.error(`❌ Error deleting user ${userId}:`, error);

      // Handle specific errors
      if (error.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'User not found in Firebase Auth.');
      }

      throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
    }
  }
);
