'use client';

/**
 * useGoogleAuth
 *
 * Signs the user in with Google, then routes based on profile state:
 * - profile exists & complete  -> redirectTo (or '/')
 * - no profile / incomplete     -> '/complete-profile'
 *
 * Account linking for an existing same-email account is handled by Firebase
 * when "Link accounts that use the same email" is enabled in the console.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useGoogleAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = useCallback(
    async (redirectTo) => {
      if (loading) return;
      setLoading(true);
      try {
        const authRepo = container.getAuthRepository();
        const user = await authRepo.signInWithGoogle();

        const idToken = await user.getIdToken();
        const sessionRes = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (!sessionRes.ok) {
          throw new Error('Failed to establish session');
        }

        const profile = await authRepo.getUserProfile(user.uid);

        if (profile && profile.profileComplete !== false && profile.isDeleted !== true) {
          router.push(redirectTo || '/');
        } else {
          router.push('/complete-profile');
        }
      } catch (err) {
        const code = err?.code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          // User dismissed the popup — no error toast needed.
        } else if (code === 'auth/account-exists-with-different-credential') {
          toast.error(
            'This email is already registered with a different sign-in method. Please sign in with that method.'
          );
        } else {
          console.error('[useGoogleAuth] sign-in failed:', err);
          toast.error('Google sign-in failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, router]
  );

  return { signInWithGoogle, loading };
}

export default useGoogleAuth;
