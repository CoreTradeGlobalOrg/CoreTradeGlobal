/**
 * Firebase Admin SDK Configuration
 *
 * Used for server-side Firebase operations like token verification
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp;

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check if service account key is available
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch (error) {
        console.error('Failed to parse service account key:', error);
        // Initialize without credentials (limited functionality)
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      // Initialize without credentials (for development)
      // WARNING: Token verification will not work without service account
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found. Token verification disabled.');
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }

  return adminApp || getApps()[0];
}

export function getAdminAuth() {
  getFirebaseAdmin();
  return getAuth();
}

export async function verifyIdToken(idToken) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return { valid: true, uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false, error: error.message };
  }
}
