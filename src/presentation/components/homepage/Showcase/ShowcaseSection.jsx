/**
 * ShowcaseSection Component (3D Carousel)
 *
 * Featured Companies 3D carousel section
 * Matches design exactly from script.js carousel logic
 */

'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const country = COUNTRIES.find(c => c.value === countryCode);
  if (country) {
    return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

// Default companies data (Fallback) - country is ISO code
const DEFAULT_COMPANIES = [
  { name: 'EuroLogistics', logo: 'EL', country: 'DE', category: 'Logistics & Shipping', rating: 4.9, volume: '€50M+' },
  { name: 'AsiaTech Mfg', logo: 'AT', country: 'CN', category: 'Electronics Mfg', rating: 4.8, volume: '$120M+' },
  { name: 'Nordic Supply', logo: 'NS', country: 'SE', category: 'Raw Materials', rating: 5.0, volume: '€85M+' },
  { name: 'Anatolia Tex', logo: 'AX', country: 'TR', category: 'Textiles & Fabrics', rating: 4.9, volume: '$40M+' },
  { name: 'US Polymers', logo: 'UP', country: 'US', category: 'Chemical Products', rating: 4.7, volume: '$200M+' },
  { name: 'Koto Automotive', logo: 'KA', country: 'JP', category: 'Auto Spare Parts', rating: 4.9, volume: '¥900M+' },
  { name: 'Brasilia Coffee', logo: 'BC', country: 'BR', category: 'Food Exports', rating: 4.6, volume: '$30M+' },
  { name: 'Royal Steel', logo: 'RS', country: 'GB', category: 'Industrial Metals', rating: 4.8, volume: '£60M+' },
];

// Verified icon SVG
const VerifiedIcon = () => (
  <svg className="verified-badge" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

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

  return (
    <Link
      href={company.id ? `/profile/${company.id}` : '#'}
      className={`company-card ${isActive ? 'active' : ''}`}
      style={style}
    >
      <div className="card-inner">
        {/* Card Header */}
        <div className="card-header">
          <div className="logo-box overflow-hidden flex items-center justify-center relative">
            {isLogoUrl ? (
              <CompanyLogoImage src={company.logo} alt={company.name} fallback={company.name?.substring(0, 2).toUpperCase() || 'CO'} />
            ) : (
              company.logo
            )}
          </div>
          <div className="country-flag" title={getCountryName(company.country)}>
            <CountryFlag countryCode={company.country} size={24} />
          </div>
        </div>

        {/* Company Info */}
        <div className="company-info">
          <div className="name-row">
            <h3 className="company-name line-clamp-1">{company.name}</h3>
            <VerifiedIcon />
          </div>
          <div className="company-category">{company.category}</div>
          <div className="rating-box">
            <StarIcon />
            <span>{company.rating}</span>
          </div>

          {/* Metrics */}
          <div className="metrics">
            <div className="metric-item">
              <span className="metric-value">{company.volume}</span>
              <span className="metric-label">Trade Vol.</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">&lt; 24h</span>
              <span className="metric-label">Response</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="card-action">View Profile</div>
      </div>
    </Link>
  );
}

export function ShowcaseSection() {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [loading, setLoading] = useState(true);

  // Carousel state
  const [currentRotation, setCurrentRotation] = useState(0);
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const currentSpeedRef = useRef(0.0012);
  const velocityRef = useRef(0);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, rotation: 0, lastX: 0, lastTime: 0 });

  const radius = 550;
  const totalCards = companies.length; // Use dynamic length
  const angleStep = (2 * Math.PI) / (totalCards || 1); // Avoid division by zero
  const defaultSpeed = 0.0012;
  const slowSpeed = defaultSpeed / 3;

  // Fetch Featured Companies
  useEffect(() => {
    const fetchFeaturedCompanies = async () => {
      try {
        const firestoreDS = container.getFirestoreDataSource();
        // Query users where featured == true
        const featuredUsers = await firestoreDS.query('users', {
          where: [['featured', '==', true]],
          limit: 10
        });

        if (featuredUsers && featuredUsers.length > 0) {
          const mappedCompanies = featuredUsers.map(user => {
            return {
              id: user.id, // Store ID for linking
              name: user.companyName || user.displayName || 'Unknown Company',
              logo: user.companyLogo || user.photoURL || (user.companyName ? user.companyName.substring(0, 2).toUpperCase() : 'CO'),
              country: user.country || '', // ISO code
              category: user.industry || 'Global Trade',
              rating: (4.5 + Math.random() * 0.5).toFixed(1), // Mock rating until we have real ones
              volume: '$10M+' // Mock volume
            };
          });
          setCompanies(mappedCompanies);
        }
      } catch (error) {
        console.error('Error fetching featured companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedCompanies();
  }, []);

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
  const handleMouseLeave = () => handleEnd();

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

  const handleContainerMouseLeave = () => {
    currentSpeedRef.current = defaultSpeed;
  };

  return (
    <section className="showcase-section" id="showcase-section">
      {/* Section Header */}
      <div className="section-header">
        <h1 className="section-title">Featured Companies</h1>
        <Link
          href="#"
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
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Decorative Elements */}
        <div className="spotlight" />
        <div className="platform" />

        {/* Carousel Scene */}
        <div className="carousel-scene" id="carouselScene">
          {companies.map((company, index) => (
            <CompanyCard
              key={`${company.name}-${index}`}
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
