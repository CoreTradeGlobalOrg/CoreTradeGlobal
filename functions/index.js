/**
 * Cloud Functions for CoreTradeGlobal
 *
 * These functions use Firebase Admin SDK to perform privileged operations
 * that cannot be done from the client side.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { Resend } = require('resend');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Lazy Resend initialization — only created when first email is sent.
// Set RESEND_API_KEY in functions/.env or via firebase functions:config:set resend.api_key='re_xxxxx'
let _resend = null;
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

/**
 * Role constants (duplicated here to avoid ESM import in CJS Cloud Functions)
 * Source of truth: src/core/constants/roles.js
 */
const ROLES = {
  MEMBER: 'member',
  LOGISTICS_PROVIDER: 'logistics_provider',
  INSURANCE_PROVIDER: 'insurance_provider',
  LAWYER: 'lawyer',
  ADMIN: 'admin',
};

const ROLE_VALUES = Object.values(ROLES);

// Roles assignable via invite flow (members self-register, admins are bootstrapped)
const VALID_INVITE_ROLES = [
  ROLES.LOGISTICS_PROVIDER,
  ROLES.INSURANCE_PROVIDER,
  ROLES.LAWYER,
];

/**
 * App URL for generating invite sign-in links.
 * Set APP_URL environment variable or configure via functions.config().app.url
 */
const APP_URL = process.env.APP_URL || 'https://core-trade-global.web.app';

/**
 * Helper function to check if user is admin
 * Uses custom claims from the verified token for security (no Firestore read).
 * Falls back to Firestore for legacy accounts without claims.
 */
async function isUserAdmin(userId) {
  if (!userId) return false;
  try {
    // Primary check: custom claims on the Firebase Auth token
    const userRecord = await admin.auth().getUser(userId);
    const claims = userRecord.customClaims || {};
    if (claims.role !== undefined) {
      return claims.role === 'admin';
    }
    // Fallback for legacy accounts: Firestore document read
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    return userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Management Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invite User (Admin only)
 *
 * Creates a Firebase Auth user with a specific role, sets custom claims,
 * creates the Firestore user doc and invite doc, and generates a sign-in link.
 *
 * Note: The invites/{inviteId} document uses `expireAt` as the TTL field.
 * Configure TTL policy in Firebase Console:
 *   Collection: invites, Field: expireAt
 *
 * @param {Object} data - { email, role, name, company }
 * @returns {Promise<{ success: boolean, uid: string }>}
 */
exports.inviteUser = onCall(
  async (request) => {
    const { email, role, name, company } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can invite users
    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can invite users.');
    }

    // Validate role — only inviteable roles allowed
    if (!VALID_INVITE_ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role. Must be one of: ${VALID_INVITE_ROLES.join(', ')}`
      );
    }

    if (!email || !role || !name) {
      throw new HttpsError('invalid-argument', 'email, role, and name are required.');
    }

    let newUser;

    try {
      // Create the Firebase Auth user
      newUser = await admin.auth().createUser({
        email,
        displayName: name,
        emailVerified: false,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'A user with this email already exists.');
      }
      console.error('Error creating user:', error);
      throw new HttpsError('internal', `Failed to create user: ${error.message}`);
    }

    const uid = newUser.uid;
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    try {
      // Set custom claims — role is the single source of truth
      await admin.auth().setCustomUserClaims(uid, { role });

      // Create Firestore user document
      await db.collection('users').doc(uid).set({
        email,
        displayName: name,
        companyName: company || null,
        role,
        inviteStatus: 'pending',
        invitedBy: auth.uid,
        invitedAt: now,
        createdAt: now,
        emailVerified: false,
        adminApproved: true,
      });

      // Generate sign-in link for onboarding
      // generateSignInWithEmailLink returns a link through __/auth/action which
      // doesn't handle mode=signIn redirects. Reconstruct as a direct app link
      // so the onboarding page can call signInWithEmailLink directly.
      const rawLink = await admin.auth().generateSignInWithEmailLink(email, {
        url: `${APP_URL}/onboarding?uid=${uid}`,
        handleCodeInApp: true,
      });
      const parsedLink = new URL(rawLink);
      const signInLink = `${APP_URL}/onboarding?uid=${uid}&mode=${parsedLink.searchParams.get('mode')}&oobCode=${parsedLink.searchParams.get('oobCode')}&apiKey=${parsedLink.searchParams.get('apiKey')}&lang=${parsedLink.searchParams.get('lang') || 'en'}`;

      // Create invite document with TTL (expireAt = TTL field for Firebase Console TTL policy)
      await db.collection('invites').doc(uid).set({
        email,
        role,
        name,
        company: company || null,
        status: 'pending',
        invitedBy: auth.uid,
        invitedAt: now,
        expiresAt,
        expireAt: expiresAt, // TTL field — configure in Firebase Console: Collection=invites, Field=expireAt
        signInLink, // Stored for resend capability
      });

      console.log(`Invited user ${uid} (${email}) with role ${role}`);

      return { success: true, uid };
    } catch (error) {
      // Attempt cleanup of partially-created user on failure
      try {
        await admin.auth().deleteUser(uid);
      } catch (_) { /* best-effort cleanup */ }
      console.error('Error during invite setup:', error);
      throw new HttpsError('internal', `Failed to complete invite: ${error.message}`);
    }
  }
);

/**
 * Resend Invite (Admin only)
 *
 * Regenerates the sign-in link for an existing invite (pending or expired).
 * Resets the invite's expiresAt to 7 days from now and updates the signInLink.
 * Does NOT recreate the Auth user — they already exist from the initial invite.
 *
 * @param {Object} data - { email, role, name, company }
 * @returns {Promise<{ success: boolean, uid: string }>}
 */
exports.resendInvite = onCall(
  async (request) => {
    const { email, role, name, company } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can resend invites.');
    }

    if (!email || !role) {
      throw new HttpsError('invalid-argument', 'email and role are required.');
    }

    if (!VALID_INVITE_ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role. Must be one of: ${VALID_INVITE_ROLES.join(', ')}`
      );
    }

    try {
      // Look up existing Auth user by email
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          throw new HttpsError('not-found', `No invited user found with email: ${email}`);
        }
        throw err;
      }

      const uid = userRecord.uid;
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      );

      // Regenerate sign-in link
      const signInLink = await admin.auth().generateSignInWithEmailLink(email, {
        url: `${APP_URL}/onboarding?uid=${uid}`,
        handleCodeInApp: true,
      });

      // Update the invite doc: new expiry + new sign-in link
      await db.collection('invites').doc(uid).update({
        status: 'pending',
        expiresAt,
        expireAt: expiresAt,
        signInLink,
        resentAt: now,
        resentBy: auth.uid,
        name: name || userRecord.displayName || null,
        company: company || null,
      });

      console.log(`Resent invite for ${uid} (${email}) with role ${role}`);

      return { success: true, uid };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error resending invite:', error);
      throw new HttpsError('internal', `Failed to resend invite: ${error.message}`);
    }
  }
);

