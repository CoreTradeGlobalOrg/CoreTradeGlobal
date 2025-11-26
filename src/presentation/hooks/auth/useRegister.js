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
    console.log('📸 [useRegister] register called with data:', {
      ...registerData,
      companyLogoFile: registerData.companyLogoFile ? {
        name: registerData.companyLogoFile.name,
        type: registerData.companyLogoFile.type,
        size: registerData.companyLogoFile.size,
      } : 'NO_FILE',
    });

    setLoading(true);
    setError(null);

    try {
      // Get repository from DI container
      const authRepository = container.getAuthRepository();

      // Create use case with repository
      const registerUseCase = new RegisterUseCase(authRepository);

      // Execute registration
      const user = await registerUseCase.execute(registerData);

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
