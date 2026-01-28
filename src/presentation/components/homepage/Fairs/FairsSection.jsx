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
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

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

function FairCard({ fair }) {
  const formatDate = (date) => {
    if (!date) return { day: '--', month: '---' };
    const d = date?.toDate ? date.toDate() : new Date(date);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    };
  };

  const startDateInfo = formatDate(fair.startDate);

  return (
    <Link href={`/fair/${fair.id}`} className="fair-card">
      <div className="fair-content">
        {/* Fair Title */}
        <h3 className="fair-card-title">{fair.name}</h3>

        {/* Location */}
        <div className="fair-card-location">
          <MapPin className="w-4 h-4" />
          <span>{fair.location}</span>
        </div>

        {/* Description */}
        <p className="fair-card-desc">{fair.description}</p>

        {/* Visual Area with Date */}
        <div className="fair-visual-area">
          <div className="fair-date-box">
            <span className="fair-date-day">{startDateInfo.day}</span>
            <span className="fair-date-month">{startDateInfo.month}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FairsSection() {
  const [fairs, setFairs] = useState(DEFAULT_FAIRS);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchFairs = async () => {
      try {
        // Use simple query without index, filter client-side
        const firestoreDS = container.getFirestoreDataSource();
        const allFairs = await firestoreDS.query('fairs', { limit: 20 });

        if (allFairs && allFairs.length > 0) {
          // Filter upcoming fairs and sort by startDate client-side
          const upcoming = allFairs.filter(f => f.status === 'upcoming' || f.status === 'ongoing');
          const sorted = upcoming.sort((a, b) => {
            const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
            const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
            return dateA - dateB; // Ascending - nearest first
          });

          if (sorted.length > 0) {
            setFairs(sorted.slice(0, 6));
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
          className={`scroll-arrow-btn ${showLeftArrow ? 'visible' : ''}`}
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
          className="fair-scroll-row"
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
