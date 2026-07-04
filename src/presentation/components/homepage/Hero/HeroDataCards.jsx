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
  return (
    <>
      {/* Left Side Info Cards */}
      <div className="hero-left-cards">
        {/* Product Card */}
        <Link href={fetchData && latestProduct ? `/product/${latestProduct.id}` : '/products'} className="hero-info-card hero-product-card">
          <div className="card-icon">
            {showSkeleton ? (
              <Shimmer width="48px" height="48px" className="rounded" />
            ) : fetchData && latestProduct?.images?.[0] ? (
              <div className="relative w-12 h-12 rounded overflow-hidden">
                <Image
                  src={latestProduct.images[0]}
                  alt={latestProduct.name}
                  fill
                  sizes="48px"
                  priority
                  fetchPriority="high"
                  className="object-cover"
                />
              </div>
            ) : '📦'}
          </div>
          <div className="card-content">
            <h3>{fetchData ? 'Latest Product' : 'Products'}</h3>
            {showSkeleton ? (
              <>
                <p className="card-product-name"><Shimmer width="80%" /></p>
                <p className="card-specs"><Shimmer width="60%" /></p>
                <p className="card-price"><Shimmer width="40%" /></p>
              </>
            ) : (
              <>
                <p className="card-product-name">
                  {fetchData && latestProduct ? latestProduct.name : 'Browse Products'}
                </p>
                <p className="card-specs" style={gradientTextStyle}>
                  {fetchData && latestProduct ? (
                    latestProduct.price ? (
                      <>
                        {CURRENCY_SYMBOLS[latestProduct.currency] || latestProduct.currency || '$'} {latestProduct.price}
                        {latestProduct.unit && ` / ${latestProduct.unit}`}
                      </>
                    ) : 'Price on request'
                  ) : 'From verified suppliers'}
                </p>
                <p className="card-price">{fetchData ? 'See Details ▼' : 'Explore →'}</p>
              </>
            )}
          </div>
        </Link>

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
                      <span>Qty: {latestRequest.quantity || '-'} {latestRequest.unit && `${latestRequest.unit}`}</span>
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

        {/* Supplier Card */}
        <Link href={fetchData && latestSupplier ? `/profile/${latestSupplier.id}` : '/companies'} className="hero-info-card hero-supplier-card">
          <div className="card-icon">
            {showSkeleton ? (
              <Shimmer width="100%" height="100%" className="rounded-lg" />
            ) : fetchData && (latestSupplier?.companyLogo || latestSupplier?.photoURL) ? (
              <Image
                src={latestSupplier.companyLogo || latestSupplier.photoURL}
                alt={latestSupplier.companyName}
                fill
                sizes="64px"
                className="object-cover rounded-lg"
              />
            ) : '🏭'}
          </div>
          <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3>{fetchData ? 'Latest Supplier' : 'Suppliers'}</h3>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {showSkeleton ? (
                <>
                  <p className="card-product-name"><Shimmer width="65%" /></p>
                  <p className="card-specs"><Shimmer width="45%" /></p>
                </>
              ) : (
                <>
                  <p className="card-product-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fetchData && latestSupplier ? (
                      <>
                        <CountryFlag countryCode={latestSupplier.country} size={18} />
                        <span>{latestSupplier.companyName}</span>
                      </>
                    ) : 'Verified Companies'}
                  </p>
                  <p className="card-specs" style={gradientTextStyle}>
                    {fetchData && latestSupplier ? (latestSupplier.industry || '') : 'Worldwide network'}
                  </p>
                </>
              )}
            </div>
            {!fetchData && <p className="card-budget">Browse →</p>}
          </div>
        </Link>
      </div>
    </>
  );
}

export default HeroDataCards;
