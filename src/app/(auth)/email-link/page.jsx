/**
 * Email Link Sign-in Page
 *
 * URL: /email-link?rfq=<requestId>  (guest RFQ confirmation, from createGuestRFQ)
 *      /email-link?next=<path>      (sign-in link from /login-link, sendSignInLink)
 *
 * Completes Firebase email-link sign-in. The email comes from
 * localStorage (same device) or the visitor types it.
 *   - rfq: publishes the pending RFQ (publishGuestRFQ), then offers an
 *     optional "set a password" step so the next sign-in can use a password.
 *   - next: goes straight to that path.
 */

'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink, updatePassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth, getFunctionsInstance } from '@/core/config/firebase.config';
import { revalidatePublicPage } from '@/lib/revalidatePublicPage';

const EMAIL_KEY = 'emailForSignIn';

function safeNext(raw) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function readStoredEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function clearStoredEmail() {
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    // storage kapalı
  }
}

function Card({ icon, title, subtitle, children }) {
  return (
    <div className="w-full max-w-[450px] mx-auto">
      <div className="glass-card w-full p-8">
        <div className="mb-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,215,0,0.05)] rounded-2xl flex items-center justify-center mx-auto border border-[rgba(255,215,0,0.3)]">
            {icon}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-2">{title}</h1>
        {subtitle && <p className="text-[#A0A0A0] text-center mb-8">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

const primaryButton =
  'w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

function EmailLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rfqId = searchParams.get('rfq');
  const next = safeNext(searchParams.get('next'));

  // 'checking' | 'need-email' | 'working' | 'rfq-live' | 'invalid' | 'error'
  const [status, setStatus] = useState('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const startedRef = useRef(false);

  const afterSignIn = useCallback(async () => {
    if (!rfqId) {
      window.location.href = next;
      return;
    }
    await httpsCallable(getFunctionsInstance(), 'publishGuestRFQ')({ requestId: rfqId });
    // A page cached while the RFQ was still pending would show it unpublished
    await revalidatePublicPage('request', rfqId);
    setStatus('rfq-live');
  }, [rfqId, next]);

  const completeSignIn = useCallback(async (emailToUse) => {
    setStatus('working');
    try {
      const href = window.location.href;
      if (isSignInWithEmailLink(auth, href)) {
        await signInWithEmailLink(auth, emailToUse.trim().toLowerCase(), href);
        clearStoredEmail();
        // Tek kullanımlık kodu adres çubuğundan temizle
        const clean = rfqId ? `/email-link?rfq=${encodeURIComponent(rfqId)}` : `/email-link?next=${encodeURIComponent(next)}`;
        window.history.replaceState(null, '', clean);
      }
      await afterSignIn();
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
        setStatus('invalid');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('This email does not match the link. Please use the address the email was sent to.');
        setStatus('need-email');
      } else {
        setErrorMessage(err?.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    }
  }, [afterSignIn, rfqId, next]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) {
      // Link zaten kullanıldıysa ama oturum açıksa (sayfa yenilendi) devam et
      if (auth.currentUser) {
        completeSignIn('');
      } else {
        setStatus('invalid');
      }
      return;
    }
    const stored = readStoredEmail();
    if (stored) {
      setEmail(stored);
      completeSignIn(stored);
    } else {
      setStatus('need-email');
    }
  }, [completeSignIn]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8 || !/[0-9]/.test(password)) {
      toast.error('Password must be at least 8 characters and contain a number.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(auth.currentUser, password);
      toast.success('Password saved. You can sign in with it next time.');
      router.push(`/request/${rfqId}`);
    } catch (err) {
      toast.error(err?.message || 'Could not save your password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (status === 'checking' || status === 'working') {
    return (
      <Card icon={<Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />} title={rfqId ? 'Publishing your RFQ…' : 'Signing you in…'} />
    );
  }

  if (status === 'need-email') {
    return (
      <Card
        icon={<Mail className="w-10 h-10 text-[#FFD700]" />}
        title="Confirm your email"
        subtitle="Enter the email address the link was sent to."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) completeSignIn(email);
          }}
          className="space-y-6"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            autoComplete="email"
            className="form-input-anasyf"
          />
          {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
          <button type="submit" className={primaryButton}>Continue</button>
        </form>
      </Card>
    );
  }

  if (status === 'invalid') {
    return (
      <Card
        icon={<AlertTriangle className="w-10 h-10 text-[#FFD700]" />}
        title="This link has expired"
        subtitle="Sign-in links work once and expire after a while. Request a new one and use it right away."
      >
        <Link
          href={`/login-link${rfqId ? '' : `?redirect=${encodeURIComponent(next)}`}`}
          className={primaryButton}
          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
        >
          Send me a new link
        </Link>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card icon={<AlertTriangle className="w-10 h-10 text-[#FFD700]" />} title="Something went wrong" subtitle={errorMessage}>
        <button type="button" onClick={() => window.location.reload()} className={primaryButton}>Try again</button>
      </Card>
    );
  }

  // status === 'rfq-live'
  return (
    <Card
      icon={<CheckCircle2 className="w-10 h-10 text-[#34d399]" />}
      title="Your RFQ is live"
      subtitle="Suppliers in this category have been notified. We will email you when quotes arrive."
    >
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <p className="text-sm text-white font-semibold">Set a password to sign in next time</p>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="form-input-anasyf pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
          className="form-input-anasyf"
        />
        <p className="text-xs text-[#A0A0A0]">At least 8 characters, including a number.</p>
        <button type="submit" disabled={savingPassword} className={primaryButton}>
          {savingPassword ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : 'Save password'}
        </button>
        <Link href={`/request/${rfqId}`} className="block text-center text-sm text-[#A0A0A0] hover:text-white transition-colors">
          Skip for now, go to my RFQ
        </Link>
      </form>
    </Card>
  );
}

export default function EmailLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
        </div>
      }
    >
      <EmailLinkContent />
    </Suspense>
  );
}
