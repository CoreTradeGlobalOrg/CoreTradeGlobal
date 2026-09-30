/**
 * CompaniesSection Component
 *
 * Homepage section displaying trusted companies
 * Horizontal scroll with arrows on both mobile and desktop
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { container } from '@/core/di/container';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useResponsiveLimit, useScrollLoadMore } from '@/presentation/hooks/useResponsiveLimit';


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
      <div
        className={
          company.role === 'logistics_provider'
            ? 'company-card-inner company-card-inner--logistics'
            : 'company-card-inner'
        }
      >
        {/* Header: Logo + Info */}
        <div className="flex items-start gap-4 mb-4">
          {/* Logo */}
          <div className="relative w-16 h-16 rounded-xl flex-shrink-0 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden">
            {hasImage ? (
              <Image
                src={profileImage}
                alt={company.companyName}
                fill
                sizes="64px"
                className="object-cover"
                onError={() => setImgError(true)}
                unoptimized
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
                    <img src={categoryIcon} alt="" width={16} height={16} className="w-4 h-4 object-contain" />
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
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);
  const sectionRef = useRef(null);
  const { categories } = useCategories();

  // Responsive limits with lazy loading: mobile 4, tablet 8, desktop 12, max 30
  const { displayCount, isReady, loadMore, hasMore } = useResponsiveLimit({
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

        // Fetch latest companies, ordered by creation date (newest first)
        const allUsers = await firestoreDS.query('users', {
          orderBy: [['createdAt', 'desc']],
          limit: 35,
        });

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

  return (
    <section ref={sectionRef} className="featured-products-section">
      <div className="featured-products-container">
        {/* Header */}
        <div className="featured-products-header">
          <div>
            <h2 style={{ paddingTop: '20px' }}>Latest Companies</h2>
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
          <div className="dynamic-container select-none">
            {/* Scroll Arrows */}
            <button
              className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
              id="dash-left-companies"
              onClick={() => scroll('left')}
              aria-label="Scroll companies left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
              id="dash-right-companies"
              onClick={() => scroll('right')}
              aria-label="Scroll companies right"
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
  );
}

export default CompaniesSection;
