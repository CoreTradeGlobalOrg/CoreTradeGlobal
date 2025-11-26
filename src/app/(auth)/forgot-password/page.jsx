/**
 * Forgot Password Page
 *
 * User enters email to receive password reset link
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForgotPassword } from '@/presentation/hooks/auth/useForgotPassword';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { sendResetEmail, loading } = useForgotPassword();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    const success = await sendResetEmail(email);

    if (success) {
      toast.success('Password reset email sent! Check your inbox.', {
        duration: 5000,
      });
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      toast.error('Failed to send reset email. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Icon */}
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-2">Forgot Password?</h1>
      <p className="text-gray-600 text-center mb-8">
        No worries! Enter your email and we'll send you reset instructions.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Reset Link'}
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
