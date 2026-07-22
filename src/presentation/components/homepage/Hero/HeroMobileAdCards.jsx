/**
 * HeroMobileAdCards
 *
 * Mobile-only pair of ad-slot cards that sits directly below the Add
 * Product / Add Request CTA row on the homepage hero. Mirrors the
 * desktop HeroDataCards ad slots — same ad types, same look — so a
 * booked hero placement surfaces on both breakpoints:
 *   • Left  — Featured Product ad (AD_TYPES.FEATURED)
 *   • Right — Hero Section Spotlight ad (AD_TYPES.HERO)
 * When no live ad exists for a slot, a dashed gold "+" placeholder
 * routes to the pricing inquiry form pre-filled with the right tier.
 *
 * Rendering is JS-gated on `window.innerWidth < 768` so the images
 * never mount on desktop. Earlier attempts leaned on a CSS
 * `display: none` — but stray renders (hot-reload, cascade race) let
 * the fill images stretch to fill the nearest positioned ancestor and
 * produced a huge full-width banner on desktop.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useActiveAd } from '@/presentation/hooks/ads/useActiveAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { AD_TYPES } from '@/core/constants/adTypes';

function AdSlot({ ad, placeholder, ariaLabel }) {
  const { setRef, trackClick } = useTrackAd(ad?.id);
  // Only treat this as a real ad when we have the minimum fields to
  // render — otherwise a half-populated Firestore doc would render an
  // empty sponsored card instead of the "Book Spot" placeholder.
  const hasRealAd = !!(ad && ad.id && (ad.companyName || ad.companyLogo));

  if (hasRealAd) {
    return (
      <Link
        ref={setRef}
        onClick={trackClick}
        href={ad.linkUrl || '#'}
        className="hero-mobile-ad-card group"
        aria-label={`Sponsored: ${ad.companyName || placeholder.title}`}
      >
        <div className="hero-mobile-ad-card-media">
          {ad.companyLogo ? (
            <img
              src={ad.companyLogo}
              alt={ad.companyName || 'Sponsored'}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-3xl">✨</span>
          )}
        </div>
        <div className="hero-mobile-ad-card-body">
          <span className="hero-mobile-ad-card-tag">
            {ad.badgeText || placeholder.tag}
          </span>
          <p className="hero-mobile-ad-card-title">{ad.companyName || placeholder.title}</p>
          <span className="hero-mobile-ad-card-cta">Visit →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={placeholder.href}
      className="hero-mobile-ad-card hero-mobile-ad-card-empty"
      aria-label={ariaLabel}
    >
      <div className="hero-mobile-ad-card-plus">+</div>
      <div className="hero-mobile-ad-card-body">
        <span className="hero-mobile-ad-card-tag hero-mobile-ad-card-tag-empty">
          {placeholder.tag}
        </span>
        <p className="hero-mobile-ad-card-title">{placeholder.title}</p>
        <span className="hero-mobile-ad-card-cta">Book Spot →</span>
      </div>
    </Link>
  );
}

export function HeroMobileAdCards() {
  // SSR-safe mobile gate. Start `false` so the server + first paint
  // never emit these cards on desktop (or on unknown viewports). Once
  // mounted we check window.innerWidth and listen for resize so the
  // component appears/disappears at the same 768px breakpoint the CSS
  // uses.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { ad: featuredProductAd } = useActiveAd(AD_TYPES.FEATURED);
  const { ad: heroAd } = useActiveAd(AD_TYPES.HERO);

  if (!isMobile) return null;

  return (
    <div className="hero-mobile-ad-cards">
      <AdSlot
        ad={featuredProductAd}
        ariaLabel="Feature your product here"
        placeholder={{
          tag: 'Featured Product',
          title: 'Your Product Here',
          subtitle: 'Front-page product spotlight',
          href: '/pricing/inquire?type=featured',
        }}
      />
      <AdSlot
        ad={heroAd}
        ariaLabel="Feature your brand in the hero spotlight"
        placeholder={{
          tag: 'Hero Spotlight',
          title: 'Your Brand Here',
          subtitle: 'Front-page hero spotlight',
          href: '/pricing/inquire?type=hero',
        }}
      />
    </div>
  );
}

export default HeroMobileAdCards;
