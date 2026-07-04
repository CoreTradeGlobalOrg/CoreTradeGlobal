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

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { HeroGlobe } from './HeroGlobe';
import { HeroStats } from './HeroStats';
import { HeroDataCards } from './HeroDataCards';
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

// Daily slogans - changes based on day of week
const DAILY_SLOGANS = {
  0: "Global Trade, Simplified: Navigate the Complex Markets with Ease.",
  1: "The Global Hub of Trust: Trade Exclusively with Verified Suppliers.",
  2: "Scale Beyond Borders: Expand Your Business to Every Global Market.",
  3: "Trading at the Speed of Light: Get Instant Quotes for Your RFQs.",
  4: "The Intersection of Global Trade: Connecting Buyers and Sellers with Transparency.",
  5: "The Operating System for Trade: A Future-Ready, Data-Driven B2B Experience.",
  6: "Unlock New Opportunities: Find Your Next Strategic Partner Today.",
};

const getDailySlogan = () => DAILY_SLOGANS[new Date().getDay()];

export function HeroSection({ fetchData = false }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
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

  // Callback for GlobeCanvas to signal readiness (replaces the old 1500ms timer)
  const handleGlobeReady = useCallback(() => {
    setGlobeLoaded(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Defer Firestore queries until after first paint using requestIdleCallback.
  // This ensures the hero text, buttons, and skeleton cards render immediately.
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
        <HeroGlobe mounted={mounted} globeLoaded={globeLoaded} onGlobeReady={handleGlobeReady} />

        {/* Hero Overlay with Slogan and Search */}
        <div className="hero-overlay">
          <div className="slogan-container">
            <h1 className="hero-slogan">{getDailySlogan()}</h1>
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
              // Two placeholders shaped like the resolved buttons so the
              // hero-cta-group has the same width & row height whether the
              // auth check is still running or done. Prevents a 40-100 px
              // shift on mobile once useAuth resolves.
              <>
                <div className="w-40 h-[52px] bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
                <div className="w-32 h-[52px] bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
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
