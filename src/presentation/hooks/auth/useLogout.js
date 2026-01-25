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
import { useRouter } from 'next/navigation';
import { container } from '@/core/di/container';
import { LogoutUseCase } from '@/domain/usecases/auth/LogoutUseCase';

export function useLogout() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

      // Execute logout
      await logoutUseCase.execute();

      // Redirect to login page
      router.push('/login');
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
