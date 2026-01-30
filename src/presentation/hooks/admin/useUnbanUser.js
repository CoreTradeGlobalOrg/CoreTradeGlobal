/**
 * useUnbanUser Hook
 *
 * Hook for admin to unban/restore users
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';

export function useUnbanUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const unbanUser = async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const unbanUserFn = httpsCallable(functions, 'unbanUser');
      const result = await unbanUserFn({ userId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to unban user');
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
    unbanUser,
    loading,
    error,
  };
}

export default useUnbanUser;
