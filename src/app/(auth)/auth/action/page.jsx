/**
 * Email Action Handler
 *
 * This page handles all Firebase email actions:
 * - Email verification
 * - Password reset
 * - Email change verification
 *
 * Firebase emails will link here instead of Firebase's default pages
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { LoadingScreen } from '@/presentation/components/common/LoadingScreen/LoadingScreen';
import toast from 'react-hot-toast';

function ActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleAction = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      if (!mode || !oobCode) {
        toast.error('Invalid action link');
        router.push('/login');
        return;
      }

      try {
        const authRepo = container.getAuthRepository();

        switch (mode) {
          case 'verifyEmail': {
            // Flip the flag on the Firebase Auth backend.
            await authRepo.verifyEmail(oobCode);

            // If the visitor is signed in in THIS browser (common case:
            // they registered from the same tab and haven't logged out),
            // `applyActionCode` above updates the server-side flag but
            // leaves the client's cached `auth.currentUser.emailVerified`
            // stale — so admin dashboard keeps seeing them as unverified
            // until they land on /verify-email and press the button.
            //
            // refreshUser() calls reload() on the Firebase user, which
            // then trips AuthContext's mismatch-detection sync path
            // (firebaseUser.emailVerified !== userProfile.emailVerified)
            // and writes `emailVerified: true` to Firestore. Admin sees
            // the update immediately.
            //
            // Different-browser case (link opened in a mail-client
            // browser where nobody's signed in): getCurrentUser() is null,
            // we skip the sync. When the user later logs in on their own
            // device the same AuthContext sync path picks it up on the
            // first onAuthStateChanged fire.
            const signedInUser = authRepo.getCurrentUser();
            if (signedInUser) {
              try {
                await refreshUser();
              } catch (syncErr) {
                console.warn('post-verify sync failed:', syncErr);
              }
            }

            toast.success('Email verified successfully!');
            router.push(signedInUser ? '/' : '/login');
            break;
          }

          case 'resetPassword':
            // Redirect to reset password page with code
            router.push(`/reset-password?oobCode=${oobCode}`);
            break;

          case 'recoverEmail':
            // Handle email recovery
            toast.info('Email recovery is not yet implemented');
            router.push('/login');
            break;

          default:
            toast.error('Unknown action');
            router.push('/login');
        }
      } catch (error) {
        console.error('Action handler error:', error);

        if (error.code === 'auth/invalid-action-code') {
          toast.error('This link has expired or already been used.');
        } else {
          toast.error('Something went wrong. Please try again.');
        }

        router.push('/login');
      } finally {
        setProcessing(false);
      }
    };

    handleAction();
    // `refreshUser` is intentionally excluded — AuthContext returns a new
    // function reference on every render, so including it here would re-fire
    // the handler on every parent re-render and re-consume the (single-use)
    // oobCode from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  if (processing) {
    return <LoadingScreen message="Processing your request..." />;
  }

  return null;
}

export default function ActionPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <ActionHandler />
    </Suspense>
  );
}
