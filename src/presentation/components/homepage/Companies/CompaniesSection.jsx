/**
 * CompaniesSection Component
 *
 * Homepage section displaying trusted companies
 * Horizontal scroll with arrows, matching product/RFQ card styling
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Default companies for initial display (country = ISO code)
const DEFAULT_COMPANIES = [
  { id: '1', companyName: 'EuroLogistics GmbH', country: 'DE', industry: 'Logistics' },
  { id: '2', companyName: 'Ankara Marble Export', country: 'TR', industry: 'Construction' },
  { id: '3', companyName: 'Shanghai Silk Co.', country: 'CN', industry: 'Textile' },
  { id: '4', companyName: 'Tuscany Olive Oils', country: 'IT', industry: 'Food & Beverage' },
  { id: '5', companyName: 'Seoul Solar Tech', country: 'KR', industry: 'Energy' },
  { id: '6', companyName: 'Valencia Ceramics', country: 'ES', industry: 'Construction' },
  { id: '7', companyName: 'Kyiv Steel Works', country: 'UA', industry: 'Industrial' },
  { id: '8', companyName: 'Mumbai Textiles', country: 'IN', industry: 'Textile' },
];

// Get abbreviation from company name
const getAbbreviation = (name) => {
  if (!name) return '??';
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
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

function CompanyCard({ company }) {
  const [imgError, setImgError] = useState(false);
  const profileImage = company.companyLogo || company.photoURL;
  const hasImage = profileImage && !imgError;

  return (
    <Link href={`/profile/${company.id}`} className="product-card block no-underline text-inherit hover:no-underline">
      {/* Company Logo/Photo Area */}
      <div className="product-card-image relative flex items-center justify-center">
        {hasImage ? (
          <img
            src={profileImage}
            alt={company.companyName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-5xl font-extrabold text-[var(--accent-gold)]" style={{ textShadow: '0 2px 10px rgba(255, 215, 0, 0.3)' }}>
            {getAbbreviation(company.companyName)}
          </div>
        )}
      </div>

      {/* Company Content */}
      <div className="product-card-content">
        <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-grey)]">
          <CountryFlag countryCode={company.country} size={16} />
          <span>{getCountryName(company.country)}</span>
        </div>

        <h3 className="product-card-name">{company.companyName}</h3>

        <p className="product-card-description">
          {company.industry || 'Member'}
        </p>

        {company.emailVerified && company.adminApproved && (
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)] px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider">
              ✓ Verified
            </span>
          </div>
        )}

        <div className="w-full">
          <div className="product-card-btn w-full mt-3 text-center">View Profile</div>
        </div>
      </div>
    </Link>
  );
}

export function CompaniesSection() {
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const firestoreDS = container.getFirestoreDataSource();
        const allUsers = await firestoreDS.query('users', { limit: 50 });

        if (allUsers && allUsers.length > 0) {
          // Filter: must have company name and not suspended
          const validCompanies = allUsers.filter(u =>
            u.companyName &&
            !u.isSuspended
          );

          const sorted = validCompanies.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });

          if (sorted.length > 0) {
            setCompanies(sorted.slice(0, 12));
          }
          // If no companies found, keep showing default companies
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
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
    <section className="featured-products-section">
      <div className="featured-products-container">
        {/* Header */}
        <div className="featured-products-header">
          <div>
            <h2>Trusted Companies</h2>
            <p>Connect with verified suppliers worldwide.</p>
          </div>
          <Link href="/companies" className="btn-section-action">
            View All Companies →
          </Link>
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
                      className="product-card"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="product-card-image animate-pulse" />
                      <div className="product-card-content">
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3" />
                        <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                companies.map((company) => (
                  <CompanyCard key={company.id} company={company} />
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
