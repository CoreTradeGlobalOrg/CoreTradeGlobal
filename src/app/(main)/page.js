/**
 * Homepage
 *
 * Public landing page for CoreTradeGlobal
 * Dark themed with 3D globe, featured products/RFQs, and more
 * Matches design exactly from main_screen/index.html
 *
 * Also serves as the first-login landing point for authenticated users.
 * Renders the OnboardingTour overlay for users who haven't completed it yet.
 *
 * Server component — Home() itself has no hooks or event handlers, only
 * composition. Every section it renders is a 'use client' component that
 * still SSRs into HTML normally. Marking this file 'use client' used to
 * force the whole tree onto the React 19 client-side rendering path, which
 * shipped an empty <div hidden> in the SSR HTML — footer painted at ~y=400
 * on first paint and dropped to ~y=6500 after hydration (~0.4 CLS on
 * mobile). Dropping the directive lets React SSR the full section tree so
 * the initial HTML already has the real content, no `min-height` clamp
 * needed to reserve footer space.
 */

import dynamic from 'next/dynamic';
import { HeroSection } from '@/presentation/components/homepage/Hero/HeroSection';
import { getAdminFirestore } from '@/lib/firebase-admin';

// Explicit canonical for the homepage — the root layout no longer sets
// a global canonical (it was propagating '/' onto every dynamic route
// and telling Google every page was a duplicate of the homepage).
// Each surface now emits its own.
export const metadata = {
  alternates: { canonical: '/' },
};

// Revalidate hourly so freshly uploaded products land in the SSR
// homepage without a redeploy. Matches the detail-page revalidate.
export const revalidate = 3600;
import { FeaturedProducts } from '@/presentation/components/homepage/Products/FeaturedProducts';
import { FeaturedRFQs } from '@/presentation/components/homepage/RFQs/FeaturedRFQs';
import { CategoriesSection } from '@/presentation/components/homepage/Categories/CategoriesSection';
import { CompaniesSection } from '@/presentation/components/homepage/Companies/CompaniesSection';

// Server-side fetch of the top N active products. Feeds the SSR
// homepage with real `/product/<firestoreId>` links so Googlebot
// discovers the catalog from the entry point (previously the first
// paint shipped mock /product/1..8 links that all 404'd — Google
// treated them as site-wide "products broken" signal and throttled
// crawl budget).
async function fetchFeaturedProducts(limit = 30) {
  try {
    const snap = await getAdminFirestore()
      .collection('products')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Firestore Timestamps aren't serializable across the server/client
    // boundary — convert any _seconds / toDate() shaped field to ISO.
    return JSON.parse(
      JSON.stringify(docs, (_, value) => {
        if (value && typeof value === 'object' && typeof value._seconds === 'number') {
          return new Date(value._seconds * 1000).toISOString();
        }
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        return value;
      })
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[homepage] featured products fetch failed:', err);
    return [];
  }
}

// Only the *last three* sections are dynamic — they sit well below the
// fold (after ShowcaseSection they're purely scroll-reveal content) so
// splitting them out of the initial bundle shaves ~150 KiB of JS from
// the LCP path. Placeholder min-heights match the CSS reservations so
// the placeholder-to-real swap can't shift the footer during throttled
// Lighthouse loads (showcase's 850px reservation was previously 640,
// which was ~200px shorter than the real content).
// An earlier revision also split FeaturedProducts / FeaturedRFQs /
// CompaniesSection / CategoriesSection, but on mobile the stacked
// card layouts are ~2x taller than the desktop-derived px placeholder
// heights, so the placeholder→real swap shot CLS from 0.07 to 0.43.
// Kept them eager for now — TBT already dropped 91% from the Globe
// delay + idle-fetch delay alone.
const ShowcaseSection = dynamic(
  () => import('@/presentation/components/homepage/Showcase/ShowcaseSection').then((m) => m.ShowcaseSection),
  { loading: () => <section className="showcase-section" style={{ minHeight: 650 }} /> }
);
const FairsSection = dynamic(
  () => import('@/presentation/components/homepage/Fairs/FairsSection').then((m) => m.FairsSection),
  { loading: () => <div className="fairs-wrapper" style={{ minHeight: 585 }} /> }
);

export default async function Home() {
  const HERO_FETCH_DATA = true;
  const initialProducts = await fetchFeaturedProducts(30);

  return (
    <main className="homepage">
      {/* Hero Section with 3D Globe */}
      <HeroSection fetchData={HERO_FETCH_DATA} />



      {/* Featured Products */}
      <FeaturedProducts initialProducts={initialProducts} />

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

    </main>
  );
}
