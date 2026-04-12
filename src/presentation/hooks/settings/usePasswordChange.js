import { useState } from 'react';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@/core/config/firebase.config';

/**
 * usePasswordChange
 *
 * Handles reauthentication + password update for the Security section.
 * Maps Firebase error codes to user-friendly messages.
 */
export function usePasswordChange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setLoading(false);
      return { success: true };
    } catch (err) {
      let message;
      switch (err.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Current password is incorrect';
          break;
        case 'auth/requires-recent-login':
          message = 'Please log in again to change your password';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later';
          break;
        default:
          message = err.message || 'An error occurred. Please try again';
      }
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  return { changePassword, loading, error };
}
