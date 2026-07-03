/**
 * FairsSection Component
 *
 * Homepage section displaying upcoming trade fairs
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { ChevronLeft, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { useResponsiveLimit, useScrollLoadMore } from '@/presentation/hooks/useResponsiveLimit';
import { COUNTRIES } from '@/core/constants/countries';

// Build a lookup map: lowercase country name → 2-letter code (with common aliases)
const COUNTRY_NAME_TO_CODE = {};
COUNTRIES.forEach(c => { COUNTRY_NAME_TO_CODE[c.label.toLowerCase()] = c.value; });
// Common aliases for fuzzy matching
const ALIASES = {
  'uae': 'AE', 'u.a.e': 'AE', 'u.a.e.': 'AE', 'emirates': 'AE',
  'uk': 'GB', 'u.k.': 'GB', 'england': 'GB', 'britain': 'GB',
  'usa': 'US', 'u.s.a': 'US', 'u.s.a.': 'US', 'u.s.': 'US', 'america': 'US',
  'holland': 'NL', 'the netherlands': 'NL', 'netherland': 'NL',
  'south korea': 'KR', 'korea': 'KR',
  'czech republic': 'CZ', 'czechia': 'CZ',
  'ivory coast': 'CI', "cote d'ivoire": 'CI',
  'türkiye': 'TR', 'turkiye': 'TR',
};
Object.entries(ALIASES).forEach(([k, v]) => { COUNTRY_NAME_TO_CODE[k] = v; });

/** Extract country code from location string like "Tashkent – Uzbekistan" */
function getCountryCodeFromLocation(location) {
  if (!location) return null;
  const parts = location.split(/[,–—\-]/).map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const code = COUNTRY_NAME_TO_CODE[parts[i].toLowerCase()];
    if (code) return code;
  }
  return null;
}

// Default fairs for initial display
const DEFAULT_FAIRS = [
  {
    id: '1',
    name: 'Istanbul Trade Expo',
    location: 'Istanbul, Turkey',
    startDate: new Date('2025-03-15'),
    endDate: new Date('2025-03-18'),
    description: 'Largest international trade fair in Turkey',
  },
  {
    id: '2',
    name: 'Global B2B Summit',
    location: 'Dubai, UAE',
    startDate: new Date('2025-04-10'),
    endDate: new Date('2025-04-12'),
    description: 'Premier event for B2B connections',
  },
  {
    id: '3',
    name: 'Tech Trade Show',
    location: 'Shanghai, China',
    startDate: new Date('2025-05-20'),
    endDate: new Date('2025-05-24'),
    description: 'Technology and electronics trade fair',
  },
  {
    id: '4',
    name: 'European Manufacturing Expo',
    location: 'Frankfurt, Germany',
    startDate: new Date('2025-06-05'),
    endDate: new Date('2025-06-08'),
    description: 'Industrial machinery and manufacturing',
  },
];

/** Format a date range like "28 Apr – 30 Apr 2026" */
function formatDateRange(startDate, endDate) {
  const toDate = (d) => d?.toDate ? d.toDate() : new Date(d);
  if (!startDate) return null;
  const start = toDate(startDate);
  const opts = { day: 'numeric', month: 'short' };
  const startStr = start.toLocaleDateString('en-US', opts);
  if (!endDate) return `${startStr} ${start.getFullYear()}`;
  const end = toDate(endDate);
  const endStr = end.toLocaleDateString('en-US', opts);
  const year = end.getFullYear();
  return `${startStr} – ${endStr} ${year}`;
}

