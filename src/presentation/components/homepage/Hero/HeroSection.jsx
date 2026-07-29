/**
 * HeroSection Component
 *
 * Main hero section orchestrator. Composes HeroGlobe, HeroStats, HeroDataCards
 * and inline search/CTA blocks. Manages all state and data fetching.
 *
 * Props:
 * - fetchData: boolean (default: false) - Enable API calls for latest data
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { HeroGlobe } from './HeroGlobe';
import { HeroStats } from './HeroStats';
import { HeroDataCards } from './HeroDataCards';
import { HeroMobileAdCards } from './HeroMobileAdCards';
import { HeroSearchBar } from './HeroSearchBar';

/**
 * Schedule a callback after the browser is idle, with a setTimeout fallback
 * for browsers that don't support requestIdleCallback.
 */
const scheduleIdle = (cb) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(cb);
  }
  return setTimeout(cb, 0);
};

const cancelIdle = (id) => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

// Single evergreen hero headline. Replaced the day-of-week rotator
// so the top of the funnel says one clear thing every visit.
const HERO_HEADLINE = 'Trade Globally. Completely Free.';

export function HeroSection({ fetchData = false }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  // canMountGlobe gates the three.js worker init behind an idle callback so
  // the ~700 KiB three chunk parse/eval never lands on the LCP paint. The
  // LCP element on the homepage is `h1.hero-slogan` (plain text) — as soon
  // as we stop hogging the main thread with worker init and CanvasRenderer
  // setup, throttled-mobile LCP drops from ~12s to something closer to the
  // local 0.65s baseline. Set 600 ms below to comfortably clear the
  // slowest expected paint on 4G + 4x CPU (Lighthouse mobile emulation).
  const [canMountGlobe, setCanMountGlobe] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchType, setSearchType] = useState('Products');
  const [searchQuery, setSearchQuery] = useState('');
  const [globeLoaded, setGlobeLoaded] = useState(false);

  const router = useRouter();

  // Firebase data states (only used when fetchData=true)
  const [latestProduct, setLatestProduct] = useState(null);
  const [latestRequest, setLatestRequest] = useState(null);
  const [latestFair, setLatestFair] = useState(null);
  const [latestSupplier, setLatestSupplier] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  // Holds the requestIdleCallback handle scheduled from inside the outer
  // setTimeout so the effect's cleanup can cancel it if the component
  // unmounts before the idle callback fires.
  const delayHandleRef = useRef(null);

  // Callback for GlobeCanvas to signal readiness (replaces the old 1500ms timer)
  const handleGlobeReady = useCallback(() => {
    setGlobeLoaded(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    setCanMountGlobe(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Defer Firestore queries until after first paint using requestIdleCallback.
  // On mobile the browser fires idle callbacks aggressively even while the
  // main thread is still parsing large chunks — so we add an explicit delay
  // window before firing the 4 parallel Firestore queries. This keeps the
  // idle fetch off the LCP + TBT critical path on throttled Lighthouse runs.
  useEffect(() => {
    if (!fetchData || !mounted) return;

    setDataLoading(true);

    const idleId = scheduleIdle(() => {
      const fetchLatestData = async () => {
        try {
          const firestoreDS = container.getFirestoreDataSource();

          const [productsRes, requestsRes, fairsRes, usersRes] = await Promise.allSettled([
            firestoreDS.query('products', {
              where: [['status', '==', 'active']],
              orderBy: [['createdAt', 'desc']],
              limit: 1,
            }),
            firestoreDS.query('requests', {
              where: [['status', '==', 'active']],
              orderBy: [['createdAt', 'desc']],
              limit: 1,
            }),
            firestoreDS.query('fairs', {
              where: [['status', '==', 'upcoming']],
              orderBy: [['startDate', 'asc']],
              limit: 1,
            }),
            firestoreDS.query('users', {
              where: [['emailVerified', '==', true], ['adminApproved', '==', true]],
              orderBy: [['approvedAt', 'desc']],
              limit: 5,
            }),
          ]);

          if (productsRes.status === 'fulfilled' && productsRes.value?.length > 0) {
            setLatestProduct(productsRes.value[0]);
          }

          if (requestsRes.status === 'fulfilled' && requestsRes.value?.length > 0) {
            setLatestRequest(requestsRes.value[0]);
          }

          if (fairsRes.status === 'fulfilled' && fairsRes.value?.length > 0) {
            setLatestFair(fairsRes.value[0]);
          }

          if (usersRes.status === 'fulfilled' && usersRes.value?.length > 0) {
            const supplier = usersRes.value.find(u => u.companyName && !u.isSuspended);
            if (supplier) setLatestSupplier(supplier);
          }
        } finally {
          setDataLoading(false);
        }
      };

      fetchLatestData();
    });

    return () => cancelIdle(idleId);
  }, [fetchData, mounted]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = searchType === 'Products'
        ? `/products?search=${encodeURIComponent(searchQuery)}`
        : `/requests?search=${encodeURIComponent(searchQuery)}`;
    }
  };


  return (
    <>
      {/* Tagline Section */}
      <div className="tagline-section">
        <div className="hero-tagline"></div>
      </div>

      {/* Hero Section */}
      <section id="hero-section">
        <HeroGlobe mounted={canMountGlobe} globeLoaded={globeLoaded} onGlobeReady={handleGlobeReady} />

        {/* Hero Overlay with Slogan and Search */}
        <div className="hero-overlay">
          <div className="slogan-container">
            <h1 className="hero-slogan">{HERO_HEADLINE}</h1>
            <HeroSearchBar
              isMobile={isMobile}
              searchType={searchType}
              setSearchType={setSearchType}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearch}
            />
          </div>
        </div>

        {/* Hero CTA Buttons */}
        <div className="hero-interactions">
          <div className="hero-cta-group">
            {loading ? (
              // Placeholders match the RESOLVED buttons pixel-for-pixel.
              // .btn-hero-white / .btn-hero-secondary render at 60px tall
              // on desktop (padding 16*2 + line-height ~28 with the 2px
              // secondary border), and .hero-cta-btn (auth'd path) renders
              // at 56px. Mobile media query overrides both to 48px via
              // padding 14*2 + font-size 16 line-height 1.25. The 52px
              // pills used to sit 8-11px shorter than the desktop cluster
              // on hard reload, which triggered a Performance-tab CLS marker
              // at ~1.6s once useAuth resolved. Match the desktop 60px
              // ceiling — mobile shrinks together via CSS regardless.
              <>
                <div className="w-full md:w-40 h-[48px] md:h-[60px] bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
                <div className="w-full md:w-32 h-[48px] md:h-[60px] bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
              </>
            ) : isAuthenticated && user ? (
              <>
                <button
                  onClick={() => router.push('/product/new')}
                  className="hero-cta-btn hero-cta-btn-sell"
                >
                  Add Product
                </button>
                <button
                  onClick={() => router.push('/request/new')}
                  className="hero-cta-btn hero-cta-btn-buy"
                >
                  Add Request
                </button>
              </>
            ) : (
              <>
                <Link href="/register" className="btn-hero-white">
                  Sign Up for Free
                </Link>
                <Link href="/login" className="btn-hero-secondary">
                  Log In <span className="arrow-icon">›</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile-only ad slots (Featured Product + Featured Company).
              Sits directly under the CTA row; desktop hides via CSS since
              the same ad types show up in HeroDataCards / Showcase. */}
          <HeroMobileAdCards />
        </div>

        <HeroStats />

        <HeroDataCards
          fetchData={fetchData}
          dataLoading={dataLoading}
          latestProduct={latestProduct}
          latestRequest={latestRequest}
          latestFair={latestFair}
          latestSupplier={latestSupplier}
        />
      </section>
    </>
  );
}

export default HeroSection;
