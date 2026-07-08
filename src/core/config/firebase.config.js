/**
 * Firebase Configuration & Initialization
 *
 * We initialize Firebase once and export instances
 *
 * This file replaces the old src/lib/firebase.js
 *
 * Performance: auth & db are eager (needed immediately).
 * storage & functions are lazy-loaded on first use via getter functions.
 *
 * NOTE on analytics: an earlier revision tried to lazy-load
 * firebase/analytics via require() (mirroring the storage / functions
 * pattern). Firebase v12 is ESM-only and the require() interop
 * returned an object shape that Firebase's own analytics internals
 * chokes on ("TypeError: e is not a function" in the SDK's own
 * dispatch code). Reverted to static import. Dynamic import()
 * remains a future avenue — the callsites in AnalyticsContext are all
 * fire-and-forget and would tolerate an async logEvent — but that
 * needs a proper preview shakeout before shipping again.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

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
 * Firebase Service Instances (eager)
 *
 * - auth: Firebase Authentication
 * - db: Firestore Database
 */
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Lazy-loaded Firebase Storage
 *
 * Only imports firebase/storage and initializes when first accessed.
 * Reduces initial bundle parse/eval cost on page load.
 */
let _storage = null;
export function getStorageInstance() {
  if (!_storage) {
    const { getStorage } = require('firebase/storage');
    _storage = getStorage(app);
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
      const { connectStorageEmulator } = require('firebase/storage');
      connectStorageEmulator(_storage, '127.0.0.1', 9199);
    }
  }
  return _storage;
}

/**
 * Lazy-loaded Cloud Functions
 *
 * Only imports firebase/functions and initializes when first accessed.
 * Reduces initial bundle parse/eval cost on page load.
 */
let _functions = null;
export function getFunctionsInstance() {
  if (!_functions) {
    const { getFunctions } = require('firebase/functions');
    _functions = getFunctions(app);
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
      const { connectFunctionsEmulator } = require('firebase/functions');
      connectFunctionsEmulator(_functions, '127.0.0.1', 5001);
    }
  }
  return _functions;
}

/**
 * Firebase Analytics
 *
 * Analytics is only initialized client-side when supported.
 * Use initializeAnalytics() to get the analytics instance.
 */
let analyticsInstance = null;

export const initializeAnalytics = async () => {
  if (typeof window === 'undefined') return null;

  if (analyticsInstance) return analyticsInstance;

  const supported = await isSupported();
  if (supported) {
    analyticsInstance = getAnalytics(app);
  }

  return analyticsInstance;
};

export const getAnalyticsInstance = () => analyticsInstance;

export { logEvent, setUserId, setUserProperties };

/**
 * Export the app instance for advanced usage
 */
export default app;
