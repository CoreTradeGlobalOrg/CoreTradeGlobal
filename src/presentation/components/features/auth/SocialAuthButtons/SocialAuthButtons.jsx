'use client';

/**
 * SocialAuthButtons
 *
 * Social sign-in/sign-up buttons (one button serves both — OAuth is
 * sign-in-or-sign-up). Phase 1: Google. LinkedIn is added in Phase 2.
 *
 * Props:
 *   redirectTo {string} - where to go after a successful sign-in of a
 *                         completed account (defaults to '/').
 *   label      {string} - divider label (default "or continue with").
 */

import { useGoogleAuth } from '@/presentation/hooks/auth/useGoogleAuth';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export function SocialAuthButtons({ redirectTo, label = 'or continue with' }) {
  const { signInWithGoogle, loading } = useGoogleAuth();

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
        <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">{label}</span>
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={() => signInWithGoogle(redirectTo)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-full bg-white text-[#1f1f1f] font-medium hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {loading ? 'Connecting…' : 'Continue with Google'}
      </button>
    </div>
  );
}

export default SocialAuthButtons;