/**
 * Set User Role (Admin only)
 *
 * Atomically updates a user's custom claims and their Firestore users document.
 * This replaces direct Firestore writes for role changes (e.g., handleToggleAdmin).
 *
 * @param {Object} data - { userId, role }
 * @returns {Promise<{ success: boolean }>}
 */
exports.setUserRole = onCall(
  async (request) => {
    const { userId, role } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can change roles
    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can change user roles.');
    }

    // Validate role — all 5 roles can be assigned by admin
    if (!ROLE_VALUES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role. Must be one of: ${ROLE_VALUES.join(', ')}`
      );
    }

    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required.');
    }

    // Cannot change your own role (self-demotion guard)
    if (auth.uid === userId) {
      throw new HttpsError('invalid-argument', 'You cannot change your own role.');
    }

    try {
      // Update custom claims — role is enforced via JWT, not Firestore reads
      await admin.auth().setCustomUserClaims(userId, { role });

      // Update Firestore for display/query purposes
      await db.collection('users').doc(userId).update({
        role,
        updatedAt: Timestamp.now(),
      });

      console.log(`Set role ${role} for user ${userId} (by admin ${auth.uid})`);

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`Error setting role for user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to set user role: ${error.message}`);
    }
  }
);

/**
 * Migrate Existing Users (Admin only)
 *
 * One-time migration function for bootstrapping existing accounts.
 * Sets role='member' custom claim for all users without a role claim.
 * Exception: if a user has role='admin' in Firestore, sets claim to 'admin'.
 *
 * Run once after deploying the role system. Safe to run multiple times
 * (skips users who already have a role claim set).
 *
 * @returns {Promise<{ migrated: number, skipped: number }>}
 */
exports.migrateExistingUsers = onCall(
  async (request) => {
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can run migration
    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can run user migration.');
    }

    let migrated = 0;
    let skipped = 0;
    let pageToken;

    try {
      do {
        // List users in batches of 1000 (Firebase Auth max)
        const listResult = await admin.auth().listUsers(1000, pageToken);

        for (const userRecord of listResult.users) {
          const claims = userRecord.customClaims || {};

          // Skip users who already have a role claim
          if (claims.role !== undefined) {
            skipped++;
            continue;
          }

          // Check Firestore for existing admin role (legacy accounts)
          let roleToSet = 'member';
          try {
            const userDoc = await db.collection('users').doc(userRecord.uid).get();
            if (userDoc.exists && userDoc.data().role === 'admin') {
              roleToSet = 'admin';
            }
          } catch (_) { /* if Firestore read fails, default to member */ }

          await admin.auth().setCustomUserClaims(userRecord.uid, { role: roleToSet });
          migrated++;

          console.log(`Migrated user ${userRecord.uid}: set role=${roleToSet}`);
        }

        pageToken = listResult.pageToken;
      } while (pageToken);

      console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);

      return { migrated, skipped };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error during user migration:', error);
      throw new HttpsError('internal', `Migration failed: ${error.message}`);
    }
  }
);

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
      const now = Timestamp.now();
      const recoveryDeadline = Timestamp.fromDate(
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
        deletedAt: FieldValue.delete(),
        deletionType: FieldValue.delete(),
        canRecoverUntil: FieldValue.delete(),
        updatedAt: Timestamp.now(),
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

      const now = Timestamp.now();

      // Update user document with ban flags
      await userRef.update({
        isDeleted: true,
        deletedAt: now,
        deletionType: 'admin_ban',
        banReason: reason || 'Violation of terms of service',
        bannedBy: auth.uid,
        updatedAt: now,
        // Remove recovery fields if they exist from previous self-delete
        canRecoverUntil: FieldValue.delete(),
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
        deletedAt: FieldValue.delete(),
        deletionType: FieldValue.delete(),
        banReason: FieldValue.delete(),
        bannedBy: FieldValue.delete(),
        canRecoverUntil: FieldValue.delete(),
        updatedAt: Timestamp.now(),
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

      // Prepare DATA-ONLY payload (no 'notification' field)
      // This prevents FCM from auto-showing notifications
      // The service worker/client will handle display
      const notificationPayload = {
        data: {
          conversationId: conversationId,
          messageId: event.params.messageId,
          senderId: message.senderId,
          senderName: message.senderName || 'New Message',
          messageContent: message.content.length > 100
            ? message.content.substring(0, 97) + '...'
            : message.content,
          type: 'new_message',
          click_action: `/messages/${conversationId}`,
        },
        webpush: {
          fcmOptions: {
            link: `/messages/${conversationId}`,
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
                  doc.ref.update({ fcmToken: FieldValue.delete() });
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

// ─────────────────────────────────────────────────────────────────────────────
// Deal Negotiation Constants (mirrored from src/core/constants/dealConstants.js)
// Cloud Functions are CommonJS — cannot import ESM from the Next.js app.
// ─────────────────────────────────────────────────────────────────────────────

const DEAL_STATUS = {
  NEGOTIATING: 'negotiating',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
};

const OFFER_STATUS = {
  OPEN: 'open',
  COUNTERED: 'countered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
};

const EXPIRY_DEFAULT_HOURS = 72;

// ─────────────────────────────────────────────────────────────────────────────
// Deal Negotiation Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Deal
 *
 * Atomically creates a deal document and its initial offer in a single Firestore
 * transaction. Determines buyer/seller from product ownership.
 *
 * @param {Object} data - { conversationId, productId, initialOffer }
 *   initialOffer: { price, quantity, unit, currency, conversionRate?, incoterm,
 *                   namedPlace, deliveryDeadline, paymentTerms, insurancePreference,
 *                   notes?, expiryHours? }
 * @returns {Promise<{ success: boolean, dealId: string }>}
 */
exports.createDeal = onCall(async (request) => {
  const { conversationId, productId, initialOffer } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in to create a deal.');
  if (!conversationId || !productId || !initialOffer) {
    throw new HttpsError('invalid-argument', 'conversationId, productId, and initialOffer are required.');
  }
  if (!initialOffer.price || !initialOffer.quantity || !initialOffer.incoterm) {
    throw new HttpsError('invalid-argument', 'initialOffer must include price, quantity, and incoterm.');
  }

  // Fetch product to get seller ID and denormalized data
  const productDoc = await db.collection('products').doc(productId).get();
  if (!productDoc.exists) {
    throw new HttpsError('not-found', 'Product not found.');
  }
  const product = productDoc.data();
  const sellerId = product.userId;

  // Determine buyer/seller:
  // Product owner is always the seller.
  // If the initiator IS the seller, fetch the conversation to find the buyer.
  let buyerId;
  let actualSellerId = sellerId;

  if (uid === sellerId) {
    // Seller initiated — find buyer from conversation participants
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    if (!convDoc.exists) {
      throw new HttpsError('not-found', 'Conversation not found.');
    }
    const conv = convDoc.data();
    const participants = conv.participants || [];
    buyerId = participants.find((p) => p !== sellerId);
    if (!buyerId) {
      throw new HttpsError('failed-precondition', 'Could not determine buyer from conversation participants.');
    }
  } else {
    // Buyer initiated
    buyerId = uid;
  }

  const now = Timestamp.now();
  const expiryHours = initialOffer.expiryHours || EXPIRY_DEFAULT_HOURS;
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + expiryHours * 60 * 60 * 1000)
  );

  const dealRef = db.collection('deals').doc(); // auto-ID
  const offerRef = dealRef.collection('offers').doc(); // auto-ID

  const initiatorRole = uid === actualSellerId ? 'seller' : 'buyer';

  // latestOfferSnapshot: denormalized subset of offer terms for the deals list page
  const latestOfferSnapshot = {
    price: initialOffer.price,
    quantity: initialOffer.quantity,
    unit: initialOffer.unit,
    currency: initialOffer.currency,
    incoterm: initialOffer.incoterm,
    namedPlace: initialOffer.namedPlace,
    estimatedTotal: initialOffer.price * initialOffer.quantity,
    expiresAt,
    submittedBy: uid,
  };

  await db.runTransaction(async (transaction) => {
    // Create the deal document
    transaction.set(dealRef, {
      buyerId,
      sellerId: actualSellerId,
      initiatedBy: uid,
      productId,
      productName: product.name || '',
      productImage: product.images?.[0] || null,
      productCategory: product.categoryName || null,
      conversationId,
      status: DEAL_STATUS.NEGOTIATING,
      // After submitting, the OTHER party must respond first
      currentTurnUid: uid === actualSellerId ? buyerId : actualSellerId,
      round: 1,
      latestOfferSnapshot,
      createdAt: now,
      updatedAt: now,
    });

    // Create the initial offer document
    const { expiryHours: _expiryHours, ...offerTerms } = initialOffer;
    transaction.set(offerRef, {
      round: 1,
      submittedBy: uid,
      role: initiatorRole,
      ...offerTerms,
      conversionRate: initialOffer.conversionRate || null,
      notes: initialOffer.notes || null,
      attachments: [],
      status: OFFER_STATUS.OPEN,
      expiresAt,
      estimatedTotal: initialOffer.price * initialOffer.quantity,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Note: system message is posted by onDealOfferCreated trigger (round === 1 = new_deal)
  // to avoid duplicate messages. Do NOT post system message here.

  console.log(`Deal created: ${dealRef.id} (buyer: ${buyerId}, seller: ${actualSellerId})`);
  return { success: true, dealId: dealRef.id };
});

/**
 * Submit Counter Offer
 *
 * Creates a new offer round in a deal. Enforces turn-based logic and
 * round number check to prevent stale concurrent writes.
 *
 * @param {Object} data - { dealId, offer, expectedRound }
 *   offer: { price, quantity, unit, currency, conversionRate?, incoterm,
 *             namedPlace, deliveryDeadline, paymentTerms, insurancePreference,
 *             notes?, expiryHours? }
 * @returns {Promise<{ success: boolean, dealId: string }>}
 */
exports.submitCounterOffer = onCall(async (request) => {
  const { dealId, offer, expectedRound } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offer) {
    throw new HttpsError('invalid-argument', 'dealId and offer are required.');
  }
  if (expectedRound === undefined || expectedRound === null) {
    throw new HttpsError('invalid-argument', 'expectedRound is required to prevent stale writes.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);

    // Find the open offer — query within transaction is not directly supported
    // so we fetch the deal first, then query the offers subcollection
    const dealSnap = await transaction.get(dealRef);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');

    const deal = dealSnap.data();

    // State machine guards
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Only active negotiations can receive counter-offers.`
      );
    }
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'It is not your turn to respond.');
    }
    if (deal.round !== expectedRound) {
      throw new HttpsError(
        'aborted',
        'Deal has been updated since you last loaded it. Please refresh.'
      );
    }

    // Fetch all open offers to find the current one
    // (Admin SDK: we can query outside the transaction and then lock via get in transaction)
    const openOffersSnap = await dealRef
      .collection('offers')
      .where('status', '==', OFFER_STATUS.OPEN)
      .orderBy('round', 'desc')
      .limit(1)
      .get();

    if (openOffersSnap.empty) {
      throw new HttpsError('not-found', 'No open offer found for this deal.');
    }

    const latestOfferDoc = openOffersSnap.docs[0];
    const latestOfferRef = latestOfferDoc.ref;

    // Lock the offer doc inside the transaction
    const lockedOfferSnap = await transaction.get(latestOfferRef);
    if (!lockedOfferSnap.exists) {
      throw new HttpsError('not-found', 'Offer document not found.');
    }
    if (lockedOfferSnap.data().status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${lockedOfferSnap.data().status}, cannot counter.`
      );
    }

    const now = Timestamp.now();
    const expiryHours = offer.expiryHours || EXPIRY_DEFAULT_HOURS;
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    );
    const newRound = deal.round + 1;

    // Determine the counter-offerer's role
    const counterOffererRole = uid === deal.sellerId ? 'seller' : 'buyer';
    // Flip the turn to the other party
    const nextTurnUid = uid === deal.buyerId ? deal.sellerId : deal.buyerId;

    const latestOfferSnapshot = {
      price: offer.price,
      quantity: offer.quantity,
      unit: offer.unit,
      currency: offer.currency,
      incoterm: offer.incoterm,
      namedPlace: offer.namedPlace,
      estimatedTotal: offer.price * offer.quantity,
      expiresAt,
      submittedBy: uid,
    };

    // Mark old offer as countered
    transaction.update(latestOfferRef, {
      status: OFFER_STATUS.COUNTERED,
      updatedAt: now,
    });

    // Create new offer document
    const newOfferRef = dealRef.collection('offers').doc();
    const { expiryHours: _expiryHours, ...offerTerms } = offer;
    transaction.set(newOfferRef, {
      round: newRound,
      submittedBy: uid,
      role: counterOffererRole,
      ...offerTerms,
      conversionRate: offer.conversionRate || null,
      notes: offer.notes || null,
      attachments: [],
      status: OFFER_STATUS.OPEN,
      expiresAt,
      estimatedTotal: offer.price * offer.quantity,
      createdAt: now,
      updatedAt: now,
    });

    // Update deal: advance round, flip turn, update snapshot
    transaction.update(dealRef, {
      round: newRound,
      currentTurnUid: nextTurnUid,
      latestOfferSnapshot,
      updatedAt: now,
    });
  });

  console.log(`Counter-offer submitted for deal: ${dealId} by user: ${uid}`);
  return { success: true, dealId };
});

/**
 * Accept Offer
 *
 * Atomically accepts an open offer, setting both the offer and deal status
 * to 'accepted'. Phase 3 triggers contract generation via onDocumentUpdated
 * on deal.status change — this CF only sets the status.
 *
 * @param {Object} data - { dealId, offerId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.acceptOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // State machine guards
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Only negotiating deals can be accepted.`
      );
    }
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'It is not your turn to respond.');
    }
    if (offer.status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}, cannot accept.`
      );
    }

    // Check offer has not expired
    const now = Timestamp.now();
    if (offer.expiresAt && offer.expiresAt.toMillis() <= now.toMillis()) {
      throw new HttpsError(
        'failed-precondition',
        'Offer has expired and cannot be accepted.'
      );
    }

    transaction.update(offerRef, {
      status: OFFER_STATUS.ACCEPTED,
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.ACCEPTED,
      updatedAt: now,
    });
  });

  console.log(`Offer ${offerId} accepted for deal: ${dealId} by user: ${uid}`);
  return { success: true };
});

/**
 * Reject Offer
 *
 * Atomically rejects an open offer, setting both the offer and deal status
 * to 'rejected'. Same guard structure as acceptOffer.
 *
 * @param {Object} data - { dealId, offerId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.rejectOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // State machine guards
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Only negotiating deals can be rejected.`
      );
    }
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'It is not your turn to respond.');
    }
    if (offer.status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}, cannot reject.`
      );
    }

    const now = Timestamp.now();

    transaction.update(offerRef, {
      status: OFFER_STATUS.REJECTED,
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.REJECTED,
      updatedAt: now,
    });
  });

  console.log(`Offer ${offerId} rejected for deal: ${dealId} by user: ${uid}`);
  return { success: true };
});

/**
 * Withdraw Offer
 *
 * Allows the offer submitter to withdraw their open offer before the other
 * party responds. Only the sender can withdraw; deal is also marked withdrawn.
 *
 * @param {Object} data - { dealId, offerId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.withdrawOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // Only the offer submitter can withdraw
    if (offer.submittedBy !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the offer submitter can withdraw this offer.'
      );
    }
    // Can only withdraw open offers
    if (offer.status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}, cannot withdraw.`
      );
    }
    // Deal must still be negotiating
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Cannot withdraw from a ${deal.status} deal.`
      );
    }

    const now = Timestamp.now();

    transaction.update(offerRef, {
      status: OFFER_STATUS.WITHDRAWN,
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.WITHDRAWN,
      updatedAt: now,
    });
  });

  console.log(`Offer ${offerId} withdrawn for deal: ${dealId} by user: ${uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Deal Notification Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sendDealEmail — wraps Resend SDK call.
 *
 * Non-blocking: email failure does NOT fail the Cloud Function.
 * From address uses onboarding@resend.dev for Phase 2 development.
 * Switch to a verified custom domain before production.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} htmlBody - HTML content for the email body
 */
