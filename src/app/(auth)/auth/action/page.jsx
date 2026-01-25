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
import { LoadingScreen } from '@/presentation/components/common/LoadingScreen/LoadingScreen';
import toast from 'react-hot-toast';

function ActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
          case 'verifyEmail':
            // Verify email
            await authRepo.verifyEmail(oobCode);
            toast.success('Email verified successfully! You can now login.');
            router.push('/login');
            break;

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
