/**
 * useLogin Hook
 *
 * Custom hook for login functionality
 * Handles login state (loading, error) and calls the LoginUseCase
 * Supports MFA (multi-factor authentication) flow with TOTP
 *
 * Usage in components:
 * const { login, completeMfaLogin, loading, error, mfaRequired } = useLogin()
 */

'use client';

import { useState, useRef } from 'react';
import { container } from '@/core/di/container';
import { LoginUseCase } from '@/domain/usecases/auth/LoginUseCase';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const mfaResolverRef = useRef(null);

  /**
   * Login function
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User data
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    setMfaRequired(false);

    try {
      const authRepository = container.getAuthRepository();
      const loginUseCase = new LoginUseCase(authRepository);
      const user = await loginUseCase.execute(email, password);
      return user;
    } catch (err) {
      if (err.message === 'MFA_REQUIRED' && err.resolver) {
        mfaResolverRef.current = err.resolver;
        setMfaRequired(true);
        setLoading(false);
        return null; // Signal that MFA is needed
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete MFA login with TOTP code
   * @param {string} totpCode - 6-digit code from authenticator app
   * @returns {Promise<Object>} User data
   */
  const completeMfaLogin = async (totpCode) => {
    if (!mfaResolverRef.current) {
      setError('MFA session expired. Please log in again.');
      setMfaRequired(false);
      throw new Error('MFA session expired. Please log in again.');
    }

    setLoading(true);
    setError(null);

    try {
      const authRepository = container.getAuthRepository();
      const user = await authRepository.completeMfaLogin(mfaResolverRef.current, totpCode);
      // Don't reset mfaRequired here — let the caller navigate first to avoid form flash
      // Don't null the resolver here — only null it after navigation succeeds,
      // so the user can retry if handleLoginSuccess fails
      return user;
    } catch (err) {
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid code. Please check your authenticator app.');
      } else {
        setError(err.message || 'MFA verification failed');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with backup code (bypasses MFA)
   * @param {string} email
   * @param {string} backupCode
   * @returns {Promise<Object>} User data with remainingBackupCodes
   */
  const loginWithBackupCode = async (email, backupCode) => {
    setLoading(true);
    setError(null);

    try {
      const authRepository = container.getAuthRepository();
      const user = await authRepository.loginWithBackupCode(email, backupCode);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    login,
    completeMfaLogin,
    loginWithBackupCode,
    clearError,
    loading,
    error,
    mfaRequired,
  };
}

export default useLogin;
