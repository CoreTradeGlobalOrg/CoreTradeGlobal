/**
 * useRegister Hook
 *
 * Custom hook for registration functionality
 * Handles registration state and calls the RegisterUseCase
 *
 * Usage in components:
 * const { register, loading, error } = useRegister()
 *
 * const handleSubmit = async (e) => {
 *   e.preventDefault()
 *   await register({ email, password, confirmPassword, displayName, companyName })
 * }
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { RegisterUseCase } from '@/domain/usecases/auth/RegisterUseCase';

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Register function
   * @param {Object} registerData
   * @param {string} registerData.email
   * @param {string} registerData.password
   * @param {string} registerData.confirmPassword
   * @param {string} registerData.displayName
   * @param {string} registerData.companyName
   * @returns {Promise<Object>} Created user
   */
  const register = async (registerData) => {
    setLoading(true);
    setError(null);

    try {
      // Get repository from DI container
      const authRepository = container.getAuthRepository();

      // Create use case with repository
      const registerUseCase = new RegisterUseCase(authRepository);

      // Execute registration
      const user = await registerUseCase.execute(registerData);

      // Admin approval notifications are fanned out by the
      // sendWelcomeOnRegister Cloud Function (onDocumentCreated
      // trigger on users/{uid}) — running the fan-out server-side
      // keeps the client fast and closes the "any user can query the
      // admin list" attack surface that lived here before.

      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    register,
    loading,
    error,
  };
}

export default useRegister;
