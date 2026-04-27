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

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { Modal } from '@/components/ui/Modal';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { HeroGlobe } from './HeroGlobe';
import { HeroStats } from './HeroStats';
import { HeroDataCards } from './HeroDataCards';
import { HeroSearchBar } from './HeroSearchBar';
import toast from 'react-hot-toast';

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

  // Modal states
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Create hooks
  const { createProduct } = useCreateProduct();
  const { createRequest } = useCreateRequest();

  // Firebase data states (only used when fetchData=true)
  const [latestProduct, setLatestProduct] = useState(null);
  const [latestRequest, setLatestRequest] = useState(null);
  const [latestFair, setLatestFair] = useState(null);
  const [latestSupplier, setLatestSupplier] = useState(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    const timer = setTimeout(() => setGlobeLoaded(true), 1500);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  // Fetch data only if fetchData prop is true
  useEffect(() => {
    if (!fetchData || !mounted) return;

    const fetchLatestData = async () => {
      const firestoreDS = container.getFirestoreDataSource();

      const [productsRes, requestsRes, fairsRes, usersRes] = await Promise.allSettled([
        firestoreDS.query('products', { limit: 20 }),
        firestoreDS.query('requests', { limit: 20 }),
        firestoreDS.query('fairs', { limit: 20 }),
        firestoreDS.query('users', { limit: 50 }),
      ]);

      if (productsRes.status === 'fulfilled' && productsRes.value?.length > 0) {
        const active = productsRes.value.filter(p => p.status === 'active');
        const sorted = active.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        if (sorted.length > 0) setLatestProduct(sorted[0]);
      }

      if (requestsRes.status === 'fulfilled' && requestsRes.value?.length > 0) {
        const active = requestsRes.value.filter(r => r.status === 'active');
        const sorted = active.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        if (sorted.length > 0) setLatestRequest(sorted[0]);
      }

      if (fairsRes.status === 'fulfilled' && fairsRes.value?.length > 0) {
        const upcoming = fairsRes.value.filter(f => f.status === 'upcoming');
        const sorted = upcoming.sort((a, b) => {
          const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
          const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
          return dateA - dateB;
        });
        if (sorted.length > 0) setLatestFair(sorted[0]);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.length > 0) {
        const verified = usersRes.value.filter(u =>
          u.emailVerified === true &&
          u.adminApproved === true &&
          u.companyName &&
          !u.isSuspended
        );
        const sorted = verified.sort((a, b) => {
          const dateA = a.approvedAt?.toDate ? a.approvedAt.toDate() : a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.approvedAt?.toDate ? b.approvedAt.toDate() : b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        if (sorted.length > 0) setLatestSupplier(sorted[0]);
      }
    };

    fetchLatestData();
  }, [fetchData, mounted]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = searchType === 'Products'
        ? `/products?search=${encodeURIComponent(searchQuery)}`
        : `/requests?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleProductSubmit = async (data, imageFiles) => {
    try {
      await createProduct(data, imageFiles);
      setProductModalOpen(false);
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product. Please try again.');
    }
  };

  const handleRequestSubmit = async (data) => {
    try {
      await createRequest(data);
      setRequestModalOpen(false);
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to submit request. Please try again.');
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
        <HeroGlobe mounted={mounted} globeLoaded={globeLoaded} />

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
              <div className="w-48 h-14 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setProductModalOpen(true)}
                  className="hero-cta-btn hero-cta-btn-sell"
                >
                  Add Product
                </button>
                <button
                  onClick={() => setRequestModalOpen(true)}
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
          latestProduct={latestProduct}
          latestRequest={latestRequest}
          latestFair={latestFair}
          latestSupplier={latestSupplier}
        />
      </section>

      {/* Product Creation Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Add New Product"
      >
        <ProductForm
          userId={user?.uid}
          onSubmit={handleProductSubmit}
          onCancel={() => setProductModalOpen(false)}
        />
      </Modal>

      {/* Request Creation Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Create New RFQ"
        variant="blue"
      >
        <RequestForm
          userId={user?.uid}
          onSubmit={handleRequestSubmit}
          onCancel={() => setRequestModalOpen(false)}
        />
      </Modal>
    </>
  );
}

export default HeroSection;
