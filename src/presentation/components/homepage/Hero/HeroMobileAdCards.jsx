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

import Link from 'next/link';
import { useMemo } from 'react';
import { useActiveAd } from '@/presentation/hooks/ads/useActiveAd';
import { useSponsoredHeroAd } from '@/presentation/hooks/ads/useSponsoredHeroAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { useProductsByIds } from '@/presentation/hooks/product/useProductsByIds';
import { useUserProfile } from '@/presentation/hooks/user/useUserProfile';
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
  // Desktop hiding is done purely via CSS (`.hero-mobile-ad-cards`
  // is `display: none` by default and only flips to `display: grid`
  // inside `@media (max-width: 768px)` in globals.css). The previous
  // `if (!isMobile) return null` JS gate meant SSR emitted nothing
  // here and the ~157 px grid only appeared after client mount —
  // on throttled-mobile PageSpeed runs the delayed mount pushed the
  // whole HeroStats + HeroDataCards + everything-below cluster down
  // by 157 px, accounting for ~0.2 CLS on top of the 0.05 baseline
  // this page otherwise measures. Rendering the container in SSR
  // reserves the slot from first paint.
  // Unified SPONSORED wins over per-slot legacy ads. Same resolution
  // as the desktop hero: use useSponsoredHeroAd (which also surfaces
  // scheduled campaigns starting in the next 45 days), then resolve
  // the product image + company logo from live docs so the mobile card
  // doesn't render the ✨ fallback when the ad doc itself lacks a
  // companyLogo (SPONSORED ads store nothing there — user profile is
  // the source of truth).
  const sponsoredAd = useSponsoredHeroAd();
  const { ad: legacyFeatured } = useActiveAd(AD_TYPES.FEATURED);
  const { ad: legacyHero } = useActiveAd(AD_TYPES.HERO);

  const sponsoredProductMap = useProductsByIds(sponsoredAd?.heroProductId ? [sponsoredAd.heroProductId] : []);
  const sponsoredHeroProduct = sponsoredAd?.heroProductId ? sponsoredProductMap.get(sponsoredAd.heroProductId) : null;
  const { profile: sponsoredCompany } = useUserProfile(sponsoredAd?.userId);

  const productSlotAd = useMemo(() => {
    if (sponsoredAd) {
      if (!sponsoredHeroProduct && !sponsoredCompany) return null;
      return {
        id: sponsoredAd.id,
        linkUrl: sponsoredHeroProduct ? `/product/${sponsoredHeroProduct.id}` : (sponsoredCompany ? `/profile/${sponsoredCompany.id}` : '#'),
        companyName: sponsoredHeroProduct?.name || sponsoredCompany?.companyName || sponsoredCompany?.displayName,
        companyLogo: sponsoredHeroProduct?.images?.[0] || sponsoredCompany?.companyLogo || sponsoredCompany?.photoURL || null,
        badgeText: sponsoredAd.badgeText || 'Featured Product',
      };
    }
    return legacyFeatured;
  }, [sponsoredAd, sponsoredHeroProduct, sponsoredCompany, legacyFeatured]);

  const heroSlotAd = useMemo(() => {
    if (sponsoredAd) {
      if (!sponsoredCompany) return null;
      return {
        id: sponsoredAd.id,
        linkUrl: `/profile/${sponsoredCompany.id}`,
        companyName: sponsoredCompany.companyName || sponsoredCompany.displayName || 'Sponsored',
        companyLogo: sponsoredCompany.companyLogo || sponsoredCompany.photoURL || null,
        badgeText: sponsoredAd.badgeText || 'Sponsored',
      };
    }
    return legacyHero;
  }, [sponsoredAd, sponsoredCompany, legacyHero]);

  const featuredProductAd = productSlotAd;
  const heroAd = heroSlotAd;

  return (
    <div className="hero-mobile-ad-cards">
      <AdSlot
        ad={featuredProductAd}
        ariaLabel="Feature your product here"
        placeholder={{
          tag: 'Featured Product',
          title: 'Your Product Here',
          subtitle: 'Front-page product spotlight',
          href: '/pricing/inquire?type=sponsored',
        }}
      />
      <AdSlot
        ad={heroAd}
        ariaLabel="Feature your brand in the hero spotlight"
        placeholder={{
          tag: 'Hero Spotlight',
          title: 'Your Brand Here',
          subtitle: 'Front-page hero spotlight',
          href: '/pricing/inquire?type=sponsored',
        }}
      />
    </div>
  );
}

export default HeroMobileAdCards;
