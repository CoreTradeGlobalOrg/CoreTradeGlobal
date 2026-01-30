/**
 * Cloud Functions for CoreTradeGlobal
 *
 * These functions use Firebase Admin SDK to perform privileged operations
 * that cannot be done from the client side.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Helper function to check if user is admin
 * Checks Firestore user document for role
 */
async function isUserAdmin(userId) {
  if (!userId) return false;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    return userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Soft Delete User Account (User self-delete)
 *
 * Marks user as deleted with 15-day recovery period
 * User can recover their account within 15 days
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.softDeleteUser = onCall(
  { cors: true },
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only user can soft-delete their own account
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'You can only delete your own account.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      // Calculate recovery deadline (15 days from now)
      const now = admin.firestore.Timestamp.now();
      const recoveryDeadline = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      );

      // Update user document with soft delete flags
      await userRef.update({
        isDeleted: true,
        deletedAt: now,
        deletionType: 'self',
        canRecoverUntil: recoveryDeadline,
        updatedAt: now,
      });

      console.log(`🗑️ User ${userId} soft-deleted, can recover until ${recoveryDeadline.toDate()}`);

      return {
        success: true,
        message: 'Your account has been scheduled for deletion. You can recover it within 15 days.',
        canRecoverUntil: recoveryDeadline.toDate().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error soft-deleting user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to delete account: ${error.message}`);
    }
  }
);

/**
 * Recover User Account
 *
 * Allows user to recover their self-deleted account within 15 days
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.recoverAccount = onCall(
  { cors: true },
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'You can only recover your own account.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userDoc.data();

      // Check if account is deleted
      if (!userData.isDeleted) {
        throw new HttpsError('failed-precondition', 'Account is not deleted.');
      }

      // Check if it's a self-delete (not admin ban)
      if (userData.deletionType !== 'self') {
        throw new HttpsError('permission-denied', 'This account was banned by an administrator. Please contact support.');
      }

      // Check if recovery period has expired
      const now = new Date();
      const recoveryDeadline = userData.canRecoverUntil?.toDate();

      if (recoveryDeadline && now > recoveryDeadline) {
        throw new HttpsError('deadline-exceeded', 'Recovery period has expired. Your account can no longer be recovered.');
      }

      // Recover the account
      await userRef.update({
        isDeleted: false,
        deletedAt: admin.firestore.FieldValue.delete(),
        deletionType: admin.firestore.FieldValue.delete(),
        canRecoverUntil: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`✅ User ${userId} recovered their account`);

      return {
        success: true,
        message: 'Your account has been recovered successfully!',
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`❌ Error recovering user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to recover account: ${error.message}`);
    }
  }
);

/**
 * Ban User (Admin only)
 *
 * Permanently bans a user account (can be unbanned by admin)
 *
 * @param {Object} data - { userId: string, reason?: string }
 * @returns {Promise<Object>} - Success message
 */
exports.banUser = onCall(
  { cors: true },
  async (request) => {
    const { userId, reason } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can ban users - check Firestore
    const isAdmin = await isUserAdmin(auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only administrators can ban users.');
    }

    // Cannot ban yourself
    if (auth.uid === userId) {
      throw new HttpsError('invalid-argument', 'You cannot ban yourself.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userDoc.data();

      // Cannot ban another admin
      if (userData.role === 'admin') {
        throw new HttpsError('permission-denied', 'Cannot ban another administrator.');
      }

      const now = admin.firestore.Timestamp.now();

      // Update user document with ban flags
      await userRef.update({
        isDeleted: true,
        deletedAt: now,
        deletionType: 'admin_ban',
        banReason: reason || 'Violation of terms of service',
        bannedBy: auth.uid,
        updatedAt: now,
        // Remove recovery fields if they exist from previous self-delete
        canRecoverUntil: admin.firestore.FieldValue.delete(),
      });

      console.log(`🚫 User ${userId} banned by admin ${auth.uid}. Reason: ${reason || 'Not specified'}`);

      return {
        success: true,
        message: 'User has been banned successfully.',
        userId: userId,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`❌ Error banning user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to ban user: ${error.message}`);
    }
  }
);

/**
 * Unban User (Admin only)
 *
 * Restores a banned user account
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.unbanUser = onCall(
  { cors: true },
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can unban users - check Firestore
    const isAdmin = await isUserAdmin(auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only administrators can unban users.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userDoc.data();

      if (!userData.isDeleted) {
        throw new HttpsError('failed-precondition', 'User is not banned.');
      }

      // Restore the account
      await userRef.update({
        isDeleted: false,
        deletedAt: admin.firestore.FieldValue.delete(),
        deletionType: admin.firestore.FieldValue.delete(),
        banReason: admin.firestore.FieldValue.delete(),
        bannedBy: admin.firestore.FieldValue.delete(),
        canRecoverUntil: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`✅ User ${userId} unbanned by admin ${auth.uid}`);

      return {
        success: true,
        message: 'User has been unbanned successfully.',
        userId: userId,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`❌ Error unbanning user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to unban user: ${error.message}`);
    }
  }
);

/**
 * Hard Delete User Account (Permanent)
 *
 * Completely removes user from both Firebase Auth and Firestore
 * Can be called by admin to permanently delete a user
 * Also used by scheduled cleanup for expired self-deleted accounts
 *
 * @param {Object} data - { userId: string }
 * @param {Object} context - Firebase auth context
 * @returns {Promise<Object>} - Success message
 */
exports.deleteUser = onCall(
  {
    cors: true,
  },
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    // Check if user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in to delete an account.');
    }

    // Only admins can hard delete users - check Firestore
    const isAdmin = await isUserAdmin(auth.uid);

    if (!isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only administrators can permanently delete accounts. Use soft delete for your own account.'
      );
    }

    try {
      console.log(`🗑️  Hard deleting user account: ${userId}`);

      // 1. Delete user's products
      const productsSnapshot = await db.collection('products').where('userId', '==', userId).get();
      const productDeletePromises = productsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(productDeletePromises);
      console.log(`✅ Deleted ${productsSnapshot.size} products`);

      // 2. Delete user's requests
      const requestsSnapshot = await db.collection('requests').where('userId', '==', userId).get();
      const requestDeletePromises = requestsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(requestDeletePromises);
      console.log(`✅ Deleted ${requestsSnapshot.size} requests`);

      // 3. Delete user's conversations and messages
      const conversationsSnapshot = await db.collection('conversations')
        .where('participants', 'array-contains', userId)
        .get();

      for (const convDoc of conversationsSnapshot.docs) {
        // Delete all messages in the conversation
        const messagesSnapshot = await convDoc.ref.collection('messages').get();
        const messageDeletePromises = messagesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(messageDeletePromises);
        // Delete the conversation
        await convDoc.ref.delete();
      }
      console.log(`✅ Deleted ${conversationsSnapshot.size} conversations`);

      // 4. Delete user's storage files (profile photos, product images)
      try {
        const bucket = admin.storage().bucket();
        await bucket.deleteFiles({ prefix: `users/${userId}/` });
        await bucket.deleteFiles({ prefix: `products/${userId}/` });
        console.log(`✅ Deleted storage files`);
      } catch (storageError) {
        // Storage might not have files, continue anyway
        console.log(`⚠️ Storage cleanup: ${storageError.message}`);
      }

      // 5. Delete user document from Firestore
      await db.collection('users').doc(userId).delete();
      console.log(`✅ Deleted from Firestore: ${userId}`);

      // 6. Delete user from Firebase Authentication (if exists)
      try {
        await admin.auth().deleteUser(userId);
        console.log(`✅ Deleted from Firebase Auth: ${userId}`);
      } catch (authError) {
        // User might not exist in Auth (already deleted or never created)
        if (authError.code === 'auth/user-not-found') {
          console.log(`⚠️ User not found in Firebase Auth (already deleted or orphaned document): ${userId}`);
        } else {
          throw authError;
        }
      }

      return {
        success: true,
        message: 'User account and all related data have been permanently deleted.',
        userId: userId,
        deletedData: {
          products: productsSnapshot.size,
          requests: requestsSnapshot.size,
          conversations: conversationsSnapshot.size,
        }
      };
    } catch (error) {
      console.error(`❌ Error deleting user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
    }
  }
);

