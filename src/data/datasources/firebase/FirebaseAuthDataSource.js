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

import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  updateProfile,
  updateEmail,
  updatePassword,
  reload,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
} from 'firebase/auth';

export class FirebaseAuthDataSource {
  /**
   * Constructor
   * @param {Auth} auth - Firebase Auth instance
   */
  constructor(auth) {
    this.auth = auth;
  }

  /**
   * Sign in with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<User>} Firebase User object
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const mfaError = new Error('MFA_REQUIRED');
        mfaError.code = 'auth/multi-factor-auth-required';
        mfaError.resolver = getMultiFactorResolver(this.auth, error);
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
    const userCredential = await signInWithCustomToken(this.auth, customToken);
    return userCredential.user;
  }

  /**
   * Create new user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<User>} Firebase User object
   */
  async register(email, password) {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return userCredential.user;
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async logout() {
    await signOut(this.auth);
  }

  /**
   * Get currently signed-in user
   * @returns {User|null} Current user or null
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Listen to auth state changes
   * @param {Function} callback - Called when auth state changes
   * @returns {Function} Unsubscribe function
   *
   * Usage:
   * const unsubscribe = authDataSource.onAuthStateChanged((user) => {
   *   // handle user state change
   * })
   * // Later: unsubscribe()
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Send password reset email
   * @param {string} email
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email) {
    await sendPasswordResetEmail(this.auth, email);
  }

  /**
   * Send email verification to current user
   * @returns {Promise<void>}
   */
  async sendEmailVerification() {
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
    await applyActionCode(this.auth, actionCode);
  }

  /**
   * Reload current user to get latest email verification status
   * @returns {Promise<void>}
   */
  async reloadUser() {
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
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }
    await updatePassword(user, newPassword);
  }
}

export default FirebaseAuthDataSource;
