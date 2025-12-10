/**
 * useDeleteAccount Hook
 *
 * Hook for deleting user account using Cloud Function
 * This performs a HARD DELETE - removes user from both Firebase Auth and Firestore
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';

export function useDeleteAccount() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Delete user account (hard delete)
   * @param {string} userId - User ID to delete
   * @returns {Promise<void>}
   */
  const deleteAccount = async (userId) => {
    setLoading(true);
    setError(null);

    try {
      // Call the cloud function
      const deleteUser = httpsCallable(functions, 'deleteUser');
      const result = await deleteUser({ userId });

      console.log('✅ Account deleted:', result.data);
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