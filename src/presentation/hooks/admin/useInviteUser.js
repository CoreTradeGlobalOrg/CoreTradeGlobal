/**
 * useInviteUser Hook
 *
 * Calls the inviteUser Cloud Function to create an invited user with a specific role.
 * The Cloud Function creates the Auth user, sets custom claims, creates user/invite docs,
 * and sends the sign-in link email.
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

export function useInviteUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inviteUser = async ({ email, role, name, company }) => {
    setLoading(true);
    setError(null);

    try {
      const inviteUserFn = httpsCallable(functions, 'inviteUser');
      const result = await inviteUserFn({ email, role, name, company });

      toast.success(`Invite sent to ${email}`);

      return result.data;
    } catch (err) {
      const message = err?.message || 'Failed to send invite';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { inviteUser, loading, error };
}

export default useInviteUser;
