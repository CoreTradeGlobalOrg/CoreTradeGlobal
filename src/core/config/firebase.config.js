/**
 * Firebase Configuration & Initialization
 *
 * We initialize Firebase once and export instances
 *
 * This file replaces the old src/lib/firebase.js
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Initialize Firebase App
 *
 * We check if app is already initialized to avoid errors
 */
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

/**
 * Firebase Service Instances
 *
 * - auth: Firebase Authentication
 * - db: Firestore Database
 * - storage: Firebase Storage
 * - functions: Cloud Functions
 */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

/**
 * Connect to emulators in development
 * Commented out - using production functions for now
 */
// if (process.env.NODE_ENV === 'development') {
//   // Connect Functions to emulator
//   connectFunctionsEmulator(functions, '127.0.0.1', 5001);
//   console.log('🔧 Connected to Functions Emulator');
// }

/**
 * Export the app instance for advanced usage
 */
export default app;
