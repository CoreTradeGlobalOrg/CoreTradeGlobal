/**
 * CompaniesSection Component
 *
 * Homepage section displaying trusted companies
 * Desktop: Horizontal scroll with arrows
 * Mobile: Tinder-style swipeable card stack
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useResponsiveLimit, useScrollLoadMore } from '@/presentation/hooks/useResponsiveLimit';
import dynamic from 'next/dynamic';

// Dynamically import mobile card stack to reduce initial bundle
const MobileCompanyCardStack = dynamic(
  () => import('./MobileCompanyCardStack'),
  { ssr: false }
);


// Get abbreviation from company name
const getAbbreviation = (name) => {
  if (!name) return '??';
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Truncate text to specified length
const truncateText = (text, maxLength = 200) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';

  const found = COUNTRIES.find(c => c.value === countryCode);
  if (found) {
    // Remove emoji from label
    return found.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }

  return countryCode; // Return code as fallback
};

function CompanyCard({ company, categories }) {
  const [imgError, setImgError] = useState(false);
  const profileImage = company.companyLogo || company.photoURL;
  const hasImage = profileImage && !imgError;

  // Resolve category name from companyCategory
  const category = categories?.find(c => c.value === company.companyCategory);
  const categoryName = category?.label?.replace(/^[^\s]+\s/, '') || company.companyCategory || company.industry || '';
  const categoryIcon = category?.icon || '';

  return (
    <Link href={`/profile/${company.id}`} className="company-card-link block no-underline text-inherit hover:no-underline">
      <div className="company-card-inner">
        {/* Header: Logo + Info */}
        <div className="flex items-start gap-4 mb-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden">
            {hasImage ? (
              <img
                src={profileImage}
                alt={company.companyName}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-xl font-extrabold text-[var(--accent-gold)]">
                {getAbbreviation(company.companyName)}
              </span>
            )}
          </div>

          {/* Name + Country */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-2">{company.companyName}</h3>
            <div className="flex items-center gap-2 text-sm text-[var(--text-grey)]">
              <CountryFlag countryCode={company.country} size={14} />
              <span>{getCountryName(company.country)}</span>
            </div>
            {categoryName && (
              <span className="text-xs text-[#FFD700] font-semibold mt-1 flex items-center gap-1.5">
                {categoryIcon && (
                  categoryIcon.startsWith('http') || categoryIcon.startsWith('/') ? (
                    <img src={categoryIcon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <span>{categoryIcon}</span>
                  )
                )}
                <span className="uppercase">{categoryName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {company.about && (
          <p className="text-[13px] text-[#94a3b8] leading-relaxed line-clamp-[8] flex-1">
            {truncateText(company.about, 300)}
          </p>
        )}

        {/* Bottom Section - Always at bottom */}
        <div className="mt-auto">
          {/* Verified Badge */}
          {company.emailVerified && company.adminApproved && (
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)] px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider">
                ✓ Verified
              </span>
            </div>
          )}

          {/* CTA Button */}
          <div className="w-full py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full text-center text-sm">
            View Profile
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CompaniesSection() {
  const [companies, setCompanies] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]); // Store all fetched companies (for Latest Companies)
  const [featuredCompanies, setFeaturedCompanies] = useState([]); // Featured companies for card stack
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isMobile, setIsMobile] = useState(null); // null = not determined yet
  const [isVisible, setIsVisible] = useState(false); // Viewport visibility for performance
  const scrollRef = useRef(null);
  const sectionRef = useRef(null);
  const { categories } = useCategories();

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pause rendering when section is off-screen (performance optimization)
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px', threshold: 0 } // Start loading slightly before visible
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Responsive limits with lazy loading: mobile 4, tablet 8, desktop 12, max 30
  const { limit, displayCount, isReady, loadMore, hasMore } = useResponsiveLimit({
    mobile: 4,
    tablet: 8,
    desktop: 12,
    maxItems: 30
  });

  // Lazy load more when scrolling near end
  useScrollLoadMore(scrollRef, loadMore, hasMore, 200);

  // Update displayed companies when displayCount changes (lazy loading)
  useEffect(() => {
    if (allCompanies.length > 0) {
      setCompanies(allCompanies.slice(0, displayCount));
    }
  }, [displayCount, allCompanies]);

  // Check initial scroll position on mount and when content loads
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollWidth > clientWidth);
      }
    };
    checkScroll();
    const timeout = setTimeout(checkScroll, 500);
    return () => clearTimeout(timeout);
  }, [companies]);

  useEffect(() => {
    if (!isReady) return; // Wait for responsive limit to be determined

    const fetchCompanies = async () => {
      try {
        const firestoreDS = container.getFirestoreDataSource();

        // Fetch ALL companies for Latest Companies section
        const allUsers = await firestoreDS.query('users', { limit: 35 });

        if (allUsers && allUsers.length > 0) {
          // Filter: must have company name and not suspended
          const validCompanies = allUsers.filter(u =>
            u.companyName &&
            !u.isSuspended
          );

          // Sort by date (newest first)
          const sorted = validCompanies.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });

          setAllCompanies(sorted);
          setCompanies(sorted.slice(0, displayCount));

          // Filter featured companies for card stack
          const featured = sorted.filter(u => u.featured === true);
          setFeaturedCompanies(featured);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
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

  // Wait for mobile detection
  if (isMobile === null) {
    return (
      <section className="featured-products-section">
        <div className="featured-products-container">
          <div className="featured-products-header">
            <div>
              <h2>Featured Companies</h2>
              <p>Connect with verified suppliers worldwide.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Mobile: Show card stack (Featured Companies with swipe)
  const renderMobileCardStack = () => {
    if (!isMobile) return null;

    // Don't show if no featured companies
    if (featuredCompanies.length === 0) {
      if (loading) {
        return (
          <section className="featured-products-section">
            <div className="mobile-card-stack-container">
              <div className="section-header" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                <h1 className="section-title">Featured Companies</h1>
                <Link
                  href="/contact?subject=advertising"
                  className="link-hero-blue"
                  style={{ justifyContent: 'center', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Want to see your company here? View Advertising Options <span className="arrow-icon">›</span>
                </Link>
              </div>
              <div className="relative w-full h-[420px] flex items-center justify-center">
                <div className="w-[90%] h-[380px] bg-[rgba(255,255,255,0.03)] rounded-2xl border border-[rgba(255,215,0,0.2)] animate-pulse flex items-center justify-center">
                  <div className="text-[#64748b]">Loading...</div>
                </div>
              </div>
            </div>
          </section>
        );
      }
      // No featured companies - don't render card stack
      return null;
    }

    return (
      <section className="featured-products-section">
        <MobileCompanyCardStack
          companies={featuredCompanies.slice(0, 15)}
          categories={categories}
        />
      </section>
    );
  };

  // Latest Companies horizontal scroll (both mobile and desktop)
  return (
    <>
      {/* Latest Companies - horizontal scroll (shows first) */}
      <section ref={sectionRef} className="featured-products-section">
        <div className="featured-products-container">
          {/* Header */}
          <div className="featured-products-header">
            <div>
              <h2>Latest Companies</h2>
              <p>Connect with verified suppliers worldwide.</p>
            </div>
            {/* TODO: View All Companies butonu daha sonra açılacaktır
            <Link href="/companies" className="btn-section-action">
              View All Companies →
            </Link>
            */}
          </div>

        {/* Companies Grid with Scroll */}
        <div className="featured-products-grid">
          <div className="dynamic-container">
            {/* Scroll Arrows */}
            <button
              className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
              id="dash-left-companies"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
              id="dash-right-companies"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Companies Container */}
            <div
              id="companies"
              className="tab-content active"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="company-card-link"
                    >
                      <div className="company-card-inner" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-xl bg-[rgba(255,255,255,0.1)] animate-pulse" />
                          <div className="flex-1">
                            <div className="h-5 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2 w-3/4" />
                            <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2 w-5/6" />
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                companies.map((company) => (
                  <CompanyCard key={company.id} company={company} categories={categories} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* Mobile: Featured Companies Card Stack (shows after Latest Companies) - only render when visible */}
      {isVisible && renderMobileCardStack()}
    </>
  );
}

export default CompaniesSection;
