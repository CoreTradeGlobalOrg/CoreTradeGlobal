/**
 * HeroDataCards Component
 *
 * Floating left and right info cards in the hero section.
 * Shows latest product, RFQ, fair, and supplier when fetchData=true.
 * Shows static links to browse pages when fetchData=false.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';
import { useActiveAd } from '@/presentation/hooks/ads/useActiveAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { AD_TYPES } from '@/core/constants/adTypes';
import { getUnitByCode, getUnitName, getUnitNamePluralized } from '@/core/constants/units';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const country = COUNTRIES.find(c => c.value === countryCode);
  if (country) {
    return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

// Map currency codes to symbols
const CURRENCY_SYMBOLS = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'TRY': '₺', 'JPY': '¥', 'CNY': '¥',
  'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'SEK': 'kr', 'NZD': 'NZ$',
  'SGD': 'S$', 'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'MXN': '$',
  'INR': '₹', 'RUB': '₽', 'BRL': 'R$', 'ZAR': 'R'
};

const gradientTextStyle = {
  background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const formatDate = (date) => {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Build country name → code lookup for fair location parsing
const COUNTRY_NAME_TO_CODE = {};
COUNTRIES.forEach(c => { COUNTRY_NAME_TO_CODE[c.label.toLowerCase()] = c.value; });
const ALIASES = {
  'uae': 'AE', 'u.a.e': 'AE', 'emirates': 'AE',
  'uk': 'GB', 'england': 'GB', 'britain': 'GB',
  'usa': 'US', 'america': 'US',
  'holland': 'NL', 'the netherlands': 'NL', 'netherland': 'NL',
  'south korea': 'KR', 'korea': 'KR',
  'czech republic': 'CZ', 'czechia': 'CZ',
  'türkiye': 'TR', 'turkiye': 'TR',
};
Object.entries(ALIASES).forEach(([k, v]) => { COUNTRY_NAME_TO_CODE[k] = v; });

function getCountryCodeFromLocation(location) {
  if (!location) return null;
  const parts = location.split(/[,–—\-]/).map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const code = COUNTRY_NAME_TO_CODE[parts[i].toLowerCase()];
    if (code) return code;
  }
  return null;
}

/**
 * Skeleton shimmer bar — used as placeholder while data loads.
 */
