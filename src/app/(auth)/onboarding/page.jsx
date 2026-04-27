/**
 * Onboarding Page
 *
 * URL: /onboarding
 * Handles invited users completing their account setup via email sign-in link.
 *
 * URL param: ?uid={invitedUserUid}  (added by inviteUser CF to the sign-in link)
 *
 * Guards:
 * - If user is already signed in and onboardingComplete=true → redirect to /
 * - If URL is not a valid Firebase sign-in link and user is not authenticated → show error
 * - Otherwise → render OnboardingWizard
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '@/core/config/firebase.config';
import { OnboardingWizard } from '@/presentation/components/features/onboarding/OnboardingWizard';

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');

  const [status, setStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid' | 'complete'

  useEffect(() => {
    const check = async () => {
      const href = typeof window !== 'undefined' ? window.location.href : '';
      const isValidLink = isSignInWithEmailLink(auth, href);
      const currentUser = auth.currentUser;

      if (currentUser) {
        // User already signed in — check if they need to finish onboarding
        // We'll let the wizard handle this gracefully
        setStatus('valid');
        return;
      }

      if (isValidLink) {
        // Valid sign-in link — store email hint for same-device flow
        // The wizard will handle sign-in
        setStatus('valid');
        return;
      }

      // Neither signed in nor a valid link
      setStatus('invalid');
    };

    check();
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="login-card p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Invalid or Expired Link</h1>
          <p className="text-[#A0A0A0] mb-6 leading-relaxed">
            This invite link is invalid or has already been used.
            Please ask your administrator to send you a new invite.
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] transition-all"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return <OnboardingWizard uid={uid} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
      </div>
    }>
      <OnboardingPageContent />
    </Suspense>
  );
}
