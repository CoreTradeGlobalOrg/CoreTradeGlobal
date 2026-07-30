/**
 * Firebase Auth DataSource
 *
 * This class wraps all Firebase Auth operations
 *
 * Why separate this?
 * - Easy to test (mock this class in tests)
 * - Easy to replace (if you switch from Firebase to another auth provider)
 * - Single Responsibility: Only handles Firebase Auth API calls
 */

import { getAuthAsync, getAuthSync } from '@/core/config/firebase.config';

// firebase/auth (~360 KiB minified) is loaded lazily on first use so it
// stays out of the homepage's initial JS graph. Every entrypoint below
// awaits `loadAuthMod()` — the promise is memoised at module scope so
// subsequent calls are free once the chunk has landed.
let _authModulePromise = null;
function loadAuthMod() {
  if (!_authModulePromise) {
    _authModulePromise = import('firebase/auth');
  }
  return _authModulePromise;
}

export class FirebaseAuthDataSource {
  /**
   * Constructor
   * @param {Auth} auth - Firebase Auth instance (the Proxy from
   *   firebase.config — it's kept for backward compat with methods that
   *   still touch `this.auth.currentUser`, but every real firebase/auth
   *   call resolves the real instance via getAuthAsync()).
   */
  constructor(auth) {
    this.auth = auth;
  }

  /**
   * Resolve the real Firebase Auth instance, loading the SDK chunk if
   * it hasn't been fetched yet. All method implementations that need
   * to pass an `auth` argument to a firebase/auth function should use
   * this rather than `this.auth`, because `this.auth` is the lazy
   * Proxy — the SDK's internals want the real object.
   */
  async _resolveAuth() {
    return getAuthSync() || (await getAuthAsync());
  }

