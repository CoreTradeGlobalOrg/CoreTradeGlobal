'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = (searchParams.get('email') || '').trim();

  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState('');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValid = emailParam && EMAIL_RE.test(emailParam);

  async function handleConfirm(e) {
    e.preventDefault();
    if (!emailValid || status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(
          data?.error ||
            (res.status === 429
              ? 'Too many requests. Please try again in a minute.'
              : 'Something went wrong. Please try again.')
        );
        return;
      }

      setConfirmedEmail(data?.email || emailParam);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re unsubscribed</h1>
        <p className="text-[#A0A0A0] mb-1">
          We&apos;ve removed <span className="text-white font-medium">{confirmedEmail}</span> from our
          cold email list.
        </p>
        <p className="text-xs text-[#A0A0A0] mt-4">
          You may still receive transactional emails related to your account.
        </p>
      </div>
    );
  }

  if (!emailValid) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid unsubscribe link</h1>
        <p className="text-[#A0A0A0]">
          This link is missing or has an invalid email address. Please use the unsubscribe link from
          the email you received.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8">
      <h1 className="text-2xl font-bold text-white mb-2 text-center">Unsubscribe</h1>
      <p className="text-[#A0A0A0] text-center mb-6">
        Confirm that you want to stop receiving cold emails from Core Trade Global.
      </p>

      <form onSubmit={handleConfirm} className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] mb-2">
            Email address
          </label>
          <div className="w-full rounded-lg bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] px-4 py-3 text-white break-all">
            {emailParam}
          </div>
        </div>

        {status === 'error' && errorMessage && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-[#FFD700] hover:bg-[#B59325] disabled:opacity-60 disabled:cursor-not-allowed text-[#0F1B2B] font-semibold py-3 transition-colors"
        >
          {status === 'submitting' ? 'Unsubscribing…' : 'Confirm unsubscribe'}
        </button>
      </form>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center text-[#A0A0A0]">
          Loading…
        </div>
      }
    >
      <UnsubscribeForm />
    </Suspense>
  );
}
