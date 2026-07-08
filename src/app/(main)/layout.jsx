'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const { user, loading, profileLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showTourManual, setShowTourManual] = useState(false);
  const [tourDismissed, setTourDismissed] = useState(false);

  // OAuth users without a completed profile must finish onboarding before using
  // the app (role is required). Send them to /complete-profile.
  useEffect(() => {
    if (loading || profileLoading) return;
    if (user && user.profileComplete === false && pathname !== '/complete-profile') {
      router.replace('/complete-profile');
    }
  }, [user, loading, profileLoading, pathname, router]);

  // Wait for profile to load before auto-starting tour — basic user doesn't have onboardingTourCompleted
  const showTourAuto = !loading && !profileLoading && user && !user.onboardingTourCompleted && !tourDismissed;
  const showTour = showTourAuto || showTourManual;

  return (
    <>
      <ScrollToTop />
      <Navbar />

      {/* Onboarding tour — lives in layout so it persists across page navigation */}
      {showTour && (
        <OnboardingTour
          user={user}
          onComplete={() => {
            setShowTourManual(false);
            setTourDismissed(true);
          }}
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

      {/* Content reservation to keep the footer out of the initial
          viewport across all (main) routes.

          Homepage uses .main-content-reservation (6500 px, matches the
          .homepage tall content) because React 19 streams (main)/page
          via a BAILOUT_TO_CLIENT_SIDE_RENDERING placeholder — server
          HTML ships an empty <div hidden> here and stashes real content
          in <div hidden id="S:0"> at the bottom of <body>. Without the
          reservation the footer paints at y≈396 and only jumps to
          y≈6510 after client hydration, worth ~0.40 CLS.

          Non-homepage routes reserve exactly 100vh (min-h-screen). Every
          (main) page currently gates its real UI behind a useAuth
          loading spinner (~200 px tall). Before this fix the wrapper
          matched the spinner's tiny height, footer landed inside the
          viewport, and the swap to a real ~2000-3000 px form shoved
          it out — Speed Insights was seeing CLS 0.36 on /profile,
          0.4 on /join, and a 0.96 outlier on /product/new. min-h-screen
          keeps the wrapper >= viewport height during loading, so the
          footer sits just below the fold from paint one; when content
          later grows past 100vh, the footer travels down BELOW the
          viewport (invisible shift, zero CLS contribution). Real
          content stretches the wrapper naturally beyond the min. */}
      <div className={pathname === '/' ? 'main-content-reservation' : 'min-h-screen'}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
      <Footer />
      <MessagesWidget />
      <NotificationPrompt />
      <NotificationListener />
      <InstallPrompt />
      <CookieConsent />
    </>
  );
}
