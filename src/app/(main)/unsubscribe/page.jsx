'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = (searchParams.get('email') || '').trim();
  const emailValid = emailParam && EMAIL_RE.test(emailParam);

  // idle | unsubscribing | unsubscribed | resubscribing | resubscribed | error
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!emailValid || hasTriggered.current) return;
    hasTriggered.current = true;

    async function autoUnsubscribe() {
      setStatus('unsubscribing');

      const payload = { email: emailParam };
      for (const key of UTM_KEYS) {
        const value = (searchParams.get(key) || '').trim();
        if (value) payload[key] = value;
      }

      try {
        const res = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setErrorMessage(
            data?.error ||
              (res.status === 429
                ? 'Too many requests. Please try again in a minute.'
                : 'Something went wrong. Please try again.')
          );
          return;
        }

        setStatus('unsubscribed');
      } catch {
        setStatus('error');
        setErrorMessage('Network error. Please check your connection and try again.');
      }
    }

    autoUnsubscribe();
  }, [emailValid, emailParam, searchParams]);

  async function handleResubscribe() {
    setStatus('resubscribing');
    setErrorMessage('');

    try {
      const res = await fetch('/api/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(data?.error || 'Failed to resubscribe. Please try again.');
        return;
      }

      setStatus('resubscribed');
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
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

  if (status === 'idle' || status === 'unsubscribing') {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#FFD700] border-t-transparent" />
        <h1 className="text-2xl font-bold text-white mb-2">Unsubscribing...</h1>
        <p className="text-[#A0A0A0]">
          Removing <span className="text-white font-medium">{emailParam}</span> from our email list.
        </p>
      </div>
    );
  }

  if (status === 'unsubscribed') {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re unsubscribed</h1>
        <p className="text-[#A0A0A0] mb-6">
          We&apos;ve removed <span className="text-white font-medium">{emailParam}</span> from our
          email list.
        </p>
        <button
          onClick={handleResubscribe}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] text-[#A0A0A0] hover:text-white font-medium py-3 transition-colors"
        >
          Changed your mind? Resubscribe
        </button>
      </div>
    );
  }

  if (status === 'resubscribing') {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#FFD700] border-t-transparent" />
        <h1 className="text-2xl font-bold text-white mb-2">Resubscribing...</h1>
      </div>
    );
  }

  if (status === 'resubscribed') {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re resubscribed</h1>
        <p className="text-[#A0A0A0]">
          <span className="text-white font-medium">{emailParam}</span> has been added back to our
          email list.
        </p>
      </div>
    );
  }

  // error state
  return (
    <div className="w-full max-w-md rounded-2xl bg-[#152238] border border-[rgba(255,255,255,0.08)] p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-3xl">
        ✕
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-[#A0A0A0] mb-6">{errorMessage}</p>
      <button
        onClick={() => {
          hasTriggered.current = false;
          setStatus('idle');
        }}
        className="w-full rounded-lg bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] font-semibold py-3 transition-colors"
      >
        Try again
      </button>
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
