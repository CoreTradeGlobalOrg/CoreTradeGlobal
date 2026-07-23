/**
 * ShowcaseSection Component (3D Carousel)
 *
 * Featured Companies 3D carousel section
 * Matches design exactly from script.js carousel logic
 */

'use client';

import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { useActiveAds } from '@/presentation/hooks/ads/useActiveAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { AD_TYPES } from '@/core/constants/adTypes';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const country = COUNTRIES.find(c => c.value === countryCode);
  if (country) {
    return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

// Baseline placeholder cards that fill the carousel when there aren't
// enough active Carousel-tier ads. Each one links to the ad inquiry
// form so a click on an empty slot becomes a sales lead. Kept
// identical (per product owner's spec — A1) so all four read as
// "reserved for you" spots rather than fake brands.
const PLACEHOLDER_COUNT = 4;
const PLACEHOLDER_CARDS = Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
  id: `placeholder-${i}`,
  isPlaceholder: true,
  name: 'Your Brand Here',
  logo: '+',
  country: '',
  category: 'Available',
  description: 'Book this spot to feature your company in the carousel.',
  linkUrl: '/advertising',
}));

// Company logo image with loading state
const CompanyLogoImage = memo(function CompanyLogoImage({ src, alt, fallback }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return <span className="text-lg font-bold">{fallback}</span>;
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B]">
          <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        width={320}
        height={400}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </>
  );
});

