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

      // 6. Delete user from Firebase Authentication
      await admin.auth().deleteUser(userId);
      console.log(`✅ Deleted from Firebase Auth: ${userId}`);

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

      // Handle specific errors
      if (error.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'User not found in Firebase Auth.');
      }

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