async function sendDealEmail(to, subject, htmlBody) {
  if (!to || !subject || !htmlBody) return;
  const resend = getResend();
  if (!resend) {
    console.warn('sendDealEmail: RESEND_API_KEY not set, skipping email.');
    return;
  }
  try {
    await resend.emails.send({
      from: 'CoreTradeGlobal <onboarding@resend.dev>',
      to,
      subject,
      html: htmlBody,
    });
    console.log(`sendDealEmail: sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`sendDealEmail: failed to send to ${to}:`, err);
    // Non-blocking — swallow the error
  }
}

/**
 * Build per-event subject line and text for notifications / emails.
 */
function getDealEventCopy(eventType, productName) {
  const name = productName || 'this product';
  const map = {
    new_deal: {
      title: `New offer on ${name}`,
      body: `A new deal offer has been submitted for ${name}.`,
      subject: `New offer on ${name}`,
    },
    counter_offer: {
      title: `Counter-offer received on ${name}`,
      body: `A counter-offer has been submitted for ${name}.`,
      subject: `Counter-offer received on ${name}`,
    },
    accepted: {
      title: `Offer accepted on ${name}`,
      body: `The offer on ${name} has been accepted. Congratulations!`,
      subject: `Offer accepted on ${name}`,
    },
    rejected: {
      title: `Offer rejected on ${name}`,
      body: `The offer on ${name} has been rejected.`,
      subject: `Offer rejected on ${name}`,
    },
    expired: {
      title: `Offer expired on ${name}`,
      body: `The offer on ${name} has expired.`,
      subject: `Offer expired on ${name}`,
    },
    withdrawn: {
      title: `Offer withdrawn on ${name}`,
      body: `The offer on ${name} has been withdrawn by the sender.`,
      subject: `Offer withdrawn on ${name}`,
    },
    renewed: {
      title: `Offer renewed on ${name}`,
      body: `The expired offer on ${name} has been renewed with a new deadline.`,
      subject: `Offer renewed on ${name}`,
    },
  };
  return map[eventType] || {
    title: `Deal update on ${name}`,
    body: `There is a new update for the deal on ${name}.`,
    subject: `Deal update on ${name}`,
  };
}

/**
 * Build the HTML email body for a deal event.
 */
function buildDealEmailHtml(eventType, productName, dealId) {
  const { body } = getDealEventCopy(eventType, productName);
  const dealUrl = `${APP_URL}/deals/${dealId}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
      <div style="background: #0F1B2B; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #FFD700; margin: 0; font-size: 20px;">CoreTradeGlobal</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p style="color: #333333; font-size: 16px; line-height: 1.6;">${body}</p>
        <div style="margin-top: 32px;">
          <a href="${dealUrl}"
             style="display: inline-block; background: #0F1B2B; color: #FFD700; text-decoration: none;
                    padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
            View Deal
          </a>
        </div>
        <p style="margin-top: 24px; font-size: 13px; color: #888888;">
          You are receiving this email because you are a participant in a deal on CoreTradeGlobal.
        </p>
      </div>
    </div>
  `;
}

/**
 * sendDealNotifications — orchestrates all 3 notification channels for deal events.
 *
 * Sends to all deal participants EXCEPT the sender (actor) uid.
 * Channels: Firestore in-app notification, FCM push (with smart suppression), Resend email.
 *
 * IMPORTANT: Call this OUTSIDE transactions to prevent duplicate sends on transaction retries.
 *
 * @param {string} dealId
 * @param {string} eventType - new_deal | counter_offer | accepted | rejected | expired | withdrawn | renewed
 * @param {string} senderUid - The UID of the party who triggered the event (excluded from notifications)
 * @param {object} deal - Firestore deal document data
 */
async function sendDealNotifications(dealId, eventType, senderUid, deal) {
  const { title, body } = getDealEventCopy(eventType, deal.productName);
  const allParticipants = [deal.buyerId, deal.sellerId].filter(Boolean);
  const recipients = allParticipants.filter((uid) => uid !== senderUid);

  if (recipients.length === 0) {
    console.log(`sendDealNotifications: no recipients for event ${eventType} on deal ${dealId}`);
    return;
  }

  const now = Timestamp.now();

  for (const recipientId of recipients) {
    // --- a) Firestore in-app notification ---
    try {
      await db.collection('users').doc(recipientId).collection('notifications').add({
        type: 'deal',
        eventType,
        title,
        body,
        dealId,
        dealProductName: deal.productName || '',
        isRead: false,
        createdAt: now,
        link: `/deals/${dealId}`,
      });
    } catch (err) {
      console.error(`sendDealNotifications: failed to create in-app notification for ${recipientId}:`, err);
    }

    // --- b) FCM push notification (smart suppression) ---
    try {
      const userDoc = await db.collection('users').doc(recipientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        // Smart suppression: skip FCM if user is actively viewing this deal
        const viewingDealId = userData.viewingDealId;
        const viewingDealSince = userData.viewingDealSince?.toMillis?.() || 0;
        const now60sAgo = Date.now() - 60000;
        const isActivelyViewing = viewingDealId === dealId && viewingDealSince > now60sAgo;

        if (fcmToken && !isActivelyViewing) {
          try {
            await messaging.send({
              token: fcmToken,
              data: {
                type: 'deal_event',
                dealId,
                eventType,
                click_action: `/deals/${dealId}`,
              },
              webpush: {
                fcmOptions: { link: `/deals/${dealId}` },
              },
            });
          } catch (fcmErr) {
            console.error(`sendDealNotifications: FCM error for ${recipientId}:`, fcmErr.code);
            // Clean up invalid tokens
            if (
              fcmErr.code === 'messaging/invalid-registration-token' ||
              fcmErr.code === 'messaging/registration-token-not-registered'
            ) {
              await db.collection('users').doc(recipientId).update({
                fcmToken: FieldValue.delete(),
              });
            }
          }
        } else if (isActivelyViewing) {
          console.log(`sendDealNotifications: suppressed FCM for ${recipientId} — actively viewing deal ${dealId}`);
        }

        // --- c) Resend email notification ---
        const recipientEmail = userData.email;
        if (recipientEmail) {
          const { subject } = getDealEventCopy(eventType, deal.productName);
          const htmlBody = buildDealEmailHtml(eventType, deal.productName, dealId);
          await sendDealEmail(recipientEmail, subject, htmlBody);
        }
      }
    } catch (err) {
      console.error(`sendDealNotifications: error processing recipient ${recipientId}:`, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Event Triggers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * onDealOfferCreated
 *
 * Fires when a new offer document is created inside a deal's offers subcollection.
 * Determines whether this is a new deal (round 1) or a counter-offer (round > 1),
 * sends all 3 notification channels to the other party, and posts a system message
 * to the linked conversation.
 */
exports.onDealOfferCreated = onDocumentCreated(
  'deals/{dealId}/offers/{offerId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const offer = snapshot.data();
    const { dealId } = event.params;

    try {
      const dealDoc = await db.collection('deals').doc(dealId).get();
      if (!dealDoc.exists) {
        console.log(`onDealOfferCreated: deal ${dealId} not found`);
        return null;
      }
      const deal = dealDoc.data();

      // Determine event type
      const eventType = offer.round === 1 ? 'new_deal' : 'counter_offer';

      // Send notifications (outside transaction — non-blocking, non-duplicate)
      await sendDealNotifications(dealId, eventType, offer.submittedBy, deal);

      // Post system message to conversation (if conversationId is linked)
      if (deal.conversationId) {
        try {
          const conversationRef = db.collection('conversations').doc(deal.conversationId);
          const systemMsgRef = conversationRef.collection('messages').doc();
          const now = Timestamp.now();
          const content =
            eventType === 'new_deal'
              ? `Deal initiated for ${deal.productName || 'this product'}`
              : `Counter-offer (Round ${offer.round}) for ${deal.productName || 'this product'}`;

          await db.runTransaction(async (t) => {
            t.set(systemMsgRef, {
              type: 'system',
              content,
              dealId,
              dealLink: `/deals/${dealId}`,
              senderId: offer.submittedBy,
              createdAt: now,
              updatedAt: now,
            });
            t.update(conversationRef, {
              'lastMessage.content': content,
              'lastMessage.type': 'system',
              'lastMessage.createdAt': now,
              updatedAt: now,
            });
          });
        } catch (msgErr) {
          console.error('onDealOfferCreated: failed to post system message (non-fatal):', msgErr);
        }
      }

      console.log(`onDealOfferCreated: processed ${eventType} for deal ${dealId}`);
      return null;
    } catch (err) {
      console.error(`onDealOfferCreated: error for deal ${dealId}:`, err);
      return null;
    }
  }
);

/**
 * onDealStatusChanged
 *
 * Fires when a deal document is updated. Detects terminal status transitions
 * (accepted, rejected, withdrawn, expired) and sends notifications to both parties.
 *
 * Phase 3 independently listens to deal.status === 'accepted' for contract generation.
 */
exports.onDealStatusChanged = onDocumentUpdated(
  'deals/{dealId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return null;

    // Only fire on terminal status transitions
    const terminalStatuses = ['accepted', 'rejected', 'withdrawn', 'expired'];
    if (before.status === after.status) return null;
    if (!terminalStatuses.includes(after.status)) return null;

    const { dealId } = event.params;

    try {
      // Determine the actor who triggered the change
      // For accepted/rejected: the party whose turn it was (currentTurnUid from BEFORE snapshot)
      // For expired: system (no specific actor — notify both)
      // For withdrawn: the submitter of the withdrawn offer (handled via sendDealNotifications with senderUid)
      let actorUid;
      if (after.status === 'expired') {
        // Both parties are notified — use a sentinel value that matches no participant
        actorUid = 'system';
      } else {
        // Use before.currentTurnUid — that's who accepted/rejected/withdrew
        actorUid = before.currentTurnUid || 'system';
      }

      // Map deal status to notification event type
      const eventTypeMap = {
        accepted: 'accepted',
        rejected: 'rejected',
        withdrawn: 'withdrawn',
        expired: 'expired',
      };
      const eventType = eventTypeMap[after.status];

      await sendDealNotifications(dealId, eventType, actorUid, after);

      console.log(`onDealStatusChanged: deal ${dealId} transitioned ${before.status} → ${after.status}`);
      return null;
    } catch (err) {
      console.error(`onDealStatusChanged: error for deal ${dealId}:`, err);
      return null;
    }
  }
);

/**
 * Renew Offer
 *
 * Allows the original offer sender to reactivate an expired offer with a new
 * expiry deadline. Only the submitter can renew; only expired offers can be renewed.
 *
 * @param {Object} data - { dealId, offerId, newExpiryHours }
 * @returns {Promise<{ success: boolean }>}
 */
exports.renewOffer = onCall(async (request) => {
  const { dealId, offerId, newExpiryHours } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  const expiryHours = newExpiryHours || EXPIRY_DEFAULT_HOURS;

  let deal;

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const dealData = dealSnap.data();
    const offer = offerSnap.data();

    // Guard: only the original sender can renew
    if (offer.submittedBy !== uid) {
      throw new HttpsError('permission-denied', 'Only the offer sender can renew an expired offer.');
    }
    // Guard: can only renew expired offers
    if (offer.status !== OFFER_STATUS.EXPIRED) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}. Only expired offers can be renewed.`
      );
    }

    const now = Timestamp.now();
    const newExpiresAt = Timestamp.fromDate(
      new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    );

    // Flip the turn to the OTHER party (the receiver must now respond)
    const nextTurnUid = uid === dealData.buyerId ? dealData.sellerId : dealData.buyerId;

    transaction.update(offerRef, {
      status: OFFER_STATUS.OPEN,
      expiresAt: newExpiresAt,
      remindersSet: [],
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.NEGOTIATING,
      currentTurnUid: nextTurnUid,
      updatedAt: now,
    });

    deal = dealData;
  });

  // Post-transaction: notify the other party about renewal (non-blocking)
  if (deal) {
    await sendDealNotifications(dealId, 'renewed', uid, deal);
  }

  console.log(`renewOffer: offer ${offerId} renewed for deal ${dealId} by ${uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-Update Fair Statuses
 *
 * Runs twice daily (midnight and noon UTC) to automatically update
 * fair statuses based on their start/end dates.
 *
 * Status logic (mirrors Fair.calculateStatus()):
 * - now < startDate → "upcoming"
 * - startDate <= now <= endDate → "ongoing"
 * - now > endDate → "past"
 */
exports.updateFairStatuses = onSchedule(
  {
    schedule: '0 0,12 * * *',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('🔄 Running fair status update...');

    try {
      const fairsSnapshot = await db.collection('fairs').get();

      if (fairsSnapshot.empty) {
        console.log('No fairs found.');
        return;
      }

      const now = new Date();
      const batch = db.batch();
      let updatedCount = 0;

      fairsSnapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);

        let correctStatus;
        if (now < startDate) {
          correctStatus = 'upcoming';
        } else if (now >= startDate && now <= endDate) {
          correctStatus = 'ongoing';
        } else {
          correctStatus = 'past';
        }

        if (data.status !== correctStatus) {
          console.log(`📝 Fair "${data.name || doc.id}": ${data.status} → ${correctStatus}`);
          batch.update(doc.ref, {
            status: correctStatus,
            updatedAt: Timestamp.now(),
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Updated ${updatedCount} fair(s).`);
      } else {
        console.log('✅ All fair statuses are already correct.');
      }
    } catch (error) {
      console.error('❌ Error updating fair statuses:', error);
      throw error;
    }
  }
);

