/**
 * HeroDataCards Component
 *
 * Floating left and right info cards in the hero section.
 * Shows latest product, RFQ, fair, and supplier when fetchData=true.
 * Shows static links to browse pages when fetchData=false.
 */

'use client';

import Link from 'next/link';
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

/**
 * @param {Object} props
 * @param {boolean} props.fetchData - Whether live data is being displayed
 * @param {Object|null} props.latestProduct
 * @param {Object|null} props.latestRequest
 * @param {Object|null} props.latestFair
 * @param {Object|null} props.latestSupplier
 */
export function HeroDataCards({ fetchData, latestProduct, latestRequest, latestFair, latestSupplier }) {
  return (
    <>
      {/* Left Side Info Cards */}
      <div className="hero-left-cards">
        {/* Product Card */}
        <Link href={fetchData && latestProduct ? `/product/${latestProduct.id}` : '/products'} className="hero-info-card hero-product-card">
          <div className="card-icon">
            {fetchData && latestProduct?.images?.[0] ? (
              <img src={latestProduct.images[0]} alt={latestProduct.name} className="w-12 h-12 object-cover rounded" />
            ) : '📦'}
          </div>
          <div className="card-content">
            <h3>{fetchData ? 'Latest Product' : 'Products'}</h3>
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
          </div>
        </Link>

        {/* RFQ Card */}
        <Link href={fetchData && latestRequest ? `/request/${latestRequest.id}` : '/requests'} className="hero-info-card hero-rfq-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>{fetchData ? 'Latest RFQ' : 'RFQs'}</h3>
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
          </div>
        </Link>
      </div>

      {/* Right Side Info Cards */}
      <div className="hero-right-cards">
        {/* Fair Card */}
        <Link href={fetchData && latestFair ? `/fair/${latestFair.id}` : '/fairs'} className="hero-info-card hero-fair-card">
          <div className="card-icon">🎪</div>
          <div className="card-content">
            <h3>{fetchData ? 'Latest Fair' : 'Trade Fairs'}</h3>
            <p className="card-product-name">
              {fetchData && latestFair ? latestFair.name : 'Upcoming Events'}
            </p>
            <p className="card-specs" style={gradientTextStyle}>
              {fetchData && latestFair
                ? `${formatDate(latestFair.startDate)} • ${latestFair.location || ''}`
                : 'Connect in person'}
            </p>
            <p className="card-price">{fetchData ? '' : 'See Schedule →'}</p>
          </div>
        </Link>

        {/* Supplier Card */}
        <Link href={fetchData && latestSupplier ? `/profile/${latestSupplier.id}` : '/companies'} className="hero-info-card hero-supplier-card">
          <div className="card-icon">
            {fetchData && (latestSupplier?.companyLogo || latestSupplier?.photoURL) ? (
              <img
                src={latestSupplier.companyLogo || latestSupplier.photoURL}
                alt={latestSupplier.companyName}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : '🏭'}
          </div>
          <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3>{fetchData ? 'Latest Supplier' : 'Suppliers'}</h3>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
            </div>
            {!fetchData && <p className="card-budget">Browse →</p>}
          </div>
        </Link>
      </div>
    </>
  );
}

export default HeroDataCards;
