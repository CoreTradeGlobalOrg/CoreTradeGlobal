/**
 * FeaturedProducts Component
 *
 * Homepage section displaying featured products
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

// Default products for initial display - country is ISO code
const DEFAULT_PRODUCTS = [
  {
    id: '1',
    name: 'Luxury Marble Block (Afyon White)',
    description: 'Premium quality white marble blocks suitable for high-end flooring and architectural projects.',
    country: 'TR',
    imageUrl: '',
    price: '450',
    currency: '$',
    unit: '/ Ton',
    category: 'Construction'
  },
  {
    id: '2',
    name: '5-Axis CNC Milling Machine',
    description: 'High precision industrial milling machine for complex parts manufacturing.',
    country: 'DE',
    imageUrl: '',
    price: '125,000',
    currency: '$',
    unit: '/ Unit',
    category: 'Machinery'
  },
  {
    id: '3',
    name: 'Raw Silk Fabric Rolls',
    description: '100% natural raw silk, ideal for luxury garment production. Available in various weights.',
    country: 'CN',
    imageUrl: '',
    price: '45',
    currency: '$',
    unit: '/ Meter',
    category: 'Textile'
  },
  {
    id: '4',
    name: 'Extra Virgin Olive Oil (500L)',
    description: 'Cold-pressed organic olive oil from Tuscany region. Bulk packaging for distributors.',
    country: 'IT',
    imageUrl: '',
    price: '8.50',
    currency: '$',
    unit: '/ Liter',
    category: 'Food'
  },
  {
    id: '5',
    name: 'Monocrystalline Solar Panels 550W',
    description: 'High efficiency PV modules for commercial and residential solar installations.',
    country: 'KR',
    imageUrl: '',
    price: '0.28',
    currency: '$',
    unit: '/ Watt',
    category: 'Energy'
  },
  {
    id: '6',
    name: 'Porcelain Ceramic Tiles 60x120',
    description: 'Modern minimalist design, anti-slip surface for indoor and outdoor use.',
    country: 'ES',
    imageUrl: '',
    price: '22',
    currency: '$',
    unit: '/ Sqm',
    category: 'Construction'
  },
  {
    id: '7',
    name: 'Seamless Steel Pipes',
    description: 'Heavy duty seamless pipes for oil and gas industry applications. API 5L certified.',
    country: 'UA',
    imageUrl: '',
    price: '950',
    currency: '$',
    unit: '/ Ton',
    category: 'Industrial'
  },
  {
    id: '8',
    name: 'Organic Cotton Yarn 30/1',
    description: 'Combed organic cotton yarn for high quality knitting and weaving.',
    country: 'IN',
    imageUrl: '',
    price: '4.20',
    currency: '$',
    unit: '/ Kg',
    category: 'Textile'
  }
];

// Truncate text to specified length
const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Map codes to symbols
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'TRY': '₺',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NZD': 'NZ$',
  'SGD': 'S$',
  'HKD': 'HK$',
  'NOK': 'kr',
  'KRW': '₩',
  'MXN': '$',
  'INR': '₹',
  'RUB': '₽',
  'BRL': 'R$',
  'ZAR': 'R'
};

// Image component with loading state
const ProductCardImage = memo(function ProductCardImage({ src, alt }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <div className="text-6xl">📦</div>;
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B] z-10">
          <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </>
  );
});

function ProductCard({ product }) {
  // Get first image from images array
  const imageUrl = product.images?.[0] || product.imageUrl;
  const countryCode = product.country || product.origin || '';

  // Resolve Currency Symbol
  const code = product.currency || 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[code] || code;

  return (
    <Link href={`/product/${product.id}`} className="product-card block no-underline text-inherit hover:no-underline">
      {/* Product Image */}
      <div className="product-card-image relative">
        <ProductCardImage src={imageUrl} alt={product.name} />
      </div>

      {/* Product Content */}
      <div className="product-card-content">
        <div className="flex items-center gap-2 mb-2 text-sm text-[var(--color-text-secondary)]">
          <CountryFlag countryCode={countryCode} size={16} />
          <span>{getCountryName(countryCode)}</span>
        </div>

        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-description">{truncateText(product.description, 80)}</p>

        {product.price && (
          <p className="product-card-price">
            {currencySymbol} {product.price}
          </p>
        )}

        <div className="w-full">
          <div className="product-card-btn w-full mt-3 text-center">View Details</div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Use simple query without index, filter client-side
        const firestoreDS = container.getFirestoreDataSource();
        const allProducts = await firestoreDS.query('products', { limit: 30 });

        if (allProducts && allProducts.length > 0) {
          // Filter active products and sort by createdAt client-side
          const active = allProducts.filter(p => p.status === 'active');
          const sorted = active.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });

          setProducts(sorted.slice(0, 12));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Keep default products on error
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="featured-products-section">
      <div className="featured-products-container">
        {/* Header */}
        <div className="featured-products-header">
          <div>
            <h2>Featured Products</h2>
            <p>Goods from verified suppliers.</p>
          </div>
          <Link href="/products" className="btn-section-action">
            View All Products →
          </Link>
        </div>

        {/* Products Grid */}
        <div className="featured-products-grid">
          <div className="dynamic-container">
            {/* Scroll Arrows */}
            <button
              className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
              id="dash-left"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
              id="dash-right"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Products Container */}
            <div
              id="products"
              className="tab-content active"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="product-card"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="product-card-image animate-pulse" />
                      <div className="product-card-content">
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3" />
                        <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                        <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;