function Shimmer({ width = '100%', height = '14px', className = '' }) {
  return (
    <span
      className={`inline-block rounded animate-pulse ${className}`}
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

/**
 * @param {Object} props
 * @param {boolean} props.fetchData - Whether live data is being displayed
 * @param {boolean} props.dataLoading - Whether data is currently being fetched
 * @param {Object|null} props.latestProduct
 * @param {Object|null} props.latestRequest
 * @param {Object|null} props.latestFair
 * @param {Object|null} props.latestSupplier
 */
export function HeroDataCards({ fetchData, dataLoading, latestProduct, latestRequest, latestFair, latestSupplier }) {
  // Show skeleton when fetchData is enabled but data hasn't arrived yet
  const showSkeleton = fetchData && dataLoading;
  // Optional paid slot — when a hero ad is currently active, it takes
  // over the fourth card. Falls back to the "Advertise Here" placeholder
  // when no ad is live.
  const { ad: heroAd } = useActiveAd(AD_TYPES.HERO);
  const { setRef: setHeroAdRef, trackClick: trackHeroAdClick } = useTrackAd(heroAd?.id);
  // Featured Product slot in the top-left hero corner. Falls back to
  // a dashed "Spot Here" placeholder that routes to the pricing inquiry
  // form pre-selected with the featured product tier.
  const { ad: productAd } = useActiveAd(AD_TYPES.FEATURED);
  const { setRef: setProductAdRef, trackClick: trackProductAdClick } = useTrackAd(productAd?.id);
  return (
    <>
      {/* Left Side Info Cards */}
      <div className="hero-left-cards">
        {/* Featured Product slot (replaces the old Latest Product card).
            Ad live → renders the sponsored card, no ad → dashed "Spot
            Here" placeholder that opens the inquiry form. */}
        {productAd ? (
          <Link
            ref={setProductAdRef}
            onClick={trackProductAdClick}
            href={productAd.linkUrl || '#'}
            target={/^https?:\/\//i.test(productAd.linkUrl || '') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="hero-info-card hero-product-card hero-ad-slot-card"
            aria-label={`Sponsored: ${productAd.companyName}`}
          >
            <div className="card-icon" style={{ position: 'relative', overflow: 'hidden' }}>
              {productAd.companyLogo ? (
                <Image
                  src={productAd.companyLogo}
                  alt={productAd.companyName || 'Sponsored'}
                  fill
                  sizes="48px"
                  className="object-cover rounded"
                />
              ) : (
                <span style={{ fontSize: '24px' }}>✨</span>
              )}
            </div>
            <div className="card-content">
              <h3 style={{ color: '#FFD700' }}>{productAd.badgeText || 'Featured Product'}</h3>
              <p className="card-product-name">{productAd.companyName}</p>
              <p className="card-specs" style={{ color: '#ffffff' }}>
                {productAd.description}
              </p>
              <p className="card-price" style={{ color: '#FFD700' }}>Visit →</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/pricing/inquire?type=featured"
            className="hero-info-card hero-product-card hero-ad-slot-card"
            aria-label="Feature your product here — inquire about the Featured Product placement"
          >
            <div className="card-icon" style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(253,185,49,0.06))',
              border: '1px dashed rgba(255,215,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFD700',
              fontSize: '24px',
              fontWeight: 800,
            }}>
              +
            </div>
            <div className="card-content">
              <h3 style={{ color: '#FFD700' }}>Spot Here</h3>
              <p className="card-product-name">Your Product Here</p>
              <p className="card-specs" style={{ color: '#ffffff' }}>
                Front-page product spotlight
              </p>
              <p className="card-price" style={{ color: '#FFD700' }}>Book Spot →</p>
            </div>
          </Link>
        )}

        {/* RFQ Card */}
        <Link href={fetchData && latestRequest ? `/request/${latestRequest.id}` : '/requests'} className="hero-info-card hero-rfq-card">
          <div className="card-icon">{showSkeleton ? <Shimmer width="32px" height="32px" className="rounded" /> : '📋'}</div>
          <div className="card-content">
            <h3>{fetchData ? 'Latest RFQ' : 'RFQs'}</h3>
            {showSkeleton ? (
              <>
                <p className="card-product-name"><Shimmer width="75%" /></p>
                <p className="card-specs"><Shimmer width="55%" /></p>
                <p className="card-budget"><Shimmer width="40%" /></p>
              </>
            ) : (
              <>
                <p className="card-product-name">
                  {fetchData && latestRequest ? (latestRequest.productName || latestRequest.title) : 'Active Requests'}
                </p>
                <p
                  className="card-specs"
                  style={{
                    ...gradientTextStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {fetchData && latestRequest ? (
                    <>
                      {latestRequest.targetCountry && <CountryFlag countryCode={latestRequest.targetCountry} size={14} />}
                      <span>Qty: {latestRequest.quantity || '-'} {latestRequest.unit && (getUnitByCode(latestRequest.unit) ? getUnitNamePluralized(latestRequest.quantity, latestRequest.unit) : latestRequest.unit)}</span>
                    </>
                  ) : 'Find business opportunities'}
                </p>
                <p className="card-budget">{fetchData ? 'Check Details ▼' : 'View All →'}</p>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Right Side Info Cards */}
      <div className="hero-right-cards">
        {/* Fair Card */}
        <Link href={fetchData && latestFair ? `/fair/${latestFair.id}` : '/fairs'} className="hero-info-card hero-fair-card">
          <div className={`card-icon overflow-hidden relative ${fetchData && latestFair && (latestFair.country || getCountryCodeFromLocation(latestFair.location)) ? 'has-flag' : ''}`}>
            {showSkeleton ? (
              <Shimmer width="40px" height="30px" className="rounded-sm" />
            ) : fetchData && latestFair && (latestFair.country || getCountryCodeFromLocation(latestFair.location)) ? (
              <>
                <img
                  src={`https://flagcdn.com/w160/${(latestFair.country || getCountryCodeFromLocation(latestFair.location)).toLowerCase()}.png`}
                  alt=""
                  width={40}
                  height={30}
                  className="absolute inset-0 w-full h-full object-cover blur-md scale-150 opacity-60"
                />
                <img
                  src={`https://flagcdn.com/w160/${(latestFair.country || getCountryCodeFromLocation(latestFair.location)).toLowerCase()}.png`}
                  alt={`${latestFair.country || getCountryCodeFromLocation(latestFair.location)} flag`}
                  width={40}
                  height={30}
                  className="relative z-10 w-10 h-[30px] object-contain rounded-sm"
                />
              </>
            ) : '🎪'}
          </div>
          <div className="card-content">
            <h3>{fetchData ? 'Latest Fair' : 'Trade Fairs'}</h3>
            {showSkeleton ? (
              <>
                <p className="card-product-name"><Shimmer width="70%" /></p>
                <p className="card-specs"><Shimmer width="55%" /></p>
              </>
            ) : (
              <>
                <p className="card-product-name">
                  {fetchData && latestFair ? latestFair.name : 'Upcoming Events'}
                </p>
                <p className="card-specs" style={gradientTextStyle}>
                  {fetchData && latestFair
                    ? `${formatDate(latestFair.startDate)} • ${latestFair.location || ''}`
                    : 'Connect in person'}
                </p>
                <p className="card-price">{fetchData ? '' : 'See Schedule →'}</p>
              </>
            )}
          </div>
        </Link>

        {/* Fourth card: paid Hero spot when an ad is live, otherwise the
            "Advertise Here" placeholder pointing at the pricing inquiry
            form (same tier the pricing page CTAs use). */}
        {heroAd ? (
          <Link
            ref={setHeroAdRef}
            onClick={trackHeroAdClick}
            href={heroAd.linkUrl || '#'}
            target={/^https?:\/\//i.test(heroAd.linkUrl || '') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="hero-info-card hero-supplier-card hero-ad-slot-card"
            aria-label={`Sponsored: ${heroAd.companyName}`}
          >
            <div className="card-icon" style={{ position: 'relative', overflow: 'hidden' }}>
              {heroAd.companyLogo ? (
                <Image
                  src={heroAd.companyLogo}
                  alt={heroAd.companyName || 'Sponsored'}
                  fill
                  sizes="64px"
                  className="object-cover rounded-lg"
                />
              ) : (
                <span style={{ fontSize: '24px' }}>✨</span>
              )}
            </div>
            <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ color: '#FFD700' }}>{heroAd.badgeText || 'Sponsored'}</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p className="card-product-name">{heroAd.companyName}</p>
                <p className="card-specs" style={{ color: '#ffffff' }}>
                  {heroAd.description}
                </p>
              </div>
              <p className="card-budget" style={{ color: '#FFD700' }}>Visit →</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/pricing/inquire?type=featured"
            className="hero-info-card hero-supplier-card hero-ad-slot-card"
            aria-label="Your company here — inquire about featured advertising"
          >
            <div className="card-icon" style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(253,185,49,0.06))',
              border: '1px dashed rgba(255,215,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFD700',
              fontSize: '28px',
              fontWeight: 800,
            }}>
              +
            </div>
            <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ color: '#FFD700' }}>Advertise Here</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p className="card-product-name">Your Company Here</p>
                <p className="card-specs" style={{ color: '#ffffff' }}>
                  Featured spot
                </p>
              </div>
              <p className="card-budget" style={{ color: '#FFD700' }}>Book Spot →</p>
            </div>
          </Link>
        )}
      </div>
    </>
  );
}

export default HeroDataCards;
