/**
 * MobileCompanyCardStack Component
 *
 * Tinder-style swipeable card stack for mobile Featured Companies section
 * Uses framer-motion for smooth animations
 */

'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';

// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get abbreviation from company name
const getAbbreviation = (name) => {
  if (!name) return '??';
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Truncate text
const truncateText = (text, maxLength = 150) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const found = COUNTRIES.find(c => c.value === countryCode);
  if (found) {
    return found.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

// Single swipeable card component
const SwipeableCard = memo(({
  company,
  categories,
  onSwipe,
  isTop,
  stackIndex,
  totalVisible
}) => {
  const [imgError, setImgError] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-20, 0, 20]);
  const scale = useTransform(x, [-300, 0, 300], [0.95, 1, 0.95]);

  const profileImage = company.companyLogo || company.photoURL;
  const hasImage = profileImage && !imgError;

  // Resolve category
  const category = categories?.find(c => c.value === company.companyCategory);
  const categoryName = category?.label?.replace(/^[^\s]+\s/, '') || company.companyCategory || company.industry || '';

  const handleDragEnd = useCallback((_, info) => {
    const threshold = 60;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Check if swipe was strong enough (by distance or velocity)
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 400) {
      const direction = offset > 0 ? 'right' : 'left';
      const targetX = direction === 'right' ? 400 : -400;

      // Immediately trigger swipe, animate card out
      onSwipe(direction);
      animate(x, targetX, {
        duration: 0.15,
        ease: 'easeOut',
      });
    } else {
      // Snap back smoothly
      animate(x, 0, {
        duration: 0.1,
        ease: 'easeOut'
      });
    }
  }, [onSwipe, x]);

  // Background cards (non-interactive) - smooth transition when moving up
  if (!isTop) {
    const offset = stackIndex;
    const cardScale = 1 - offset * 0.04;
    const yOffset = offset * 12;
    const rotation = offset * 2;
    const cardOpacity = 1 - offset * 0.15;

    return (
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{
          y: yOffset,
          scale: cardScale,
          rotate: rotation,
          opacity: cardOpacity,
        }}
        transition={{
          duration: 0.2,
          ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth feel
        }}
        style={{
          zIndex: totalVisible - stackIndex,
          pointerEvents: 'none',
        }}
      >
        <div className="mobile-stack-card">
          {/* Simplified content for background cards */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,215,0,0.3)]" />
          <div className="h-6 bg-[rgba(255,255,255,0.08)] rounded mx-auto w-3/4 mb-3" />
          <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded mx-auto w-full mb-2" />
          <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded mx-auto w-5/6" />
        </div>
      </motion.div>
    );
  }

  // Top interactive card
  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
      style={{ x, rotate, scale, zIndex: totalVisible + 1 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ scale: 0.96, opacity: 0.8, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: x.get() > 0 ? 200 : -200, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="mobile-stack-card h-full">
        {/* Company Logo */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,215,0,0.4)] flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img
              src={profileImage}
              alt={company.companyName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-2xl font-extrabold text-[#FFD700]">
              {getAbbreviation(company.companyName)}
            </span>
          )}
        </div>

        {/* Company Name + Flag */}
        <div className="text-center mb-3">
          <h3 className="text-xl font-bold text-white mb-1 flex items-center justify-center gap-2">
            {company.companyName}
            <CountryFlag countryCode={company.country} size={18} />
          </h3>
          {categoryName && (
            <span className="text-xs text-[#FFD700] font-semibold uppercase tracking-wider">
              {categoryName}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-[#94a3b8] text-center leading-relaxed mb-5 px-2 min-h-[60px]">
          {truncateText(company.about, 150) || `${company.companyName} - Verified supplier from ${getCountryName(company.country)}`}
        </p>

        {/* Verified Badge */}
        {company.emailVerified && company.adminApproved && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1 bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)] px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
              ✓ Verified Company
            </span>
          </div>
        )}

        {/* View Profile Button - Dark/Black style */}
        <Link
          href={`/profile/${company.id}`}
          className="block w-full py-3.5 bg-[#0F1B2B] border border-[rgba(255,215,0,0.4)] text-[#FFD700] font-bold rounded-full text-center text-base shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:bg-[#1a283b] hover:border-[#FFD700] transition-all duration-200"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          View Profile
        </Link>
      </div>
    </motion.div>
  );
});
SwipeableCard.displayName = 'SwipeableCard';

export function MobileCompanyCardStack({ companies: initialCompanies, categories }) {
  // Shuffle companies on mount for random starting order
  const [shuffledCompanies, setShuffledCompanies] = useState(() => shuffleArray(initialCompanies));
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCards = 3;

  // Re-shuffle when initial companies change
  useEffect(() => {
    setShuffledCompanies(shuffleArray(initialCompanies));
    setCurrentIndex(0);
  }, [initialCompanies]);

  const handleSwipe = useCallback((direction) => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      // Auto shuffle when reaching the end
      if (next >= shuffledCompanies.length) {
        setTimeout(() => {
          setShuffledCompanies(shuffleArray(initialCompanies));
          setCurrentIndex(0);
        }, 300);
      }
      return next;
    });
  }, [shuffledCompanies.length, initialCompanies]);

  const remaining = shuffledCompanies.length - currentIndex;

  // Get visible companies for the stack
  const visibleCompanies = shuffledCompanies.slice(currentIndex, currentIndex + visibleCards);

  return (
    <div className="mobile-card-stack-container">
      {/* Header - matching ShowcaseSection style */}
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

      {/* Card Stack */}
      <div className="relative w-full h-[420px] mb-6">
        <AnimatePresence mode="popLayout">
          {visibleCompanies.map((company, index) => (
            <SwipeableCard
              key={`${company.id}-${currentIndex}`}
              company={company}
              categories={categories}
              onSwipe={handleSwipe}
              isTop={index === 0}
              stackIndex={index}
              totalVisible={visibleCards}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Swipe Hints */}
      <div className="flex justify-between items-center px-4 text-xs text-[#64748b] uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Swipe Left
        </span>
        <span className="text-[#FFD700] font-medium">
          {remaining > 0 ? remaining : shuffledCompanies.length} / {shuffledCompanies.length}
        </span>
        <span className="flex items-center gap-1">
          Swipe Right
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}

export default MobileCompanyCardStack;
