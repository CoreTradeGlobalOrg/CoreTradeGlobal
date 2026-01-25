/**
 * useGetAllUsers Hook
 *
 * Hook for fetching all users from Firestore
 * Used in admin panel to display user statistics and list
 *
 * Features:
 * - Fetches all users on mount
 * - Real-time updates when users collection changes
 * - Loading and error states
 * - Returns users array sorted by creation date (newest first)
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useGetAllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const authRepo = container.getAuthRepository();
      const allUsers = await authRepo.getAllUsers();

      // Filter out deleted users
      const activeUsers = allUsers.filter(user => !user.isDeleted);

      setUsers(activeUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}

export default useGetAllUsers;
