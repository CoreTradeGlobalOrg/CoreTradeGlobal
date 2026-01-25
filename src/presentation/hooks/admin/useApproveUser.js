/**
 * useApproveUser Hook
 *
 * Hook for admin to approve users
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { ApproveUserUseCase } from '@/domain/usecases/admin/ApproveUserUseCase';

export function useApproveUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const approveUser = async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const authRepository = container.getAuthRepository();
      const approveUserUseCase = new ApproveUserUseCase(authRepository);
      await approveUserUseCase.execute(userId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    approveUser,
    loading,
    error,
  };
}

export default useApproveUser;
