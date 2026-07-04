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

// Below-the-fold sections are dynamically loaded so their JS + CSS isn't on
// the initial critical path. Lighthouse flagged ~250 KiB of unused JS on
// first paint; dropping these off the main bundle recovers most of it.
// Reserving a min-height on each wrapper keeps CLS at zero while the chunk
// streams in (matches the per-section reservations in homepage.css).
const CategoriesSection = dynamic(
  () => import('@/presentation/components/homepage/Categories/CategoriesSection').then((m) => m.CategoriesSection),
  { loading: () => <section className="categories-section" /> }
);
const StrategicCTA = dynamic(
  () => import('@/presentation/components/homepage/StrategicCTA/StrategicCTA').then((m) => m.StrategicCTA),
  { loading: () => <section className="strategic-cta-v2" /> }
);
const CompaniesSection = dynamic(
  () => import('@/presentation/components/homepage/Companies/CompaniesSection').then((m) => m.CompaniesSection),
  { loading: () => <section className="featured-products-section" /> }
);
const ShowcaseSection = dynamic(
  () => import('@/presentation/components/homepage/Showcase/ShowcaseSection').then((m) => m.ShowcaseSection),
  { loading: () => <section className="showcase-section" /> }
);
const FairsSection = dynamic(
  () => import('@/presentation/components/homepage/Fairs/FairsSection').then((m) => m.FairsSection),
  { loading: () => <div className="fairs-wrapper" /> }
);
const NewsSection = dynamic(
  () => import('@/presentation/components/homepage/News/NewsSection').then((m) => m.NewsSection),
  { loading: () => <section className="news-section" /> }
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
