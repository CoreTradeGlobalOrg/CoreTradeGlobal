/**
 * Forgot Password Page
 *
 * User enters email to receive password reset link
 * Dark theme with glassmorphism design
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForgotPassword } from '@/presentation/hooks/auth/useForgotPassword';
import { KeyRound, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { sendResetEmail, loading } = useForgotPassword();
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    const success = await sendResetEmail(email);

    if (success) {
      setSent(true);
      toast.success('Password reset email sent! Check your inbox.', {
        duration: 5000,
      });
    } else {
      toast.error('Failed to send reset email. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-[450px] mx-auto">
      <div className="glass-card w-full p-8">
        {/* Icon */}
        <div className="mb-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,215,0,0.05)] rounded-2xl flex items-center justify-center mx-auto border border-[rgba(255,215,0,0.3)]">
            <KeyRound className="w-10 h-10 text-[#FFD700]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          Forgot Password?
        </h1>
        <p className="text-[#A0A0A0] text-center mb-8">
          {sent
            ? "Check your email for the reset link"
            : "No worries! Enter your email and we'll send you reset instructions."
          }
        </p>

        {sent ? (
          /* Success State */
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-[rgba(16,185,129,0.15)] rounded-full flex items-center justify-center mx-auto border border-[rgba(16,185,129,0.3)]">
              <Mail className="w-8 h-8 text-[#34d399]" />
            </div>

            <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
              <p className="text-white font-medium mb-1">Email sent to:</p>
              <p className="text-[#FFD700]">{email}</p>
            </div>

            <p className="text-sm text-[#A0A0A0]">
              Didn't receive the email? Check your spam folder or try again.
            </p>

            <button
              onClick={() => setSent(false)}
              className="text-[#FFD700] hover:text-white transition-colors text-sm font-medium"
            >
              Try a different email
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                autoFocus
                className="form-input-anasyf"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)] text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-[#FFD700] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
