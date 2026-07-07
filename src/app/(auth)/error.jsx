/**
 * Error boundary for the (auth) route group.
 *
 * Sibling of (main)/error.jsx. Catches uncaught render errors in the
 * auth subtree (login, register, complete-profile, etc.) so a crash
 * shows a small in-page message instead of leaking to Next.js's
 * default global-error handler — the previous behavior for /register
 * under Chrome auto-translate was a raw "Application error" screen
 * that Chrome then translated to Spanish, misreading as a 404.
 *
 * Also: since (auth)/layout now sets translate="no" on the wrapper,
 * this fallback stays in English by default even if the visitor
 * arrived through an auto-translated marketing page.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AuthError({ error, reset }) {
  useEffect(() => {
    // Surface the digest / message to any RUM / console tooling. Real
    // sink to be wired up in the same TODO as WebVitals.
    // eslint-disable-next-line no-console
    console.error('[auth error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-14 h-14 rounded-full border-2 border-[#FFD700] flex items-center justify-center">
        <span className="text-[#FFD700] text-2xl font-bold">!</span>
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
        <p className="text-sm text-gray-300">
          We couldn&apos;t load this page. Try again, or go back to the homepage.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-full bg-[#FFD700] text-[#0F1B2B] font-semibold hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full border border-white/20 text-white hover:bg-white/5 transition-colors"
        >
          Homepage
        </Link>
      </div>
    </div>
  );
}
