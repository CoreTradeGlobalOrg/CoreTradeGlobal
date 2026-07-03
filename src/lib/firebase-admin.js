/**
 * Firebase Admin SDK Configuration
 *
 * Used for server-side Firebase operations like token verification
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check if service account key is available
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ACCOUNT_SERVICE_KEY;

    if (serviceAccountKey) {
      try {
        // Handle env vars with literal \n: strip to parse JSON,
        // then rebuild PEM newlines in private_key
        let cleanedKey = serviceAccountKey;
        try {
          JSON.parse(cleanedKey);
        } catch {
          cleanedKey = cleanedKey.replace(/\\n/g, '');
        }
        const serviceAccount = JSON.parse(cleanedKey);
        if (serviceAccount.private_key && !serviceAccount.private_key.includes('\n')) {
          let pk = serviceAccount.private_key
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '');
          serviceAccount.private_key =
            '-----BEGIN PRIVATE KEY-----\n' +
            pk.match(/.{1,64}/g).join('\n') +
            '\n-----END PRIVATE KEY-----\n';
        }
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
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found. Token verification disabled.');
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

export function getAdminFirestore() {
  getFirebaseAdmin();
  return getFirestore();
}

export async function verifyIdToken(idToken) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    let role = decodedToken.role || null;
    let source = role ? 'claim' : null;

    // Fallback: check Firestore for legacy accounts without custom claims.
    // When we find a role there, promote it to a custom claim so the next
    // token refresh short-circuits this fallback path — the two paths were
    // drifting for admins whose token predated the claim rollout.
    if (!role) {
      try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          role = userDoc.data().role || null;
          if (role) {
            source = 'firestore';
            try {
              await auth.setCustomUserClaims(uid, {
                ...(decodedToken.role ? {} : {}),
                role,
              });
            } catch (claimErr) {
              console.error('verifyIdToken: setCustomUserClaims sync failed:', claimErr);
            }
          }
        }
      } catch (fsError) {
        console.error('Firestore role fallback failed:', fsError);
      }
    }

    console.log(`[verifyIdToken] uid=${uid} role=${role || 'null'} source=${source || 'none'}`);

    return {
      valid: true,
      uid,
      email: decodedToken.email,
      role,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false, error: error.message };
  }
}
