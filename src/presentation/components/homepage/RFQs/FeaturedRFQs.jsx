/**
 * FeaturedRFQs Component
 *
 * Homepage section displaying featured RFQ requests
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useResponsiveLimit, useScrollLoadMore } from '@/presentation/hooks/useResponsiveLimit';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';

  const found = COUNTRIES.find(c => c.value === countryCode);
  if (found) {
    return found.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }

  return countryCode;
};

// Helper to format relative time
const getRelativeTime = (date) => {
  if (!date) return '';

  const now = new Date();
  const past = date?.toDate ? date.toDate() : new Date(date);
  const diffMs = now - past;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

// Default RFQs for initial display (country = ISO code)
const DEFAULT_RFQS = [
  {
    id: '1',
    title: 'Steel Beams H-Profile for Construction Project',
    quantity: '500 Tons',
    deadline: '2 hrs ago',
    country: 'DE',
    budget: 'Open',
    badge: 'Urgent',
    description: 'Seeking high-quality H-Profile steel beams for a large scale commercial project in Berlin. Standard DIN 1025.'
  },
  {
    id: '2',
    title: 'Organic Cotton Fabric Rolls',
    quantity: '20,000 Meters',
    deadline: '4 hrs ago',
    country: 'US',
    budget: '$150k - $200k',
    badge: 'New',
    description: 'Looking for GOTS certified organic cotton fabric manufacturers. Sample required before bulk order.'
  },
  {
    id: '3',
    title: 'Automotive Brake Pads (Ceramic)',
    quantity: '5,000 Sets',
    deadline: '6 hrs ago',
    country: 'JP',
    budget: 'Market Price',
    badge: 'New',
    description: 'Distributor seeking OEM standard ceramic brake pads for Japanese car models (Toyota, Honda).'
  },
  {
    id: '4',
    title: 'Bulk Wheat Grain (Hard Red Winter)',
    quantity: '1,000 Tons',
    deadline: '1 day ago',
    country: 'EG',
    budget: '$280/Ton',
    badge: 'Urgent',
    description: 'Immediate requirement for milling grade wheat. CIF Alexandria port. Payment via LC.'
  },
  {
    id: '5',
    title: 'Polypropylene (PP) Granules',
    quantity: '200 Tons',
    deadline: '1 day ago',
    country: 'PL',
    budget: 'Negotiable',
    badge: 'New',
    description: 'Injection molding grade PP required for plastic container manufacturing. Monthly recurring order.'
  },
  {
    id: '6',
    title: 'Solar Inverters 5kW Hybrid',
    quantity: '100 Units',
    deadline: '2 days ago',
    country: 'ZA',
    budget: '$50k Total',
    badge: 'New',
    description: 'Looking for reliable suppliers of hybrid solar inverters compatible with lithium batteries.'
  }
];

function RFQCard({ rfq }) {
  return (
    <Link href={`/request/${rfq.id}`} className="rfq-card block no-underline hover:no-underline">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-1.5 text-[13px] text-white">
          <CountryFlag countryCode={rfq.country} size={16} />
          <span>{getCountryName(rfq.country)}</span>
        </div>
        <span className="text-xs text-[var(--text-grey)]">{rfq.timeAgo || rfq.deadline}</span>
      </div>

      <h3 className="text-lg font-bold text-white mb-1 leading-snug">{rfq.title}</h3>
      {rfq.categoryName && (
        <span className="text-sm text-[#3b82f6] font-bold mb-3 block">{rfq.categoryName}</span>
      )}

      <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 mb-4 flex flex-col gap-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--text-grey)]">Quantity:</span>
          <span className="text-white font-semibold">{rfq.quantity} {rfq.unit || 'PCE'}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--text-grey)]">Budget:</span>
          <span className="text-white font-semibold">{rfq.budget === 0 || rfq.budget === '0' ? 'Negotiable' : `$ ${rfq.budget}`}</span>
        </div>
      </div>

      {rfq.description && (
        <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 line-clamp-2 overflow-hidden">{rfq.description}</p>
      )}

      <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-end items-center">
        <div className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white border-0 px-5 py-2 rounded-full text-[13px] font-semibold shadow-lg hover:bg-blue-400 hover:-translate-y-0.5 transition-all text-center">
          Quote Now
        </div>
      </div>
    </Link>
  );
}

export function FeaturedRFQs() {
  const [rfqs, setRfqs] = useState(DEFAULT_RFQS);
  const [allRfqs, setAllRfqs] = useState([]); // Store all fetched RFQs
  const [displayRfqs, setDisplayRfqs] = useState(DEFAULT_RFQS);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);
  const { categories } = useCategories();

  // Responsive limits with lazy loading: mobile 4, tablet 6, desktop 10, max 25
  const { limit, displayCount, isReady, loadMore, hasMore } = useResponsiveLimit({
    mobile: 4,
    tablet: 6,
    desktop: 10,
    maxItems: 25
  });

  // Lazy load more when scrolling near end
  useScrollLoadMore(scrollRef, loadMore, hasMore, 200);

  // Resolve category names when categories or rfqs change
  useEffect(() => {
    const withCategories = rfqs.map(r => {
      const category = categories?.find(c => c.value === r.categoryId);
      return {
        ...r,
        categoryName: category?.name || r.category || ''
      };
    });
    setDisplayRfqs(withCategories);
  }, [rfqs, categories]);

  // Update displayed RFQs when displayCount changes (lazy loading)
  useEffect(() => {
    if (allRfqs.length > 0) {
      setRfqs(allRfqs.slice(0, displayCount));
    }
  }, [displayCount, allRfqs]);

  // Check initial scroll position on mount and when content loads
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollWidth > clientWidth);
      }
    };
    // Check on mount and after a brief delay for content to load
    checkScroll();
    const timeout = setTimeout(checkScroll, 500);
    return () => clearTimeout(timeout);
  }, [rfqs]);

  useEffect(() => {
    if (!isReady) return; // Wait for responsive limit to be determined

    const firestoreDS = container.getFirestoreDataSource();

    // Real-time subscription to requests (fetch enough for lazy loading)
    const unsubscribe = firestoreDS.subscribeToQuery(
      'requests',
      { limit: 30 }, // Fetch enough for lazy loading
      (allRequests) => {
        if (allRequests && allRequests.length > 0) {
          // Filter active requests and sort by createdAt client-side
          const active = allRequests.filter(r => r.status === 'active');
          const sorted = active.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });

          const mappedRfqs = sorted.map((r) => ({
            ...r,
            title: r.productName || r.title,
            country: r.targetCountry || r.country, // ISO code
            timeAgo: getRelativeTime(r.createdAt),
            budget: r.budget ?? 'Negotiable',
          }));

          setAllRfqs(mappedRfqs);
          setRfqs(mappedRfqs.slice(0, displayCount));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching RFQs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isReady]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="featured-rfqs-section">
      <div className="featured-rfqs-container">
        {/* Header */}
        <div className="featured-rfqs-header">
          <div>
            <h2>Latest RFQs</h2>
            <p>Join active requests.</p>
          </div>
          <Link href="/requests" className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white !text-white border-0 px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:bg-blue-400 hover:-translate-y-0.5 transition-all text-decoration-none whitespace-nowrap">
            View All RFQs →
          </Link>
        </div>

        {/* RFQs Grid (using existing dynamic-container logic for scroll) */}
        <div className="featured-rfqs-grid">
          <div className="dynamic-container" style={{ padding: 0, background: 'transparent' }}>
            {/* Scroll Arrows */}
            <button
              className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
              id="dash-left-rfq"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
              id="dash-right-rfq"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* RFQs Container */}
            <div
              id="requests"
              className="tab-content active"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rfq-card"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="h-6 w-16 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-4" />
                      <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3 mt-4" />
                      <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                      <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                    </div>
                  ))}
                </>
              ) : (
                displayRfqs.map((rfq) => <RFQCard key={rfq.id} rfq={rfq} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedRFQs;
