/**
 * useSoftDeleteAccount Hook
 *
 * Hook for users to soft-delete their own account
 * Account can be recovered within 15 days
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';

export function useSoftDeleteAccount() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const softDeleteAccount = async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const softDeleteUserFn = httpsCallable(functions, 'softDeleteUser');
      const result = await softDeleteUserFn({ userId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to delete account');
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
    softDeleteAccount,
    loading,
    error,
  };
}

export default useSoftDeleteAccount;
