/**
 * useDeleteAccount Hook
 *
 * Hook for deleting user account using Cloud Function
 * This performs a SOFT DELETE - marks account for deletion with 15-day recovery period
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';

export function useDeleteAccount() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Delete user account (soft delete with 15-day recovery)
   * @param {string} userId - User ID to delete
   * @returns {Promise<Object>} Result with canRecoverUntil date
   */
  const deleteAccount = async (userId) => {
    setLoading(true);
    setError(null);

    try {
      // Call the soft delete cloud function
      const softDeleteUser = httpsCallable(functions, 'softDeleteUser');
      const result = await softDeleteUser({ userId });

      console.log('✅ Account scheduled for deletion:', result.data);
      return result.data;
    } catch (err) {
      console.error('❌ Failed to delete account:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteAccount,
    loading,
    error,
  };
}

export default useDeleteAccount;