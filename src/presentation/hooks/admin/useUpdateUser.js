/**
 * useUpdateUser Hook
 *
 * Hook for admin to update user information
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { UpdateUserUseCase } from '@/domain/usecases/admin/UpdateUserUseCase';

export function useUpdateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateUser = async (userId, userData) => {
    setLoading(true);
    setError(null);

    try {
      const authRepository = container.getAuthRepository();
      const updateUserUseCase = new UpdateUserUseCase(authRepository);
      await updateUserUseCase.execute(userId, userData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateUser,
    loading,
    error,
  };
}

export default useUpdateUser;
