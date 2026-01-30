/**
 * useBanUser Hook
 *
 * Hook for admin to ban users
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';

export function useBanUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const banUser = async (userId, reason) => {
    setLoading(true);
    setError(null);

    try {
      const banUserFn = httpsCallable(functions, 'banUser');
      const result = await banUserFn({ userId, reason });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to ban user');
      }

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    banUser,
    loading,
    error,
  };
}

export default useBanUser;
