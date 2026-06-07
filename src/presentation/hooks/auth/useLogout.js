/**
 * useLogout Hook
 *
 * Custom hook for logout functionality
 *
 * Usage in components:
 * const { logout, loading } = useLogout()
 *
 * <button onClick={logout}>Logout</button>
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { LogoutUseCase } from '@/domain/usecases/auth/LogoutUseCase';

export function useLogout() {
  const [loading, setLoading] = useState(false);

  /**
   * Logout function
   * @returns {Promise<void>}
   */
  const logout = async () => {
    setLoading(true);

    try {
      // Get repository from DI container
      const authRepository = container.getAuthRepository();

      // Create use case with repository
      const logoutUseCase = new LogoutUseCase(authRepository);

      // Execute logout — caller handles redirect
      await logoutUseCase.execute();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    logout,
    loading,
  };
}

export default useLogout;