function FairCard({ fair }) {
  const dateRange = formatDateRange(fair.startDate, fair.endDate);

  return (
    <Link href={`/fair/${fair.id}`} className="fair-card">
      <div className="fair-content">
        {/* Fair Title */}
        <h3 className="fair-card-title">{fair.name}</h3>

        {/* Category Badge */}
        {fair.category && (
          <div className="mb-1">
            <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider bg-[rgba(255,215,0,0.1)] px-2 py-1 rounded-full">
              {fair.category}
            </span>
          </div>
        )}

        {/* Location */}
        <div className="fair-card-location">
          <MapPin className="w-4 h-4" />
          <span>{fair.location}</span>
        </div>

        {/* Date Range */}
        {dateRange && (
          <div className="fair-card-location" style={{ marginTop: '4px' }}>
            <Calendar className="w-4 h-4" />
            <span>{dateRange}</span>
          </div>
        )}

        {/* Description */}
        <p className="fair-card-desc">{fair.description}</p>

        {/* Visual Area with Flag or Date fallback */}
        <div className="fair-visual-area">
          {(fair.country || getCountryCodeFromLocation(fair.location)) ? (
            <>
              {/* Blurred background flag */}
              <img
                src={`https://flagcdn.com/w320/${(fair.country || getCountryCodeFromLocation(fair.location)).toLowerCase()}.png`}
                alt=""
                width={320}
                height={213}
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-60"
                loading="lazy"
              />
              {/* Crisp centered flag */}
              <img
                src={`https://flagcdn.com/w320/${(fair.country || getCountryCodeFromLocation(fair.location)).toLowerCase()}.png`}
                srcSet={`https://flagcdn.com/w640/${(fair.country || getCountryCodeFromLocation(fair.location)).toLowerCase()}.png 2x`}
                alt={`${fair.country || getCountryCodeFromLocation(fair.location)} flag`}
                width={320}
                height={213}
                className="relative z-10 max-w-[65%] max-h-[75%] object-contain rounded-md"
                loading="lazy"
              />
            </>
          ) : (
            <div className="fair-date-box flex flex-col items-center gap-1">
              <span className="fair-date-day">{new Date(fair.startDate?.toDate ? fair.startDate.toDate() : fair.startDate).getDate()}</span>
              <span className="fair-date-month">{new Date(fair.startDate?.toDate ? fair.startDate.toDate() : fair.startDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function FairsSection() {
  const [fairs, setFairs] = useState(DEFAULT_FAIRS);
  const [allFairs, setAllFairs] = useState([]); // Store all fetched fairs
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);

  // Responsive limits with lazy loading: mobile 3, tablet 4, desktop 6, max 15
  const { limit, displayCount, isReady, loadMore, hasMore } = useResponsiveLimit({
    mobile: 3,
    tablet: 4,
    desktop: 6,
    maxItems: 15
  });

  // Lazy load more when scrolling near end
  useScrollLoadMore(scrollRef, loadMore, hasMore, 200);

  // Update displayed fairs when displayCount changes (lazy loading)
  useEffect(() => {
    if (allFairs.length > 0) {
      setFairs(allFairs.slice(0, displayCount));
    }
  }, [displayCount, allFairs]);

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
  }, [fairs]);

  useEffect(() => {
    if (!isReady) return; // Wait for responsive limit to be determined

    const fetchFairs = async () => {
      try {
        // Fetch enough fairs for lazy loading
        const firestoreDS = container.getFirestoreDataSource();
        const fetchedFairs = await firestoreDS.query('fairs', { limit: 20 });

        if (fetchedFairs && fetchedFairs.length > 0) {
          // Filter upcoming fairs and sort by startDate client-side
          const upcoming = fetchedFairs.filter(f => f.status === 'upcoming' || f.status === 'ongoing');
          const sorted = upcoming.sort((a, b) => {
            const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
            const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
            return dateA - dateB; // Ascending - nearest first
          });

          if (sorted.length > 0) {
            setAllFairs(sorted);
            setFairs(sorted.slice(0, displayCount));
          }
        }
      } catch (error) {
        console.error('Error fetching fairs:', error);
        // Keep default fairs on error
      } finally {
        setLoading(false);
      }
    };

    fetchFairs();
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
    <div className="fairs-wrapper" id="fairs">
      <div className="exhibitions-container">
        {/* Header */}
        <div className="fair-header">
          <div className="fair-title-group">
            <h2>Upcoming Fairs</h2>
            <p>Stay up to date with the latest industry events.</p>
          </div>
          <Link href="/fairs" className="btn-section-action">
            View All Fairs →
          </Link>
        </div>

        {/* Scroll Arrows */}
        <button
          className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
          id="fair-left"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
          id="fair-right"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Fairs Scroll Container */}
        <div
          id="fair-scroll-row"
          className="fair-scroll-row select-none"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="fair-card"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="fair-content">
                    <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3" />
                    <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                    <div className="fair-visual-area animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            fairs.map((fair) => <FairCard key={fair.id} fair={fair} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default FairsSection;
