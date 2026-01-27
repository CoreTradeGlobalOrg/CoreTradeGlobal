/**
 * HeroSection Component
 *
 * Main hero section with 3D globe, search bar, and CTAs
 * Matches design exactly from index.html
 *
 * Props:
 * - fetchData: boolean (default: false) - Enable API calls for latest data
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { Modal } from '@/components/ui/Modal';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import toast from 'react-hot-toast';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const country = COUNTRIES.find(c => c.value === countryCode);
  if (country) {
    return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

// Dynamic import for 3D globe to avoid SSR issues
const GlobeCanvas = dynamic(
  () => import('../Globe/GlobeCanvas').then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => null,
  }
);

const SEARCH_TAGS = ['Marble', 'Steel', 'Textile', 'Germany', 'Electronics'];

export function HeroSection({ fetchData = false }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
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
    const timer = setTimeout(() => setGlobeLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch data only if fetchData prop is true
  useEffect(() => {
    if (!fetchData || !mounted) return;

    const fetchLatestData = async () => {
      const firestoreDS = container.getFirestoreDataSource();

      try {
        const products = await firestoreDS.query('products', { limit: 20 });
        if (products?.length > 0) {
          const active = products.filter(p => p.status === 'active');
          const sorted = active.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          if (sorted.length > 0) setLatestProduct(sorted[0]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }

      try {
        const requests = await firestoreDS.query('requests', { limit: 20 });
        if (requests?.length > 0) {
          const active = requests.filter(r => r.status === 'active');
          const sorted = active.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          if (sorted.length > 0) setLatestRequest(sorted[0]);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      }

      try {
        const fairs = await firestoreDS.query('fairs', { limit: 20 });
        if (fairs?.length > 0) {
          const upcoming = fairs.filter(f => f.status === 'upcoming');
          const sorted = upcoming.sort((a, b) => {
            const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
            const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
            return dateA - dateB;
          });
          if (sorted.length > 0) setLatestFair(sorted[0]);
        }
      } catch (error) {
        console.error('Error fetching fairs:', error);
      }

      try {
        const users = await firestoreDS.query('users', { limit: 20 });
        if (users?.length > 0) {
          const withCompany = users.filter(u => u.companyName);
          const sorted = withCompany.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          if (sorted.length > 0) setLatestSupplier(sorted[0]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
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

  const toggleSearchType = () => {
    setSearchType(prev => prev === 'Products' ? 'RFQs' : 'Products');
  };

  const applySearchTag = (tag) => {
    setSearchQuery(tag);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleProductSubmit = async (data, imageFiles) => {
    try {
      await createProduct(user.uid, data, imageFiles);
      setProductModalOpen(false);
      toast.success('Product created successfully!');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    }
  };

  const handleRequestSubmit = async (data) => {
    try {
      await createRequest(user.uid, data);
      setRequestModalOpen(false);
      toast.success('Request created successfully!');
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to create request');
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
        {/* Globe Loading Text - hides when globe is loaded */}
        <div
          className="globe-loading-text"
          id="loading"
          style={{
            opacity: globeLoaded ? 0 : 0.9,
            transition: 'opacity 0.5s ease-out',
            pointerEvents: globeLoaded ? 'none' : 'auto',
          }}
        >
          Welcome to CoreTradeGlobal
        </div>

        {/* Hero Overlay with Slogan and Search */}
        <div className="hero-overlay">
          <div className="slogan-container">
            <h1 className="hero-slogan">Connect with Verified Suppliers</h1>
            <div className="search-bar-container">
              <form className="search-bar" onSubmit={handleSearch}>
                <div className="search-switch-container">
                  {/* Sliding Gold Background */}
                  <div
                    className="search-switch-slider"
                    style={{
                      transform: searchType === 'Products' ? 'translateX(0)' : 'translateX(100%)',
                      width: 'calc(50% - 4px)' // Ensure precise fit
                    }}
                  />

                  {/* Buttons */}
                  <button
                    type="button"
                    className={`search-switch-btn ${searchType === 'Products' ? 'active' : ''}`}
                    onClick={() => setSearchType('Products')}
                  >
                    Products
                  </button>
                  <button
                    type="button"
                    className={`search-switch-btn ${searchType === 'RFQs' ? 'active' : ''}`}
                    onClick={() => setSearchType('RFQs')}
                  >
                    RFQs
                  </button>
                </div>
                <input
                  type="text"
                  className="search-input"
                  id="search-input"
                  placeholder={searchType === 'Products'
                    ? "Search for products, companies, or RFQs..."
                    : "Search for active RFQs..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="search-btn">
                  <svg className="search-icon" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </button>
              </form>
              <div className="search-tags">
                {SEARCH_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="search-tag-pill"
                    onClick={() => applySearchTag(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
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

        {/* Social Proof Stats */}
        <div className="social-proof-bar">
          <div className="sp-item">
            <span className="sp-number">15K+</span>
            <span className="sp-label">Active Buyers</span>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div className="sp-item">
            <span className="sp-number">500+</span>
            <span className="sp-label">Daily RFQs</span>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div className="sp-item">
            <span className="sp-number">120+</span>
            <span className="sp-label">Countries</span>
          </div>
        </div>

        {/* Left Side Info Cards */}
        <div className="hero-left-cards">
          {/* Product Card */}
          <Link href={fetchData && latestProduct ? `/product/${latestProduct.id}` : '/products'} className="hero-info-card hero-product-card">
            <div className="card-icon">
              {fetchData && latestProduct?.images?.[0] ? (
                <img src={latestProduct.images[0]} alt={latestProduct.name} className="w-12 h-12 object-cover rounded" />
              ) : '📦'}
            </div>
            <div className="card-content">
              <h3>{fetchData ? 'Latest Product' : 'Products'}</h3>
              <p className="card-product-name">
                {fetchData && latestProduct ? latestProduct.name : 'Browse Products'}
              </p>
              <p className="card-specs">
                {fetchData && latestProduct
                  ? `${latestProduct.price ? `${latestProduct.currency || '$'}${latestProduct.price}` : 'Price on request'}`
                  : 'From verified suppliers'}
              </p>
              <p className="card-price">{fetchData ? 'See Details ▼' : 'Explore →'}</p>
            </div>
          </Link>

          {/* RFQ Card */}
          <Link href={fetchData && latestRequest ? `/request/${latestRequest.id}` : '/requests'} className="hero-info-card hero-rfq-card">
            <div className="card-icon">📋</div>
            <div className="card-content">
              <h3>{fetchData ? 'Latest RFQ' : 'RFQs'}</h3>
              <p className="card-product-name">
                {fetchData && latestRequest ? (latestRequest.productName || latestRequest.title) : 'Active Requests'}
              </p>
              <p className="card-specs">
                {fetchData && latestRequest
                  ? `Qty: ${latestRequest.quantity || '-'} • ${latestRequest.targetCountry || 'Worldwide'}`
                  : 'Find business opportunities'}
              </p>
              <p className="card-budget">{fetchData ? 'Check Details ▼' : 'View All →'}</p>
            </div>
          </Link>
        </div>

        {/* Right Side Info Cards */}
        <div className="hero-right-cards">
          {/* Fair Card */}
          <Link href={fetchData && latestFair ? `/fairs/${latestFair.id}` : '/fairs'} className="hero-info-card hero-fair-card">
            <div className="card-icon">🎪</div>
            <div className="card-content">
              <h3>{fetchData ? 'Latest Fair' : 'Trade Fairs'}</h3>
              <p className="card-product-name">
                {fetchData && latestFair ? latestFair.name : 'Upcoming Events'}
              </p>
              <p className="card-specs">
                {fetchData && latestFair
                  ? `${formatDate(latestFair.startDate)} • ${latestFair.location || ''}`
                  : 'Connect in person'}
              </p>
              <p className="card-price">{fetchData ? '' : 'See Schedule →'}</p>
            </div>
          </Link>

          {/* Supplier Card */}
          <Link href={fetchData && latestSupplier ? `/profile/${latestSupplier.id}` : '/companies'} className="hero-info-card hero-supplier-card">
            <div className="card-icon">🏭</div>
            <div className="card-content">
              <h3>{fetchData ? 'Latest Supplier' : 'Suppliers'}</h3>
              <p className="card-product-name">
                {fetchData && latestSupplier ? latestSupplier.companyName : 'Verified Companies'}
              </p>
              <p className="card-specs">
                {fetchData && latestSupplier ? (
                  <span className="flex items-center gap-1">
                    <CountryFlag countryCode={latestSupplier.country} size={14} />
                    <span>{getCountryName(latestSupplier.country)}</span>
                    <span>•</span>
                    <span>{latestSupplier.industry || ''}</span>
                  </span>
                ) : 'Worldwide network'}
              </p>
              <p className="card-budget">{fetchData ? 'Verified Member' : 'Browse →'}</p>
            </div>
          </Link>
        </div>

        {/* Three.js Canvas Container */}
        <div id="canvas-container" style={{ opacity: globeLoaded ? 1 : 0 }}>
          {mounted && <GlobeCanvas />}
        </div>
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
      >
        <RequestForm
          onSubmit={handleRequestSubmit}
          onCancel={() => setRequestModalOpen(false)}
        />
      </Modal>
    </>
  );
}

export default HeroSection;