/**
 * checkExpiredOffers
 *
 * Runs every 30 minutes. Queries all open offers past their expiresAt deadline
 * and transitions them (and their parent deal) to 'expired' status via batched write.
 *
 * The composite index on collectionGroup('offers') for status + expiresAt was
 * added in Plan 01's firestore.indexes.json.
 */
exports.checkExpiredOffers = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('checkExpiredOffers: running...');

    try {
      const now = Timestamp.now();

      // Query all open offers that have passed their expiry deadline
      const expiredOffersSnap = await db
        .collectionGroup('offers')
        .where('status', '==', OFFER_STATUS.OPEN)
        .where('expiresAt', '<=', now)
        .get();

      if (expiredOffersSnap.empty) {
        console.log('checkExpiredOffers: no expired offers found.');
        return;
      }

      const batch = db.batch();
      const expiredDealIds = new Set();

      expiredOffersSnap.forEach((offerDoc) => {
        const dealId = offerDoc.ref.parent.parent.id;

        // Update offer status to expired
        batch.update(offerDoc.ref, {
          status: OFFER_STATUS.EXPIRED,
          updatedAt: now,
        });

        // Track unique deal IDs that need updating (avoid double-writing)
        expiredDealIds.add(dealId);
      });

      // Update each deal's status to expired
      for (const dealId of expiredDealIds) {
        const dealRef = db.collection('deals').doc(dealId);
        batch.update(dealRef, {
          status: DEAL_STATUS.EXPIRED,
          updatedAt: now,
        });
      }

      await batch.commit();

      console.log(
        `checkExpiredOffers: expired ${expiredOffersSnap.size} offer(s) across ${expiredDealIds.size} deal(s).`
      );
    } catch (error) {
      console.error('checkExpiredOffers: error:', error);
      throw error;
    }
  }
);

