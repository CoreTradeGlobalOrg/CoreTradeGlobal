/**
 * Reset Password Page
 *
 * User arrives here from email link
 * They enter new password here
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingScreen } from '@/presentation/components/common/LoadingScreen/LoadingScreen';
import toast from 'react-hot-toast';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/core/config/firebase.config';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!oobCode) {
      toast.error('Invalid reset link');
      router.push('/forgot-password');
    }
  }, [oobCode, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Reset password with Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);

      toast.success('Password reset successful! Please login with your new password.');

      // Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);

      if (error.code === 'auth/invalid-action-code') {
        toast.error('This reset link has expired or already been used.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password.');
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!oobCode) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Icon */}
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
      <p className="text-gray-600 text-center mb-8">
        Enter your new password below
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
            New Password
          </label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum 6 characters
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </Button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push('/login')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
