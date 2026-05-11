'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { MessagesWidget } from '@/presentation/components/common/MessagesWidget/MessagesWidget';
import { NotificationPrompt } from '@/presentation/components/common/NotificationPrompt/NotificationPrompt';
import { NotificationListener } from '@/presentation/components/common/NotificationListener/NotificationListener';
import { InstallPrompt } from '@/presentation/components/common/InstallPrompt/InstallPrompt';
import { CookieConsent } from '@/presentation/components/common/CookieConsent/CookieConsent';
import { ScrollToTop } from '@/presentation/components/common/ScrollToTop/ScrollToTop';
import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary';
import { useAuth } from '@/presentation/contexts/AuthContext';
import './homepage.css';

const ProfileCompletionCard = dynamic(
  () =>
    import(
      '@/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard'
    ).then((m) => ({ default: m.ProfileCompletionCard })),
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

export default function MainLayout({ children }) {
  const { user, loading } = useAuth();
  const [showTourManual, setShowTourManual] = useState(false);

  const showTourAuto = !loading && user && !user.onboardingTourCompleted;
  const showTour = showTourAuto || showTourManual;

  return (
    <>
      <ScrollToTop />
      <Navbar />

      {/* Onboarding tour — lives in layout so it persists across page navigation */}
      {showTour && (
        <OnboardingTour
          user={user}
          onComplete={() => setShowTourManual(false)}
        />
      )}

      {/* "?" FAB — relaunch tour anytime */}
      {!loading && user && !showTour && (
        <TourHelpButton onLaunch={() => setShowTourManual(true)} />
      )}

      {/* Profile completion card — fixed top-right, visible on all pages */}
      {!loading && user && (
        <div className="hidden lg:block fixed top-[110px] right-4 z-[999] w-[320px]">
          <ProfileCompletionCard user={user} />
        </div>
      )}

      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <Footer />
      <MessagesWidget />
      <NotificationPrompt />
      <NotificationListener />
      <InstallPrompt />
      <CookieConsent />
    </>
  );
}
