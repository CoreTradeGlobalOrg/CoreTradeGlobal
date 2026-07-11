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
import { HeroSection } from '@/presentation/components/homepage/Hero/HeroSection';
import { FeaturedProducts } from '@/presentation/components/homepage/Products/FeaturedProducts';
import { FeaturedRFQs } from '@/presentation/components/homepage/RFQs/FeaturedRFQs';
import { CategoriesSection } from '@/presentation/components/homepage/Categories/CategoriesSection';
import { CompaniesSection } from '@/presentation/components/homepage/Companies/CompaniesSection';

// Only the *last three* sections are dynamic — they sit well below the
// fold (after ShowcaseSection they're purely scroll-reveal content) so
// splitting them out of the initial bundle shaves ~150 KiB of JS from
// the LCP path. Placeholder min-heights match the CSS reservations so
// the placeholder-to-real swap can't shift the footer during throttled
// Lighthouse loads (showcase's 850px reservation was previously 640,
// which was ~200px shorter than the real content).
const ShowcaseSection = dynamic(
  () => import('@/presentation/components/homepage/Showcase/ShowcaseSection').then((m) => m.ShowcaseSection),
  { loading: () => <section className="showcase-section" style={{ minHeight: 580 }} /> }
);
const FairsSection = dynamic(
  () => import('@/presentation/components/homepage/Fairs/FairsSection').then((m) => m.FairsSection),
  { loading: () => <div className="fairs-wrapper" style={{ minHeight: 585 }} /> }
);
const NewsSection = dynamic(
  () => import('@/presentation/components/homepage/News/NewsSection').then((m) => m.NewsSection),
  { loading: () => <section className="news-section" style={{ minHeight: 620 }} /> }
);

export default function Home() {
  const HERO_FETCH_DATA = true;

  return (
    <div className="homepage">
      {/* Hero Section with 3D Globe */}
      <HeroSection fetchData={HERO_FETCH_DATA} />



      {/* Featured Products */}
      <FeaturedProducts />

      {/* Featured RFQ Requests */}
      <FeaturedRFQs />

      {/* 3D Carousel - Featured Companies Showcase */}
      <ShowcaseSection />

      {/* Companies Section (Grid) */}
      <CompaniesSection />

      {/* Categories Section */}
      <CategoriesSection />

      {/* Upcoming Fairs */}
      <FairsSection />

      {/* News Section */}
      <NewsSection />
    </div>
  );
}
