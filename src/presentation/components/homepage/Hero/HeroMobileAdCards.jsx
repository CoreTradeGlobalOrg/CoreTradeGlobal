/**
 * HeroMobileAdCards
 *
 * Mobile-only pair of ad-slot cards that sits directly below the Add
 * Product / Add Request CTA row on the homepage hero. Two side-by-side
 * cards:
 *   • Left  — Featured Product ad (AD_TYPES.FEATURED)
 *   • Right — Featured Company ad (AD_TYPES.FEATURED_COMPANY)
 * When no live ad exists for a slot, a dashed gold "+" placeholder
 * routes to the pricing inquiry form pre-filled with the right tier.
 * Desktop hides the whole block via CSS (.hero-mobile-ad-cards @media).
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useActiveAd } from '@/presentation/hooks/ads/useActiveAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { AD_TYPES } from '@/core/constants/adTypes';

function AdSlot({ ad, placeholder, ariaLabel }) {
  const { setRef, trackClick } = useTrackAd(ad?.id);

  if (ad) {
    return (
      <Link
        ref={setRef}
        onClick={trackClick}
        href={ad.linkUrl || '#'}
        target={/^https?:\/\//i.test(ad.linkUrl || '') ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="hero-mobile-ad-card group"
        aria-label={`Sponsored: ${ad.companyName || placeholder.title}`}
      >
        <div className="hero-mobile-ad-card-media">
          {ad.companyLogo ? (
            <Image
              src={ad.companyLogo}
              alt={ad.companyName || 'Sponsored'}
              fill
              sizes="(max-width: 768px) 50vw, 200px"
              className="object-cover"
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
  const { ad: featuredProductAd } = useActiveAd(AD_TYPES.FEATURED);
  const { ad: featuredCompanyAd } = useActiveAd(AD_TYPES.FEATURED_COMPANY);

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
        ad={featuredCompanyAd}
        ariaLabel="Feature your company here"
        placeholder={{
          tag: 'Featured Company',
          title: 'Your Company Here',
          subtitle: 'Front-page brand spotlight',
          href: '/pricing/inquire?type=featured_company',
        }}
      />
    </div>
  );
}

export default HeroMobileAdCards;
