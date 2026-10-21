/**
 * FeaturedProducts Component
 *
 * Homepage section displaying featured products
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from '@/presentation/components/common/DeferredLink/DeferredLink';
import Image from 'next/image';
import { container } from '@/core/di/container';
import { ChevronLeft, ChevronRight, Package, Star } from 'lucide-react';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useOwnerRoles } from '@/presentation/hooks/user/useOwnerRoles';
import { useResponsiveLimit, useScrollLoadMore } from '@/presentation/hooks/useResponsiveLimit';
import { usePageSettled } from '@/presentation/hooks/usePageSettled';
import { getUnitByCode, getUnitName } from '@/core/constants/units';
import { productThumbUrl } from '@/lib/productThumbnail';
import { CurrencySymbol } from '@/presentation/components/common/CurrencySymbol/CurrencySymbol';

// Mock product fallback (ids '1'..'8', fake "Afyon marble" / "Tuscany
// olive oil" / "CNC machine" listings) was removed on 2026-10-11.
// It had been seeded as `useState(DEFAULT_PRODUCTS)` so Googlebot saw
// `/product/1`..`/product/8` as the only product links in the SSR
// homepage; every one of them returned notFound() → ~soft 404s
// which Google read as "this site's product pages are broken",
// cratering crawl budget. The server-component page.js now injects
// real Firestore products via the `initialProducts` prop.

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

// Products created on/after this cutoff bypass Vercel's image
// optimizer (unoptimized prop). Older products keep going through the
// optimizer so their existing cache entries stay in use. Set to just
// before the first upload that started hitting the monthly image
// optimization quota. Change or remove this line to revert.
const UNOPTIMIZED_AFTER = new Date('2026-07-25T00:00:00Z');

function isUnoptimizedProduct(product) {
  const raw = product?.createdAt;
  if (!raw) return false;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  return d instanceof Date && !isNaN(d) && d >= UNOPTIMIZED_AFTER;
}

// Carousel cards this far outside the visible strip keep their image back.
const LAZY_IMAGE_MARGIN = '0px 320px';

// Image component with loading state.
// `lazyRoot` (a ref to the horizontal carousel) holds the image back until
// the card is within LAZY_IMAGE_MARGIN of the carousel's visible area.
// Chrome's native lazy loading fetches anything within ~1250 px, which on a
// phone (one card per screen) meant ~6 off-screen thumbnails competing with
// the first paint.
const ProductCardImage = memo(function ProductCardImage({ src, alt, unoptimized = false, lazyRoot = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 640 px thumbnail; falls back to the original if it is missing.
  const thumb = productThumbUrl(src);
  const [thumbFailed, setThumbFailed] = useState(false);
  const shownSrc = thumbFailed ? src : thumb;
  const [near, setNear] = useState(!lazyRoot);
  const holderRef = useRef(null);

  useEffect(() => {
    if (near) return undefined;
    const root = lazyRoot?.current;
    const node = holderRef.current;
    if (!root || !node || !('IntersectionObserver' in window)) {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { root, rootMargin: LAZY_IMAGE_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near, lazyRoot]);

  if (src && !near) {
    return <div ref={holderRef} className="absolute inset-0 animate-shimmer z-10" />;
  }

  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A283B] to-[#0F1B2B]">
        <Package className="w-20 h-20 text-[rgba(255,255,255,0.35)]" />
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 animate-shimmer z-10" />
      )}
      <Image
        src={shownSrc}
        alt={alt}
        fill
        unoptimized={unoptimized}
        // Sizes hint mirrors the real grid in homepage.css #products:
        // <640 px: flex 0 0 100% (single-column, full row)
        // 640-900 px: flex 0 0 calc(50% - 12px)
        // 900-1200 px: flex 0 0 calc(33.333% - 16px)
        // >1200 px: flex 0 0 calc(25% - 18px), min-width 280 px
        // The prior "45vw / 22vw / 200px" understated mobile (real card
        // is 100vw, not 45vw) and Lighthouse still served the 1024 px
        // variant because next.config's default imageSizes rounded a
        // ~185 px hint up to 384 while the DPR-2 branch grabbed 1024.
        // With the tighter deviceSizes/imageSizes matrix in next.config
        // this now lands on 512 for the mobile 100vw case.
        sizes="(max-width: 639px) 100vw, (max-width: 900px) 50vw, (max-width: 1200px) 33vw, 300px"
        className={`object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          if (shownSrc !== src) { setThumbFailed(true); return; }
          setLoading(false);
          setError(true);
        }}
      />
    </>
  );
});

export function ProductCard({ product, categories, isFavorited, onToggleFavorite, ownerRole, lazyImageRoot = null }) {
  // Get first image from images array
  const imageUrl = product.images?.[0] || product.imageUrl;

  // Resolve Currency Symbol
  const code = product.currency || 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[code] || code;

  // Resolve Category Name and Icon
  const category = categories?.find(c => c.value === product.categoryId);
  const categoryName = product.category || category?.label?.replace(/^[^\s]+\s/, '') || '';
  const categoryIcon = category?.icon || '';
  const isLogistics = ownerRole === 'logistics_provider';

  return (
    <Link
      href={`/product/${product.id}`}
      className={
        isLogistics
          ? 'product-card product-card--logistics block no-underline text-inherit hover:no-underline'
          : 'product-card block no-underline text-inherit hover:no-underline'
      }
      style={isLogistics ? { borderColor: 'rgba(226, 88, 34, 0.55)' } : undefined}
    >
      {/* Product Image */}
      <div className="product-card-image relative">
        <ProductCardImage
          src={imageUrl}
          alt={product.name}
          unoptimized={isUnoptimizedProduct(product)}
          lazyRoot={lazyImageRoot}
        />
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product.id); }}
            className="absolute top-2 right-2 z-10 bg-black/40 hover:bg-black/60 rounded-full p-1.5 transition-colors"
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className="w-4 h-4 transition-colors"
              style={isFavorited ? { fill: '#FFD700', color: '#FFD700' } : { color: 'white' }}
            />
          </button>
        )}
      </div>

      {/* Product Content */}
      <div className="product-card-content">
        <h3
          className="product-card-name"
          style={{
            background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {product.name}
        </h3>
        {categoryName && (
          <span className="text-sm text-[#FFD700] font-bold flex items-center gap-2">
            {categoryIcon && <span>{categoryIcon}</span>}
            <span>{categoryName}</span>
          </span>
        )}
        <p className="product-card-description">{truncateText(product.description, 80)}</p>

        <p className="product-card-price">
          {product.price ? (
            <>
              <CurrencySymbol symbol={currencySymbol} /> {product.price}
              {product.unit && (() => {
                const raw = String(product.unit).replace(/^\/\s*/, '').trim();
                const knownUnit = getUnitByCode(raw);
                const displayName = knownUnit ? getUnitName(raw) : raw;
                return (
                  <>
                    <span
                      className="font-semibold text-sm ml-1"
                      style={{
                        background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      / {displayName}
                    </span>
                    {knownUnit && (
                      <span className="inline-block ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold text-[#A0A0A0] bg-white/5 border border-white/10 align-middle">
                        {raw}
                      </span>
                    )}
                  </>
                );
              })()}
            </>
          ) : 'Negotiable'}
        </p>

        <div className="w-full mt-auto pt-3">
          <div className="product-card-btn w-full text-center">View Details</div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedProducts({ initialProducts = [] }) {
  // Seed state from the server-fetched products so SSR HTML carries
  // the real `/product/<firestoreId>` links Google needs to discover
  // the catalog. The subscribeToQuery below picks up live updates (new
  // uploads, status changes) once the page has settled: the cards are
  // already on screen, so it should not compete with the first paint.
  const [products, setProducts] = useState(initialProducts);
  const [allProducts, setAllProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);
  const settled = usePageSettled();
  const { categories } = useCategories();
  // Batch-load the owner role for every visible product so the
  // logistics accent lands without a per-card Firestore read.
  const ownerRoles = useOwnerRoles(products.map((p) => p.userId), settled);

  // Responsive limits with lazy loading: mobile 4, tablet 8, desktop 12, max 30
  const { limit, displayCount, isReady, loadMore, hasMore } = useResponsiveLimit({
    mobile: 4,
    tablet: 8,
    desktop: 12,
    maxItems: 30
  });

  // Lazy load more when scrolling near end
  useScrollLoadMore(scrollRef, loadMore, hasMore, 200);

  // Check initial scroll position on mount and when content loads
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollWidth > clientWidth);
      }
    };
    checkScroll();
    const timeout = setTimeout(checkScroll, 500);
    return () => clearTimeout(timeout);
  }, [products]);

  // Update displayed products when displayCount changes (lazy loading)
  useEffect(() => {
    if (allProducts.length > 0) {
      setProducts(allProducts.slice(0, displayCount));
    }
  }, [displayCount, allProducts]);

  useEffect(() => {
    if (!isReady || !settled) return; // Wait for responsive limit and a settled page

    const firestoreDS = container.getFirestoreDataSource();

    // Real-time subscription to products (newest first so recent uploads show)
    const unsubscribe = firestoreDS.subscribeToQuery(
      'products',
      { orderBy: [['createdAt', 'desc']], limit: 35 },
      (fetchedProducts) => {
        if (fetchedProducts && fetchedProducts.length > 0) {
          // Filter active products and sort by createdAt client-side
          const active = fetchedProducts.filter(p => p.status === 'active');
          if (active.length > 0) {
            const sorted = active.sort((a, b) => {
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            setAllProducts(sorted);
            setProducts(sorted.slice(0, displayCount));
          }
          // No fallback to mock data — if the live subscription returns
          // zero active products we keep the server-seeded initial
          // products (or empty, which shows no cards). Mock /product/1
          // links were a soft-404 crawl trap for Google.
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isReady, settled]);

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
            <h2>Latest Products</h2>
          </div>
          <Link href="/products" className="btn-section-action">
            View All Products →
          </Link>
        </div>

        {/* Products Grid */}
        <div className="featured-products-grid">
          <div className="dynamic-container select-none">
            {/* Scroll Arrows */}
            <button
              className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
              id="dash-left"
              onClick={() => scroll('left')}
              aria-label="Scroll products left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
              id="dash-right"
              onClick={() => scroll('right')}
              aria-label="Scroll products right"
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
              {/* Render the current products array — starts as
                  DEFAULT_PRODUCTS (4 placeholder cards) and swaps to
                  real Firestore data once the subscription resolves.
                  Skipping the separate skeleton branch keeps a stable
                  DOM (4 <ProductCard>s from paint one), which removed
                  a ~0.045 CLS shift Lighthouse attributed to the
                  section on throttled mobile — skeleton cards were
                  slightly shorter than the real card layout. */}
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categories={categories}
                  ownerRole={ownerRoles.get(product.userId)}
                  // The first two cards are on screen on every width; the
                  // rest load as the carousel brings them near.
                  lazyImageRoot={index >= 2 ? scrollRef : null}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;
