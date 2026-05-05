/**
 * TourLauncher — client component wrapper for About Us page
 *
 * Renders the TourHelpButton FAB and OnboardingTour for authenticated users.
 * Extracted as a client component so the parent server page can keep its
 * metadata export (metadata exports are incompatible with 'use client').
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/presentation/contexts/AuthContext';

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

export function TourLauncher() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  if (!user) return null;

  return (
    <>
      {showTour && (
        <OnboardingTour user={user} onComplete={() => setShowTour(false)} />
      )}
      {!showTour && (
        <TourHelpButton onLaunch={() => setShowTour(true)} />
      )}
    </>
  );
}
