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
 * NOTE on analytics: lazy-loaded via dynamic import(). An earlier
 * revision tried require() (mirroring the storage / functions
 * pattern) and hit an ESM interop bug — Firebase v12 is ESM-only
 * and the require() interop returned an object shape that Firebase's
 * own analytics internals choked on ("TypeError: e is not a function"
 * in the SDK's own dispatch code). Dynamic import() preserves the ESM
 * namespace and works. The callsites in AnalyticsContext are all
 * fire-and-forget so the async cost is invisible; the win is ~100 KiB
 * of firebase/analytics code that no longer lands in the root bundle.
 */

import { initializeApp, getApps } from 'firebase/app';
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
 * Firebase Service Instances
 *
 * - auth: LAZY — firebase/auth (~360 KiB minified) is loaded on first
 *   access, not at module-eval time. See the `auth` proxy below.
 * - db:   EAGER — Firestore is on the homepage LCP path (featured
 *   products / RFQs / companies queries). Keeping it eager avoids an
 *   extra chunk fetch on the very first Firestore call.
 */
export const db = getFirestore(app);

/**
 * Lazy Firebase Auth.
 *
 * Root layout mounts AuthProvider on every route (including the
 * unauthenticated homepage), which used to pull `getAuth` and the whole
 * `firebase/auth` SDK into the homepage's initial JS bundle — ~360 KiB
 * minified sitting on the LCP critical path even though 99% of homepage
 * visitors never trigger a sign-in flow.
 *
 * Fix:
 *  - `import('firebase/auth')` is dynamic and memoised in
 *    `_authModulePromise` so it runs at most once per session.
 *  - `getAuthAsync()` is the awaitable form and the only path that
 *    guarantees `firebase/auth` is loaded before it returns.
 *  - `auth` is exported as a Proxy so the ~10 callsites that read
 *    `auth.currentUser` / `auth.app` / etc. keep working WITHOUT change.
 *    First read on a still-cold module triggers the async load and
 *    returns undefined for that one call. Every callsite is inside a
 *    click / effect that fires after AuthProvider has already resolved
 *    the promise, so the undefined branch is essentially unreachable
 *    at runtime.
 *
 * If you need a hard guarantee that auth is ready (e.g., a hard-refresh
 * landing directly on /reset-password), `await getAuthAsync()` first.
 */
let _authInstance = null;
let _authModulePromise = null;

function loadAuthModule() {
  if (!_authModulePromise) {
    _authModulePromise = import('firebase/auth');
  }
  return _authModulePromise;
}

export async function getAuthAsync() {
  if (_authInstance) return _authInstance;
  const mod = await loadAuthModule();
  if (!_authInstance) {
    _authInstance = mod.getAuth(app);
  }
  return _authInstance;
}

export function getAuthSync() {
  return _authInstance;
}

export const auth = new Proxy(
  { __isLazyFirebaseAuthProxy: true },
  {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => '[LazyAuth]';
      if (prop === 'then') return undefined; // avoid being treated as thenable
      if (!_authInstance) {
        // Fire the load but don't block — this call returns undefined.
        // Any caller that lands here is either (a) racing hydration on
        // an auth-only page hard refresh, or (b) reading the proxy
        // before AuthProvider mounts, both of which fix themselves on
        // the next tick / re-render.
        loadAuthModule().then((mod) => {
          if (!_authInstance) _authInstance = mod.getAuth(app);
        });
        return undefined;
      }
      const value = _authInstance[prop];
      return typeof value === 'function' ? value.bind(_authInstance) : value;
    },
  }
);

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
 * Firebase Analytics (lazy)
 *
 * Analytics is only initialized client-side after consent and only if the
 * environment supports it. The firebase/analytics module (~100 KiB) is
 * pulled in via dynamic import() so it never sits on the root bundle's
 * critical path. logAnalyticsEvent / setAnalyticsUserId /
 * setAnalyticsUserProperties are async wrappers that no-op silently until
 * initializeAnalytics() has resolved — callsites are all fire-and-forget.
 */
let analyticsInstance = null;
let analyticsModulePromise = null;

const loadAnalyticsModule = () => {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('firebase/analytics');
  }
  return analyticsModulePromise;
};

export const initializeAnalytics = async () => {
  if (typeof window === 'undefined') return null;

  if (analyticsInstance) return analyticsInstance;

  const mod = await loadAnalyticsModule();
  const supported = await mod.isSupported();
  if (supported) {
    analyticsInstance = mod.getAnalytics(app);
  }

  return analyticsInstance;
};

export const getAnalyticsInstance = () => analyticsInstance;

// Async fire-and-forget wrappers. If the analytics module hasn't finished
// loading yet (or consent was never granted), the call is dropped rather
// than queued — the event stream is best-effort telemetry, not a business
// contract, so we don't burn memory buffering pre-consent events.
export const logAnalyticsEvent = async (analytics, eventName, params) => {
  if (!analytics) return;
  const mod = await loadAnalyticsModule();
  mod.logEvent(analytics, eventName, params);
};

export const setAnalyticsUserId = async (analytics, userId) => {
  if (!analytics) return;
  const mod = await loadAnalyticsModule();
  mod.setUserId(analytics, userId);
};

export const setAnalyticsUserProperties = async (analytics, properties) => {
  if (!analytics) return;
  const mod = await loadAnalyticsModule();
  mod.setUserProperties(analytics, properties);
};

/**
 * Export the app instance for advanced usage
 */
export default app;
