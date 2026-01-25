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

// Get country info from COUNTRIES constant
const getCountryInfo = (countryValue) => {
  if (!countryValue) return { flag: '🌍', name: 'Global' };

  // Find by value (ISO code like "TR") or by label match
  const country = COUNTRIES.find(c =>
    c.value === countryValue ||
    c.label.toLowerCase().includes(countryValue.toLowerCase())
  );

  if (country) {
    // Extract emoji (first characters before space)
    const flag = country.label.split(' ')[0];
    const name = country.label.substring(flag.length + 1);
    return { flag, name };
  }

  return { flag: '🌍', name: countryValue };
};

// Default RFQs for initial display
// Exact RFQs from anasyf/RFQ.html
const DEFAULT_RFQS = [
  {
    id: '1',
    title: 'Steel Beams H-Profile for Construction Project',
    quantity: '500 Tons',
    deadline: '2 hrs ago', // Using 'posted' time as deadline/relative time for now to match UI text
    country: 'Germany',
    countryFlag: '🇩🇪',
    budget: 'Open',
    badge: 'Urgent',
    description: 'Seeking high-quality H-Profile steel beams for a large scale commercial project in Berlin. Standard DIN 1025.'
  },
  {
    id: '2',
    title: 'Organic Cotton Fabric Rolls',
    quantity: '20,000 Meters',
    deadline: '4 hrs ago',
    country: 'USA',
    countryFlag: '🇺🇸',
    budget: '$150k - $200k',
    badge: 'New',
    description: 'Looking for GOTS certified organic cotton fabric manufacturers. Sample required before bulk order.'
  },
  {
    id: '3',
    title: 'Automotive Brake Pads (Ceramic)',
    quantity: '5,000 Sets',
    deadline: '6 hrs ago',
    country: 'Japan',
    countryFlag: '🇯🇵',
    budget: 'Market Price',
    badge: 'New',
    description: 'Distributor seeking OEM standard ceramic brake pads for Japanese car models (Toyota, Honda).'
  },
  {
    id: '4',
    title: 'Bulk Wheat Grain (Hard Red Winter)',
    quantity: '1,000 Tons',
    deadline: '1 day ago',
    country: 'Egypt',
    countryFlag: '🇪🇬',
    budget: '$280/Ton',
    badge: 'Urgent',
    description: 'Immediate requirement for milling grade wheat. CIF Alexandria port. Payment via LC.'
  },
  {
    id: '5',
    title: 'Polypropylene (PP) Granules',
    quantity: '200 Tons',
    deadline: '1 day ago',
    country: 'Poland',
    countryFlag: '🇵🇱',
    budget: 'Negotiable',
    badge: 'New',
    description: 'Injection molding grade PP required for plastic container manufacturing. Monthly recurring order.'
  },
  {
    id: '6',
    title: 'Solar Inverters 5kW Hybrid',
    quantity: '100 Units',
    deadline: '2 days ago',
    country: 'South Africa',
    countryFlag: '🇿🇦',
    budget: '$50k Total',
    badge: 'New',
    description: 'Looking for reliable suppliers of hybrid solar inverters compatible with lithium batteries.'
  }
];

function RFQCard({ rfq }) {
  return (
    <Link href={`/request/${rfq.id}`} className="rfq-card min-w-[320px] h-[380px] flex flex-col block no-underline hover:no-underline">
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${rfq.badge === 'Urgent' ? 'bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.3)]' : 'bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)]'}`}>
          {rfq.badge || 'New'}
        </span>
        <span className="text-xs text-[var(--text-grey)]">{rfq.deadline}</span>
      </div>

      <h3 className="text-lg font-bold text-white mb-3 leading-snug">{rfq.title}</h3>

      <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 mb-4 flex flex-col gap-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--text-grey)]">Quantity:</span>
          <span className="text-white font-semibold">{rfq.quantity}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--text-grey)]">Budget:</span>
          <span className="text-white font-semibold">{rfq.budget}</span>
        </div>
      </div>

      {rfq.description && (
        <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 line-clamp-2 overflow-hidden">{rfq.description}</p>
      )}

      <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-[13px] text-white">
          <span>{rfq.countryFlag || '🌍'}</span>
          <span>{rfq.country || 'Global'}</span>
        </div>
        <div className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white border-0 px-5 py-2 rounded-full text-[13px] font-semibold shadow-lg hover:bg-blue-400 hover:-translate-y-0.5 transition-all text-center">
          Quote Now
        </div>
      </div>
    </Link>
  );
}

export function FeaturedRFQs() {
  const [rfqs, setRfqs] = useState(DEFAULT_RFQS);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        // Use simple query without index, filter client-side
        const firestoreDS = container.getFirestoreDataSource();
        const allRequests = await firestoreDS.query('requests', { limit: 30 });

        if (allRequests && allRequests.length > 0) {
          // Filter active requests and sort by createdAt client-side
          const active = allRequests.filter(r => r.status === 'active');
          const sorted = active.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });

          setRfqs(
            sorted.slice(0, 10).map((r) => {
              const countryInfo = getCountryInfo(r.targetCountry || r.country);
              return {
                ...r,
                title: r.productName || r.title,
                countryFlag: countryInfo.flag,
                country: countryInfo.name,
                deadline: r.deadline || 'ASAP',
                budget: r.budget || 'Negotiable',
              };
            })
          );
        }
      } catch (error) {
        console.error('Error fetching RFQs:', error);
        // Keep default RFQs on error
      } finally {
        setLoading(false);
      }
    };

    fetchRFQs();
  }, []);

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
            <h2>Featured RFQs</h2>
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
                      className="card min-w-[320px] h-[380px]"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="card-img-area animate-pulse" />
                      <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3 mt-4" />
                      <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                      <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                    </div>
                  ))}
                </>
              ) : (
                rfqs.map((rfq) => <RFQCard key={rfq.id} rfq={rfq} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedRFQs;
