/**
 * useResendInvite Hook
 *
 * Re-calls the inviteUser Cloud Function for an existing invite.
 * The CF handles email-already-exists by skipping user creation
 * and regenerating the sign-in link and updating the invite doc.
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

export function useResendInvite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Resend an invite by re-calling inviteUser CF with the same data.
   * @param {{ email: string, role: string, name: string, company: string }} invite
   */
  const resendInvite = async ({ email, role, name, company }) => {
    setLoading(true);
    setError(null);

    try {
      const resendInviteFn = httpsCallable(getFunctionsInstance(), 'resendInvite');
      const result = await resendInviteFn({ email, role, name, company });

      toast.success(`Invite resent to ${email}`);

      return result.data;
    } catch (err) {
      const message = err?.message || 'Failed to resend invite';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { resendInvite, loading, error };
}

export default useResendInvite;
