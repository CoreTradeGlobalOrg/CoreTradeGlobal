/**
 * ShowcaseSection — Sponsored Company V3
 *
 * A single premium sponsorship card. One paid slot fills the whole
 * section: sponsor's brand identity + 3 featured products + CTA to the
 * profile. When no sponsored ad is active, a "Book This Spot" placeholder
 * routes to the ad inquiry form.
 *
 * Data flow:
 *   useActiveAd(SPONSORED)  → { userId, showcaseProductIds, ... }
 *   useUserProfile(userId)   → live company info (name/logo/country/…)
 *   useProductsByIds(ids)    → up to 3 product docs (batch, cached)
 *
 * The section id `showcase-section` and outer class `sponsored-section`
 * are both kept: the id is what `page.js` reserves height against, and
 * the outer class is what homepage.css uses to space the neighbours.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { useSponsoredHeroAd } from '@/presentation/hooks/ads/useSponsoredHeroAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { useUserProfile } from '@/presentation/hooks/user/useUserProfile';
import { useProductsByIds } from '@/presentation/hooks/product/useProductsByIds';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import './ShowcaseSection.css';

function getCountryName(code) {
  if (!code) return '';
  const found = COUNTRIES.find((c) => c.value === code);
  if (!found) return code;
  return found.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
}

function initialsOf(name) {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', CNY: '¥',
  AUD: 'A$', CAD: 'C$', CHF: 'CHF', KRW: '₩', INR: '₹',
};

function formatPrice(product) {
  const code = product.currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[code] || code;
  if (!product.price) return 'Negotiable';
  return `${symbol} ${product.price}`;
}

function ArrowRightIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CtaArrow() {
  return (
    <svg
      className="btn-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="placeholder-svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function SectionHeader() {
  return (
    <div className="section-header">
      <h2 className="section-title">Sponsored Company</h2>
      <Link href="/pricing" className="ad-link">
        <span>Want to see your company here? View Advertising Options</span>
        <ArrowRightIcon />
      </Link>
    </div>
  );
}

function MiniProductCard({ product }) {
  return (
    <Link href={`/product/${product.id}`} className="mini-product-card">
      <div className="mini-product-thumb">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} />
        ) : (
          <PlaceholderIcon />
        )}
      </div>
      <div className="mini-product-info">
        <h4 className="mini-product-title">{product.name}</h4>
        <div className="mini-product-price">
          {formatPrice(product)}
          {product.unit && (
            <span className="mini-product-unit">/ {product.unit}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function BookThisSpotCard() {
  return (
    <div className="sponsored-card-v3 is-placeholder">
      <div className="sponsored-placeholder-icon">+</div>
      <h3 className="sponsored-placeholder-title">Your company, front and center.</h3>
      <p className="sponsored-placeholder-subtitle">
        Book the sponsored placement to feature your brand on the homepage,
        the products directory, and every hero card visitors land on.
      </p>
      <Link href="/pricing/inquire?type=sponsored" className="sponsored-placeholder-cta">
        Book This Spot
        <CtaArrow />
      </Link>
    </div>
  );
}

function SponsoredCard({ ad, categories }) {
  const { setRef, trackClick } = useTrackAd(ad.id);
  const { profile } = useUserProfile(ad.userId);

  const productIds = useMemo(() => {
    const showcase = Array.isArray(ad.showcaseProductIds) ? ad.showcaseProductIds : [];
    // If the buyer left showcase blank we auto-fill with the hero + list
    // picks so the mini-grid still renders (see prompt: "eger showcase'e
    // bir sey koymazsa hero ve products'a koydugumuzu showcase'e koyacagiz").
    if (showcase.length > 0) return showcase.slice(0, 3);
    const fallback = [ad.heroProductId, ad.productsListProductId].filter(Boolean);
    return Array.from(new Set(fallback)).slice(0, 3);
  }, [ad.showcaseProductIds, ad.heroProductId, ad.productsListProductId]);

  const productMap = useProductsByIds(productIds);
  const products = productIds
    .map((id) => productMap.get(id))
    .filter((p) => p && p.status !== 'draft');

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[ShowcaseSponsored]', {
      adId: ad?.id,
      userId: ad?.userId,
      productIds,
      productsResolved: products.length,
      mapEntries: Array.from(productMap.entries()).map(([k, v]) => ({ id: k, exists: !!v, name: v?.name, status: v?.status })),
    });
  }

  const companyName = profile?.companyName || ad.companyName || 'Sponsored Company';
  const companyLogo = profile?.companyLogo || profile?.photoURL || ad.companyLogo || null;
  const country = profile?.country || ad.country || '';
  const description =
    profile?.companyDescription
    || profile?.bio
    || ad.description
    || 'Featured supplier — explore their catalog and start a conversation.';

  const categoryEntry = categories?.find((c) => c.value === profile?.companyCategory);
  const categoryName = categoryEntry?.label?.replace(/^[^\s]+\s/, '') || profile?.companyCategory || '';
  const categoryIcon = categoryEntry?.icon || '📦';

  const linkUrl = ad.linkUrl || (ad.userId ? `/profile/${ad.userId}` : '/companies');
  const isExternal = /^https?:\/\//i.test(linkUrl);

  // The outer card is a plain <div>, not a <Link>, because it contains
  // its own set of anchors (mini product cards + View Company button).
  // Nested <a> tags are invalid HTML and cause hydration errors. The
  // ad-impression ref goes on the wrapper so tracking still fires on
  // scroll-into-view; a click on the wrapper (outside a nested link)
  // routes to the sponsored profile via handleCardClick.
  const handleCardClick = (e) => {
    // Let clicks on nested anchors / buttons through untouched.
    if (e.target.closest('a, button')) return;
    trackClick();
    if (isExternal) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(linkUrl);
    }
  };

  return (
    <div
      ref={setRef}
      onClick={handleCardClick}
      className="sponsored-card-v3"
      role="group"
      aria-label={`Sponsored company: ${companyName}`}
    >
      <div className="brand-identity-row">
        <div className="company-logo">
          {companyLogo ? (
            <Image
              src={companyLogo}
              alt={companyName}
              width={76}
              height={76}
              unoptimized
            />
          ) : (
            initialsOf(companyName)
          )}
        </div>
        <div className="brand-meta">
          <h3 className="company-name">{companyName}</h3>
          {country && (
            <div className="company-country">
              <span className="country-flag">
                <CountryFlag countryCode={country} size={14} />
              </span>
              <span className="country-name">{getCountryName(country)}</span>
            </div>
          )}
          {categoryName && (
            <div className="category-badge">
              <span>{categoryIcon}</span>
              <span>{categoryName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="description-box">
        <p className="company-description">{description}</p>
      </div>

      {products.length > 0 && (
        <div className="products-showcase-section">
          <div className="products-header-label">Featured Products from this Supplier</div>
          <div className="mini-products-grid">
            {products.map((product) => (
              <MiniProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      <div className="card-footer">
        <Link
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={trackClick}
          className="btn-view-company"
        >
          <span>View Company</span>
          <CtaArrow />
        </Link>
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  // Same relaxed lookup as the hero: shows active + scheduled-soon
  // sponsored packages so a paid Oct campaign appears late-September
  // instead of leaving the showcase in "Book This Spot" limbo.
  const ad = useSponsoredHeroAd();
  const { categories } = useCategories();

  return (
    <section className="sponsored-section showcase-section" id="showcase-section">
      <div className="ambient-glow" aria-hidden="true" />
      <SectionHeader />
      {ad ? <SponsoredCard ad={ad} categories={categories} /> : <BookThisSpotCard />}
    </section>
  );
}

export default ShowcaseSection;
