/**
 * useDeleteUser Hook
 *
 * Hook for admin to delete users
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { DeleteUserUseCase } from '@/domain/usecases/admin/DeleteUserUseCase';

export function useDeleteUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteUser = async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const authRepository = container.getAuthRepository();
      const deleteUserUseCase = new DeleteUserUseCase(authRepository);
      await deleteUserUseCase.execute(userId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteUser,
    loading,
    error,
  };
}

export default useDeleteUser;