// Star icon SVG
const StarIcon = () => (
  <svg className="star-icon" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

function CompanyCard({ company, isActive, style }) {
  // Check if logo is a URL
  const isLogoUrl = company.logo && (company.logo.startsWith('http') || company.logo.startsWith('/'));

  // Sponsored slots point at their configured linkUrl (external URL or
  // internal path); organic cards keep the existing /profile behavior;
  // placeholders route to the ad inquiry form.
  const isSponsored = !!company.isSponsored;
  const isPlaceholder = !!company.isPlaceholder;
  const href = isPlaceholder
    ? (company.linkUrl || '/advertising')
    : isSponsored
      ? (company.linkUrl || '#')
      : (company.id ? `/profile/${company.id}` : '#');
  const isExternal = isSponsored && /^https?:\/\//i.test(company.linkUrl || '');

  const { setRef: setAdRef, trackClick } = useTrackAd(company.sponsoredAdId);

  // Sponsored outline must land on `.card-inner` (which owns the 24px
  // border-radius) — the outer `.company-card` wrapper has no radius,
  // so a box-shadow there renders as a hard rectangle around the
  // rounded card. Same for the drop shadow.
  const sponsoredInnerStyle = isSponsored
    ? {
        border: '2px solid rgba(255,215,0,0.6)',
        boxShadow:
          '0 0 0 1px rgba(255,215,0,0.35), 0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255,215,0,0.18)',
      }
    : {};
  // Placeholders get a dashed gold outline + subtle gold tint so they
  // read as "book this slot" rather than an organic company card.
  const placeholderInnerStyle = isPlaceholder
    ? {
        border: '2px dashed rgba(255,215,0,0.55)',
        background: 'linear-gradient(180deg, rgba(255,215,0,0.05), rgba(15,27,43,0.85))',
      }
    : {};

  return (
    <Link
      ref={isSponsored ? setAdRef : undefined}
      onClick={isSponsored ? trackClick : undefined}
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`company-card ${isActive ? 'active' : ''}`}
      style={style}
    >
      <div className="card-inner" style={{ position: 'relative', ...sponsoredInnerStyle, ...placeholderInnerStyle }}>
        {isSponsored && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background: '#FFD700',
              color: '#0F1B2B',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {company.badgeText || 'Sponsored'}
          </span>
        )}
        {isPlaceholder && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(255,215,0,0.15)',
              color: '#FFD700',
              border: '1px dashed rgba(255,215,0,0.55)',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Available
          </span>
        )}
        {/* Card Header */}
        <div className="card-header">
          <div
            className="logo-box overflow-hidden flex items-center justify-center relative"
            style={isPlaceholder ? { color: '#FFD700', fontSize: '48px', fontWeight: 800 } : undefined}
          >
            {isLogoUrl ? (
              <CompanyLogoImage src={company.logo} alt={company.name} fallback={company.name?.substring(0, 2).toUpperCase() || 'CO'} />
            ) : (
              company.logo
            )}
          </div>
          {!isSponsored && !isPlaceholder && (
            <div className="country-flag" title={getCountryName(company.country)}>
              <CountryFlag countryCode={company.country} size={24} />
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="company-info">
          <div className="name-row">
            <h3 className="company-name">{company.name}</h3>
          </div>
          {company.category && company.category !== 'Global Trade' && (
            <div className="company-category">{company.category}</div>
          )}
          {company.description && (
            <p className="company-description">
              {company.description}
            </p>
          )}

          {/* CTA — Book This Spot on placeholders, Visit on sponsored,
              View Profile on organic (though organic no longer renders). */}
          <button className="card-profile-btn">
            {isPlaceholder ? 'Book This Spot' : isSponsored ? 'Visit' : 'View Profile'}
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ShowcaseSection() {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // Up to 8 Carousel-tier ads share the same week (matches the admin
  // form's OVERLAP_CAP_BY_TYPE cap). The carousel is admin-curated
  // only — no organic company fallback. When fewer than 4 real ads
  // are active, the deck is topped up with "Your Brand Here"
  // placeholders so the carousel never looks empty.
  const { ads: carouselAds } = useActiveAds(AD_TYPES.CAROUSEL, { limit: 8 });

  // Carousel state
  const [currentRotation, setCurrentRotation] = useState(0);
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const currentSpeedRef = useRef(0.002);
  const velocityRef = useRef(0);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, rotation: 0, lastX: 0, lastTime: 0 });

  const radius = 550;
  const displayCompanies = useMemo(() => {
    // Real Carousel-tier ads mapped to the card contract used by the
    // 3D render loop / transform helpers.
    const sponsored = (carouselAds || []).map((ad) => ({
      id: `ad:${ad.id}`,
      sponsoredAdId: ad.id,
      isSponsored: true,
      badgeText: ad.badgeText || 'Sponsored',
      linkUrl: ad.linkUrl || null,
      name: ad.companyName || 'Sponsored',
      logo: ad.companyLogo || (ad.companyName || 'AD').substring(0, 2).toUpperCase(),
      country: '',
      category: 'Sponsored',
      description: ad.description || '',
    }));
    // Top up with identical placeholders so the deck always has at
    // least PLACEHOLDER_COUNT (4) cards. Once real ads reach or
    // exceed that count, placeholders drop out entirely.
    const placeholderFill = Math.max(0, PLACEHOLDER_COUNT - sponsored.length);
    const placeholders = PLACEHOLDER_CARDS.slice(0, placeholderFill);
    return [...sponsored, ...placeholders];
  }, [carouselAds]);
  const totalCards = displayCompanies.length; // Use dynamic length
  const angleStep = (2 * Math.PI) / (totalCards || 1); // Avoid division by zero
  const defaultSpeed = 0.002;
  const slowSpeed = 0.001;

  // Calculate card style based on rotation
  const getCardStyle = useCallback((index) => {
    const angle = angleStep * index + currentRotationRef.current;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const normalizedZ = Math.cos(angle);
    const opacity = (normalizedZ + 1.5) / 2.5;

    return {
      transform: `translate3d(${x}px, 0, ${z}px) rotateY(${-angle}rad)`,
      opacity: normalizedZ > 0.95 ? 1 : opacity,
      zIndex: Math.round(z + radius),
    };
  }, [angleStep, radius]);

  // Check if card is active (front-facing)
  const isCardActive = useCallback((index) => {
    const angle = angleStep * index + currentRotationRef.current;
    const normalizedZ = Math.cos(angle);
    return normalizedZ > 0.95;
  }, [angleStep]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!isDragging) {
        targetRotationRef.current += currentSpeedRef.current;

        if (Math.abs(velocityRef.current) > 0.0001) {
          targetRotationRef.current += velocityRef.current * 0.5;
          velocityRef.current *= 0.95;
        } else {
          velocityRef.current = 0;
        }

        currentRotationRef.current += (targetRotationRef.current - currentRotationRef.current) * 0.05;
      }

      setCurrentRotation(currentRotationRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging]);

  // Mouse/Touch handlers
  const handleStart = useCallback((clientX) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      rotation: currentRotationRef.current,
      lastX: clientX,
      lastTime: Date.now(),
    };
    targetRotationRef.current = currentRotationRef.current;
    velocityRef.current = 0;
  }, []);

  const handleMove = useCallback((clientX) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = clientX - dragStartRef.current.x;
    currentRotationRef.current = dragStartRef.current.rotation + (deltaX / containerRef.current.offsetWidth) * Math.PI * 2;
    targetRotationRef.current = currentRotationRef.current;

    const currentTime = Date.now();
    const timeDelta = currentTime - dragStartRef.current.lastTime;
    if (timeDelta > 0) {
      velocityRef.current = (clientX - dragStartRef.current.lastX) / timeDelta;
    }
    dragStartRef.current.lastX = clientX;
    dragStartRef.current.lastTime = currentTime;
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    velocityRef.current *= 0.5;
  }, [isDragging]);

  // Mouse events
  const handleMouseDown = (e) => handleStart(e.clientX);
  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      handleMove(e.clientX);
    }
  };
  const handleMouseUp = () => handleEnd();
  const handleMouseLeave = () => {
    handleEnd();
    currentSpeedRef.current = defaultSpeed;
  };

  // Touch events
  const handleTouchStart = (e) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e) => {
    if (isDragging) {
      handleMove(e.touches[0].clientX);
    }
  };
  const handleTouchEnd = () => handleEnd();

  // Speed control on hover
  const handleMouseEnter = () => {
    currentSpeedRef.current = slowSpeed;
  };

  // Section is never empty — placeholders fill in when there aren't
  // enough Carousel ads (guaranteed >= PLACEHOLDER_COUNT cards).

  return (
    <section className="showcase-section" id="showcase-section">
      {/* Section Header */}
      <div className="section-header">
        <h2 className="section-title">Featured Companies</h2>
        <Link
          href="/advertising"
          className="link-hero-blue"
          style={{ justifyContent: 'center', marginTop: '10px', color: '#0066FF' }}
        >
          Want to see your company here? View Advertising Options <span className="arrow-icon">›</span>
        </Link>
      </div>

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="carousel-container"
        id="carouselContainer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', marginTop: '30px' }}
      >
        {/* Decorative Elements */}
        <div className="spotlight" />
        <div className="platform" />

        {/* Carousel Scene */}
        <div className="carousel-scene" id="carouselScene">
          {displayCompanies.map((company, index) => (
            <CompanyCard
              key={`${company.id || company.name}-${index}`}
              company={company}
              isActive={isCardActive(index)}
              style={getCardStyle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ShowcaseSection;
