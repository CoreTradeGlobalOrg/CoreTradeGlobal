/**
 * Sign-in Link Page
 *
 * URL: /login-link?redirect=<path>
 * Passwordless sign-in: the visitor enters their email and sendSignInLink
 * emails a link to /email-link?next=<redirect>. Meant for accounts that
 * never set a password (guest RFQ accounts) but works for everyone. The
 * reply is the same whether or not the email has an account.
 */

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, Loader2, Mail, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFunctionsInstance } from '@/core/config/firebase.config';

function LoginLinkContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setLoading(true);
    try {
      await httpsCallable(getFunctionsInstance(), 'sendSignInLink')({ email: clean, next: redirect });
      try { localStorage.setItem('emailForSignIn', clean); } catch { /* storage kapalı */ }
      setSent(true);
    } catch (err) {
      toast.error(err?.message || 'Could not send the link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[450px] mx-auto">
      <div className="glass-card w-full p-8">
        <div className="mb-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,215,0,0.05)] rounded-2xl flex items-center justify-center mx-auto border border-[rgba(255,215,0,0.3)]">
            <Link2 className="w-10 h-10 text-[#FFD700]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-2">Sign in with an email link</h1>
        <p className="text-[#A0A0A0] text-center mb-8">
          {sent ? 'Check your email for the sign-in link.' : 'No password needed. We will email you a link that signs you in.'}
        </p>

        {sent ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-[rgba(16,185,129,0.15)] rounded-full flex items-center justify-center mx-auto border border-[rgba(16,185,129,0.3)]">
              <Mail className="w-8 h-8 text-[#34d399]" />
            </div>
            <p className="text-sm text-[#A0A0A0]">
              If an account exists for <span className="text-[#FFD700]">{email.trim()}</span>, a sign-in link is on its way.
              Didn&apos;t get it? Check your spam folder.
            </p>
            <button type="button" onClick={() => setSent(false)} className="text-[#FFD700] hover:text-white transition-colors text-sm font-medium">
              Try a different email
            </button>
          </div>
        ) : (
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
                autoComplete="email"
                className="form-input-anasyf"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</> : 'Email me a sign-in link'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)] text-center">
          <Link
            href={redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
            className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-[#FFD700] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
        </div>
      }
    >
      <LoginLinkContent />
    </Suspense>
  );
}