/**
 * sendExpiryReminders
 *
 * Runs every 30 minutes alongside checkExpiredOffers logic.
 * Sends reminder notifications at 24h, 4h, and 1h before offer expiry.
 * Uses remindersSet array on offer doc to prevent duplicate reminders.
 * Notifies both the receiver (currentTurnUid) and the sender as an FYI.
 */
exports.sendExpiryReminders = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('sendExpiryReminders: running...');

    try {
      const now = Date.now();

      // Define 3 reminder windows with 30-min buffer (matching schedule interval)
      const reminderWindows = [
        {
          level: '24h',
          minMs: 23 * 60 * 60 * 1000,       // now + 23h
          maxMs: 24.5 * 60 * 60 * 1000,     // now + 24h30m
          label: '24 hours',
        },
        {
          level: '4h',
          minMs: 3.5 * 60 * 60 * 1000,      // now + 3h30m
          maxMs: 4.5 * 60 * 60 * 1000,      // now + 4h30m
          label: '4 hours',
        },
        {
          level: '1h',
          minMs: 30 * 60 * 1000,             // now + 30m
          maxMs: 1.5 * 60 * 60 * 1000,      // now + 1h30m
          label: '1 hour',
        },
      ];

      for (const window of reminderWindows) {
        const minExpiry = Timestamp.fromMillis(now + window.minMs);
        const maxExpiry = Timestamp.fromMillis(now + window.maxMs);

        const offersSnap = await db
          .collectionGroup('offers')
          .where('status', '==', OFFER_STATUS.OPEN)
          .where('expiresAt', '>=', minExpiry)
          .where('expiresAt', '<=', maxExpiry)
          .get();

        if (offersSnap.empty) continue;

        for (const offerDoc of offersSnap.docs) {
          const offer = offerDoc.data();

          // Skip if this reminder level was already sent
          const remindersSet = offer.remindersSet || [];
          if (remindersSet.includes(window.level)) continue;

          const dealId = offerDoc.ref.parent.parent.id;
          const dealDoc = await db.collection('deals').doc(dealId).get();
          if (!dealDoc.exists) continue;
          const deal = dealDoc.data();

          // Mark reminder as sent (arrayUnion prevents race conditions)
          await offerDoc.ref.update({
            remindersSet: FieldValue.arrayUnion(window.level),
          });

          const productName = deal.productName || 'this product';

          // Notify the receiver (the party whose turn it is to respond)
          const receiverUid = deal.currentTurnUid;
          // Also notify the sender (FYI — opposite of currentTurnUid)
          const senderUid = receiverUid === deal.buyerId ? deal.sellerId : deal.buyerId;

          const notifyUids = [receiverUid, senderUid].filter(Boolean);

          for (const notifyUid of notifyUids) {
            const isReceiver = notifyUid === receiverUid;
            const titleText = isReceiver
              ? `Action needed: Offer expiring in ${window.label} on ${productName}`
              : `FYI: Your offer on ${productName} expires in ${window.label}`;
            const bodyText = isReceiver
              ? `The current offer on ${productName} expires in approximately ${window.label}. Take action before it expires.`
              : `Your offer on ${productName} expires in approximately ${window.label}.`;

            // In-app notification
            try {
              await db
                .collection('users')
                .doc(notifyUid)
                .collection('notifications')
                .add({
                  type: 'deal',
                  eventType: 'expiry_reminder',
                  title: titleText,
                  body: bodyText,
                  dealId,
                  dealProductName: productName,
                  reminderLevel: window.level,
                  isRead: false,
                  createdAt: Timestamp.now(),
                  link: `/deals/${dealId}`,
                });
            } catch (err) {
              console.error(`sendExpiryReminders: in-app notification failed for ${notifyUid}:`, err);
            }

            // Email notification
            try {
              const userDoc = await db.collection('users').doc(notifyUid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.email) {
                  const subject = isReceiver
                    ? `Offer expiring in ${window.label} on ${productName}`
                    : `Your offer on ${productName} expires in ${window.label}`;
                  const dealUrl = `${APP_URL}/deals/${dealId}`;
                  const htmlBody = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
                      <div style="background: #0F1B2B; padding: 24px; border-radius: 8px 8px 0 0;">
                        <h1 style="color: #FFD700; margin: 0; font-size: 20px;">CoreTradeGlobal</h1>
                      </div>
                      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6;">${bodyText}</p>
                        <div style="margin-top: 32px;">
                          <a href="${dealUrl}"
                             style="display: inline-block; background: #0F1B2B; color: #FFD700; text-decoration: none;
                                    padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
                            View Deal
                          </a>
                        </div>
                      </div>
                    </div>
                  `;
                  await sendDealEmail(userData.email, subject, htmlBody);
                }
              }
            } catch (err) {
              console.error(`sendExpiryReminders: email failed for ${notifyUid}:`, err);
            }
          }

          console.log(
            `sendExpiryReminders: sent ${window.level} reminder for offer ${offerDoc.id} on deal ${dealId}`
          );
        }
      }

      console.log('sendExpiryReminders: complete.');
    } catch (error) {
      console.error('sendExpiryReminders: error:', error);
      throw error;
    }
  }
);
