/**
 * Social Callback Page
 *
 * URL: /social-callback#token=<customToken>&redirect=<dest>
 *
 * Lands here after the LinkedIn server flow. Reads the Firebase custom token
 * from the URL fragment, signs in, then routes to the destination (completed
 * profile) or /complete-profile (new user). The token is stripped from the URL
 * immediately.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export default function SocialCallbackPage() {
  const router = useRouter();
  const ranRef = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const redirectTo = params.get('redirect') || '/';

    // Strip the token from the URL right away.
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!token) {
      setError(true);
      return;
    }

    (async () => {
      try {
        const authRepo = container.getAuthRepository();
        const user = await authRepo.signInWithCustomToken(token);
        const profile = await authRepo.getUserProfile(user.uid);

        if (profile && profile.profileComplete !== false && profile.isDeleted !== true) {
          router.replace(redirectTo);
        } else {
          router.replace('/complete-profile');
        }
      } catch (err) {
        console.error('[social-callback] sign-in failed:', err);
        toast.error('LinkedIn sign-in failed. Please try again.');
        router.replace('/login');
      }
    })();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#A0A0A0] text-sm">
        {error ? 'Sign-in link is invalid or expired.' : 'Signing you in…'}
      </p>
    </div>
  );
}
