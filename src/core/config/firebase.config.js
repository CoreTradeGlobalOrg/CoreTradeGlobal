/**
 * Firebase Configuration & Initialization
 *
 * We initialize Firebase once and export instances
 *
 * This file replaces the old src/lib/firebase.js
 *
 * Performance: auth & db are eager (needed immediately).
 * storage, functions, and analytics are lazy-loaded on first use via
 * getter/wrapper functions so their SDKs stay out of the initial
 * bundle. Analytics in particular is gated behind cookie consent —
 * for a visitor who hasn't opted in, firebase/analytics never loads.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
 * Firebase Analytics — lazy-loaded
 *
 * Same pattern as storage / functions above: require() inside the
 * accessors so the firebase/analytics SDK only enters the bundle when
 * something actually calls it. AnalyticsContext gates the first call
 * behind cookie consent, so visitors who never opt in never pay for
 * the analytics chunk. logEvent / setUserId / setUserProperties are
 * re-exported as thin sync wrappers to preserve the original API for
 * consumers.
 */
let analyticsInstance = null;
let _analyticsModule = null;
function loadAnalyticsModule() {
  if (!_analyticsModule) {
    _analyticsModule = require('firebase/analytics');
  }
  return _analyticsModule;
}

export const initializeAnalytics = async () => {
  if (typeof window === 'undefined') return null;

  if (analyticsInstance) return analyticsInstance;

  const mod = loadAnalyticsModule();
  const supported = await mod.isSupported();
  if (supported) {
    analyticsInstance = mod.getAnalytics(app);
  }

  return analyticsInstance;
};

export const getAnalyticsInstance = () => analyticsInstance;

export const logEvent = (...args) => loadAnalyticsModule().logEvent(...args);
export const setUserId = (...args) => loadAnalyticsModule().setUserId(...args);
export const setUserProperties = (...args) => loadAnalyticsModule().setUserProperties(...args);

/**
 * Export the app instance for advanced usage
 */
export default app;
