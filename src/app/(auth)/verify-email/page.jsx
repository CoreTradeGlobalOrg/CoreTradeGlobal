/**
 * Email Verification Pending Page
 *
 * Shown after registration - user needs to verify email
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Check if email is already verified
  useEffect(() => {
    if (!loading && user?.emailVerified) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    setSending(true);
    try {
      const authRepo = container.getAuthRepository();
      await authRepo.sendEmailVerification();

      toast.success('Verification email sent! Please check your inbox.');
      setCountdown(60); // 60 seconds cooldown
    } catch (error) {
      toast.error('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      // Refresh user data from Firebase and Firestore
      await refreshUser();

      // Wait for state to fully update
      await new Promise(resolve => setTimeout(resolve, 1500));

      const authRepo = container.getAuthRepository();

      if (authRepo.isEmailVerified()) {
        toast.success('Email verified! Redirecting to dashboard...');
        // Wait a bit more to ensure state is synced before navigation
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push('/');
      } else {
        toast.error('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      console.error('Verification check error:', error);
      toast.error('Failed to check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/register');
    return null;
  }

  return (
    <div className="max-w-md mx-auto text-center">
      {/* Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-10 h-10 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Verify Your Email
      </h1>

      {/* Message */}
      <p className="text-gray-600 mb-6">
        We've sent a verification email to:{' '}
        <span className="font-medium text-gray-900">{user.email}</span>
      </p>

      <p className="text-sm text-gray-500 mb-8">
        Please check your inbox and click the verification link to activate your
        account.
      </p>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleCheckVerification}
          disabled={checking}
          className="w-full"
          variant="primary"
        >
          {checking ? 'Checking...' : "I've Verified My Email"}
        </Button>

        <Button
          onClick={handleResendEmail}
          disabled={sending || countdown > 0}
          className="w-full"
          variant="secondary"
        >
          {sending
            ? 'Sending...'
            : countdown > 0
            ? `Resend Email (${countdown}s)`
            : 'Resend Verification Email'}
        </Button>
      </div>

      {/* Help Text */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-2">Didn't receive the email?</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Check your spam or junk folder</li>
          <li>• Make sure {user.email} is correct</li>
          <li>• Wait a few minutes and try again</li>
        </ul>
      </div>

      {/* Logout */}
      <div className="mt-6">
        <button
          onClick={() => router.push('/login')}
          className="text-sm text-blue-600 hover:underline"
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
