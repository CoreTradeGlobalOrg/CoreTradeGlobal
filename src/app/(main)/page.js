/**
 * Homepage
 *
 * Public landing page for CoreTradeGlobal
 * Dark themed with 3D globe, featured products/RFQs, and more
 * Matches design exactly from main_screen/index.html
 *
 * Also serves as the first-login landing point for authenticated users.
 * Renders the OnboardingTour overlay for users who haven't completed it yet.
 */

'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { HeroSection } from '@/presentation/components/homepage/Hero/HeroSection';
import { FeaturedProducts } from '@/presentation/components/homepage/Products/FeaturedProducts';
import { FeaturedRFQs } from '@/presentation/components/homepage/RFQs/FeaturedRFQs';
import { CategoriesSection } from '@/presentation/components/homepage/Categories/CategoriesSection';
import { StrategicCTA } from '@/presentation/components/homepage/StrategicCTA/StrategicCTA';
import { CompaniesSection } from '@/presentation/components/homepage/Companies/CompaniesSection';
import { ShowcaseSection } from '@/presentation/components/homepage/Showcase/ShowcaseSection';
import { FairsSection } from '@/presentation/components/homepage/Fairs/FairsSection';
import { NewsSection } from '@/presentation/components/homepage/News/NewsSection';

// Loaded client-side only — uses DOM APIs (createPortal, getBoundingClientRect)
const OnboardingTour = dynamic(
  () =>
    import(
      '@/presentation/components/features/onboarding/OnboardingTour/OnboardingTour'
    ).then((m) => ({ default: m.OnboardingTour })),
  { ssr: false }
);

export default function Home() {
  const { user, loading } = useAuth();

  // Toggle this to test performance:
  // false = fast (no API calls in hero)
  // true = slow (4 extra API calls in hero)
  const HERO_FETCH_DATA = true;

  // Show the tour when: auth resolved, user is logged in, and flag is not set
  const showTour = !loading && user && !user.onboardingTourCompleted;

  return (
    <div className="homepage">
      {/* Onboarding tour overlay for first-time users */}
      {showTour && (
        <OnboardingTour
          user={user}
          onComplete={() => {
            // Tour completion updates Firestore; auth listener will refresh user doc
            // and the flag will be set — no local state needed
          }}
        />
      )}

      {/* Hero Section with 3D Globe */}
      <HeroSection fetchData={HERO_FETCH_DATA} />

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Featured RFQ Requests */}
      <FeaturedRFQs />

      {/* Categories Section */}
      <CategoriesSection />

      {/* Strategic CTA (for non-authenticated users) */}
      <StrategicCTA />

      {/* Companies Section (Grid) */}
      <CompaniesSection />

      {/* 3D Carousel - Featured Companies Showcase */}
      <ShowcaseSection />

      {/* Upcoming Fairs */}
      <FairsSection />

      {/* News Section */}
      <NewsSection />
    </div>
  );
}
