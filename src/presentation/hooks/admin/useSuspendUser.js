/**
 * useSuspendUser Hook
 *
 * Hook for admin to suspend/unsuspend users
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { SuspendUserUseCase } from '@/domain/usecases/admin/SuspendUserUseCase';

export function useSuspendUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const suspendUser = async (userId, suspend = true) => {
    setLoading(true);
    setError(null);

    try {
      const authRepository = container.getAuthRepository();
      const suspendUserUseCase = new SuspendUserUseCase(authRepository);
      await suspendUserUseCase.execute(userId, suspend);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    suspendUser,
    loading,
    error,
  };
}

export default useSuspendUser;