/**
 * Send Push Notification on New Message
 *
 * Triggers when a new message is created in a conversation
 * Sends push notification to all recipients (excluding sender)
 */
exports.sendMessageNotification = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return null;
    }

    const message = snapshot.data();
    const { conversationId } = event.params;

    console.log(`📨 New message in conversation ${conversationId}`);

    try {
      // Get the conversation to find participants
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();

      if (!conversationDoc.exists) {
        console.log('Conversation not found');
        return null;
      }

      const conversation = conversationDoc.data();
      const participants = conversation.participants || [];

      // Get recipients (exclude the sender)
      const recipients = participants.filter(uid => uid !== message.senderId);

      if (recipients.length === 0) {
        console.log('No recipients to notify');
        return null;
      }

      // Collect FCM tokens from all recipients
      const tokens = [];

      for (const recipientId of recipients) {
        const userDoc = await db.collection('users').doc(recipientId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData.fcmToken) {
            tokens.push(userData.fcmToken);
          }
        }
      }

      if (tokens.length === 0) {
        console.log('No FCM tokens found for recipients');
        return null;
      }

      console.log(`📱 Sending notification to ${tokens.length} device(s)`);

      // Prepare notification payload
      const notificationPayload = {
        notification: {
          title: message.senderName || 'New Message',
          body: message.content.length > 100
            ? message.content.substring(0, 97) + '...'
            : message.content,
        },
        data: {
          conversationId: conversationId,
          messageId: event.params.messageId,
          senderId: message.senderId,
          senderName: message.senderName || '',
          type: 'new_message',
          click_action: `/messages/${conversationId}`,
        },
        webpush: {
          fcmOptions: {
            link: `/messages/${conversationId}`,
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
          },
        },
      };

      // Send to all tokens
      const sendPromises = tokens.map(token =>
        messaging.send({
          ...notificationPayload,
          token: token,
        }).catch(error => {
          console.error(`Error sending to token ${token}:`, error.code);
          // If token is invalid, remove it from user's document
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            return db.collection('users')
              .where('fcmToken', '==', token)
              .get()
              .then(snapshot => {
                snapshot.forEach(doc => {
                  doc.ref.update({ fcmToken: admin.firestore.FieldValue.delete() });
                });
              });
          }
          return null;
        })
      );

      await Promise.all(sendPromises);
      console.log('✅ Notifications sent successfully');

      return null;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return null;
    }
  }
);
