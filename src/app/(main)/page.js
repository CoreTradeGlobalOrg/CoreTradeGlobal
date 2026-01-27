/**
 * Homepage
 *
 * Public landing page for CoreTradeGlobal
 * Dark themed with 3D globe, featured products/RFQs, and more
 * Matches design exactly from main_screen/index.html
 */

'use client';

import { HeroSection } from '@/presentation/components/homepage/Hero/HeroSection';
import { FeaturedProducts } from '@/presentation/components/homepage/Products/FeaturedProducts';
import { FeaturedRFQs } from '@/presentation/components/homepage/RFQs/FeaturedRFQs';
import { CategoriesSection } from '@/presentation/components/homepage/Categories/CategoriesSection';
import { StrategicCTA } from '@/presentation/components/homepage/StrategicCTA/StrategicCTA';
import { CompaniesSection } from '@/presentation/components/homepage/Companies/CompaniesSection';
import { ShowcaseSection } from '@/presentation/components/homepage/Showcase/ShowcaseSection';
import { FairsSection } from '@/presentation/components/homepage/Fairs/FairsSection';
import { NewsSection } from '@/presentation/components/homepage/News/NewsSection';

export default function Home() {
  // Toggle this to test performance:
  // false = fast (no API calls in hero)
  // true = slow (4 extra API calls in hero)
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