  /**
   * Sign in with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<User>} Firebase User object
   */
  async login(email, password) {
    const [{ signInWithEmailAndPassword, getMultiFactorResolver }, auth] =
      await Promise.all([loadAuthMod(), this._resolveAuth()]);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const mfaError = new Error('MFA_REQUIRED');
        mfaError.code = 'auth/multi-factor-auth-required';
        mfaError.resolver = getMultiFactorResolver(auth, error);
        throw mfaError;
      }
      throw error;
    }
  }

  /**
   * Complete MFA sign-in with TOTP code
   * @param {MultiFactorResolver} resolver - MFA resolver from login attempt
   * @param {string} totpCode - 6-digit TOTP code from authenticator app
   * @returns {Promise<User>} Firebase User object
   */
  async completeMfaSignIn(resolver, totpCode) {
    const { TotpMultiFactorGenerator } = await loadAuthMod();
    const totpHint = resolver.hints.find((h) => h.factorId === 'totp');
    if (!totpHint) throw new Error('No TOTP factor found');
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, totpCode);
    const userCredential = await resolver.resolveSignIn(assertion);
    return userCredential.user;
  }

  /**
   * Sign in with a custom token (used for backup code login)
   * @param {string} customToken - Custom token from server
   * @returns {Promise<User>} Firebase User object
   */
  async loginWithCustomToken(customToken) {
    const [{ signInWithCustomToken }, auth] = await Promise.all([loadAuthMod(), this._resolveAuth()]);
    const userCredential = await signInWithCustomToken(auth, customToken);
    return userCredential.user;
  }

  /**
   * Create new user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<User>} Firebase User object
   */
  async register(email, password) {
    const [{ createUserWithEmailAndPassword }, auth] = await Promise.all([
      loadAuthMod(),
      this._resolveAuth(),
    ]);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  /**
   * Sign in with Google via popup.
   * Account linking for an existing same-email account is handled by Firebase
   * when the "Link accounts that use the same email" setting is enabled.
   * @returns {Promise<User>} Firebase User object
   */
  async signInWithGoogle() {
    const [{ GoogleAuthProvider, signInWithPopup }, auth] = await Promise.all([
      loadAuthMod(),
      this._resolveAuth(),
    ]);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  }

  /**
   * Link a Google account to the currently signed-in user.
   * @returns {Promise<User>} The updated current user.
   */
  async linkGoogle() {
    const [{ GoogleAuthProvider, linkWithPopup }, auth] = await Promise.all([
      loadAuthMod(),
      this._resolveAuth(),
    ]);
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user to link.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await linkWithPopup(user, provider);
    return result.user;
  }

  /**
   * Unlink a provider (e.g. 'google.com') from the current user.
   * @param {string} providerId
   * @returns {Promise<User>}
   */
  async unlinkProvider(providerId) {
    const [{ unlink }, auth] = await Promise.all([loadAuthMod(), this._resolveAuth()]);
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user.');
    return unlink(user, providerId);
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async logout() {
    const [{ signOut }, auth] = await Promise.all([loadAuthMod(), this._resolveAuth()]);
    await signOut(auth);
  }

  /**
   * Get currently signed-in user.
   *
   * SYNC accessor for callsites that expect immediate return. If auth
   * hasn't been resolved yet (fresh page, no AuthProvider mount) this
   * returns null — same shape as "no user signed in" — which is the
   * safe default. AuthContext's onAuthStateChanged will fire once the
   * SDK actually lands and update state anyway.
   *
   * @returns {User|null} Current user or null
   */
  getCurrentUser() {
    const auth = getAuthSync();
    return auth ? auth.currentUser : null;
  }

  /**
   * Listen to auth state changes.
   *
   * Returns a synchronous unsubscribe function even though the real
   * onAuthStateChanged subscription is async (waits for firebase/auth
   * chunk to load). If the caller unsubscribes before the SDK lands,
   * we set `cancelled` so the eventual real unsub is called from the
   * .then() below.
   *
   * @param {Function} callback - Called when auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    let realUnsub = null;
    let cancelled = false;
    (async () => {
      const [{ onAuthStateChanged }, auth] = await Promise.all([
        loadAuthMod(),
        this._resolveAuth(),
      ]);
      if (cancelled) return;
      realUnsub = onAuthStateChanged(auth, callback);
    })();
    return () => {
      cancelled = true;
      if (realUnsub) realUnsub();
    };
  }

  /**
   * Send password reset email
   * @param {string} email
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email) {
    const [{ sendPasswordResetEmail }, auth] = await Promise.all([
      loadAuthMod(),
      this._resolveAuth(),
    ]);
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Send email verification to current user
   * @returns {Promise<void>}
   */
  async sendEmailVerification() {
    const { sendEmailVerification } = await loadAuthMod();
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }
    await sendEmailVerification(user);
  }

  /**
   * Verify email with action code
   * @param {string} actionCode - Code from verification email
   * @returns {Promise<void>}
   */
  async verifyEmail(actionCode) {
    const [{ applyActionCode }, auth] = await Promise.all([loadAuthMod(), this._resolveAuth()]);
    await applyActionCode(auth, actionCode);
  }

  /**
   * Reload current user to get latest email verification status
   * @returns {Promise<void>}
   */
  async reloadUser() {
    const { reload } = await loadAuthMod();
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }
    await reload(user);
  }

  /**
   * Check if current user's email is verified
   * @returns {boolean}
   */
  isEmailVerified() {
    const user = this.getCurrentUser();
    return user?.emailVerified || false;
  }

  /**
   * Update user profile (displayName, photoURL)
   * @param {Object} profile - { displayName, photoURL }
   * @returns {Promise<void>}
   */
  async updateProfile(profile) {
    const { updateProfile } = await loadAuthMod();
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }
    await updateProfile(user, profile);
  }

  /**
   * Update user email
   * @param {string} newEmail
   * @returns {Promise<void>}
   */
  async updateEmail(newEmail) {
    const { updateEmail } = await loadAuthMod();
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }
    await updateEmail(user, newEmail);
  }

  /**
   * Update user password
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async updatePassword(newPassword) {
    const { updatePassword } = await loadAuthMod();
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }
    await updatePassword(user, newPassword);
  }
}

export default FirebaseAuthDataSource;
