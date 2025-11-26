/**
 * useLogin Hook
 *
 * Custom hook for login functionality
 * Handles login state (loading, error) and calls the LoginUseCase
 *
 * Usage in components:
 * const { login, loading, error } = useLogin()
 *
 * const handleSubmit = async (e) => {
 *   e.preventDefault()
 *   await login(email, password)
 * }
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { LoginUseCase } from '@/domain/usecases/auth/LoginUseCase';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Login function
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User data
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Get repository from DI container
      const authRepository = container.getAuthRepository();

      // Create use case with repository
      const loginUseCase = new LoginUseCase(authRepository);

      // Execute login
      const user = await loginUseCase.execute(email, password);

      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
    error,
  };
}

export default useLogin;
