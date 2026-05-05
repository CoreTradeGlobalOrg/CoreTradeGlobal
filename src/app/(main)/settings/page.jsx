/**
 * Settings Page Route
 *
 * URL: /settings
 * Protected route - requires authentication (see middleware.js)
 * Thin shell with Suspense boundary wrapping the main SettingsPage component
 */

'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/presentation/contexts/AuthContext';

const SettingsPage = dynamic(
  () =>
    import(
      '@/presentation/components/features/settings/SettingsPage/SettingsPage'
    ).then((mod) => mod.SettingsPage),
  { ssr: false }
);

const OnboardingTour = dynamic(
  () =>
    import(
      '@/presentation/components/features/onboarding/OnboardingTour/OnboardingTour'
    ).then((m) => ({ default: m.OnboardingTour })),
  { ssr: false }
);

const TourHelpButton = dynamic(
  () =>
    import(
      '@/presentation/components/features/onboarding/OnboardingTour/OnboardingTour'
    ).then((m) => ({ default: m.TourHelpButton })),
  { ssr: false }
);

function SettingsLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#A0A0A0] text-sm">Loading...</span>
      </div>
    </div>
  );
}

function SettingsPageContent() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  return (
    <>
      {/* "?" FAB + tour for authenticated users */}
      {user && showTour && (
        <OnboardingTour user={user} onComplete={() => setShowTour(false)} />
      )}
      {user && !showTour && (
        <TourHelpButton onLaunch={() => setShowTour(true)} />
      )}

      <Suspense fallback={<SettingsLoadingFallback />}>
        <SettingsPage />
      </Suspense>
    </>
  );
}

export default SettingsPageContent;
