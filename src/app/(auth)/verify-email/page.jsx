/**
 * Email Verification Pending Page
 *
 * Shown after registration - user needs to verify email
 * Dark theme with glassmorphism design
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { Mail, RefreshCw, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto"></div>
        <p className="mt-4 text-[#A0A0A0]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/register');
    return null;
  }

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <div className="glass-card w-full p-8">
        {/* Icon */}
        <div className="mb-6 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[rgba(59,130,246,0.2)] to-[rgba(59,130,246,0.05)] rounded-2xl flex items-center justify-center mx-auto border border-[rgba(59,130,246,0.3)] relative">
            <Mail className="w-12 h-12 text-[#3b82f6]" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center">
              <span className="text-[#0F1B2B] text-lg font-bold">!</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          Verify Your Email
        </h1>

        {/* Message */}
        <p className="text-[#A0A0A0] text-center mb-2">
          We've sent a verification email to:
        </p>
        <p className="text-[#FFD700] text-center font-semibold mb-6">
          {user.email}
        </p>

        <p className="text-sm text-[#64748b] text-center mb-8">
          Please check your inbox and click the verification link to activate your account.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                I've Verified My Email
              </>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={sending || countdown > 0}
            className="w-full p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white font-semibold rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Resend Email ({countdown}s)
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Resend Verification Email
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)]">
          <p className="text-sm text-[#A0A0A0] text-center mb-3">
            Didn't receive the email?
          </p>
          <ul className="text-xs text-[#64748b] space-y-2 pl-4">
            <li className="list-disc marker:text-[#FFD700]">
              Check your spam or junk folder
            </li>
            <li className="list-disc marker:text-[#FFD700]">
              Make sure <span className="text-white">{user.email}</span> is correct
            </li>
            <li className="list-disc marker:text-[#FFD700]">
              Wait a few minutes and try again
            </li>
          </ul>
        </div>

        {/* Different Email Link */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-[#FFD700] transition-colors"
          >
            Use a different email
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
