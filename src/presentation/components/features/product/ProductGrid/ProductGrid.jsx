/**
 * ProductGrid Component
 *
 * Displays a grid of products using the .product-grid-card style
 * Matches anasyf design
 * Supports filtering props
 */

'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Star, MessageSquarePlus } from 'lucide-react';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useFavoriteProduct } from '@/presentation/hooks/product/useFavoriteProduct';
import { useTrackEvent } from '@/presentation/hooks/analytics';
import { useActiveAd } from '@/presentation/hooks/ads/useActiveAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { AD_TYPES } from '@/core/constants/adTypes';

// Sort helper — products with an image come first (visual browsing beats a
// wall of placeholder tiles), tie-broken by newest createdAt. Applied at
// fetch time AND after every filter pass so search-results, category-only
// views, and the fallback suggestion pool all inherit the same rule.
const sortByImageThenDate = (a, b) => {
    const aImg = !!(a.images && a.images[0]);
    const bImg = !!(b.images && b.images[0]);
    if (aImg !== bImg) return bImg - aImg;
    const dA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const dB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return dB - dA;
};

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
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'TRY': '₺',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'KRW': '₩',
    'INR': '₹',
};

const DEFAULT_PRODUCTS = [
    {
        id: '1',
        name: 'Luxury Marble Block - Carrara White',
        price: 450,
        currency: '$',
        unit: 'Ton',
        country: 'Turkey',
        images: ['https://images.unsplash.com/photo-1618516086847-7597b9195d2b?q=80&w=600&auto=format&fit=crop'],
        category: 'Construction'
    },
    {
        id: '2',
        name: 'Industrial Steel Pipes (Seamless)',
        price: 850,
        currency: '$',
        unit: 'Ton',
        country: 'Germany',
        images: ['https://images.unsplash.com/photo-1535063073385-d5e8b4e76a66?q=80&w=600&auto=format&fit=crop'],
        category: 'Industrial'
    },
    {
        id: '3',
        name: '100% Organic Silk Fabric',
        price: 25,
        currency: '$',
        unit: 'Meter',
        country: 'China',
        images: ['https://images.unsplash.com/photo-1620799140408-ed5341cd2431?q=80&w=600&auto=format&fit=crop'],
        category: 'Textile'
    },
    {
        id: '4',
        name: 'Extra Virgin Olive Oil (Cold Pressed)',
        price: 6.50,
        currency: '€',
        unit: 'Liter',
        country: 'Italy',
        images: ['https://images.unsplash.com/photo-1474979266404-7caddbed77a5?q=80&w=600&auto=format&fit=crop'],
        category: 'Food'
    },
    {
        id: '5',
        name: 'Solar Panel Monocrystalline 450W',
        price: 180,
        currency: '$',
        unit: 'Pc',
        country: 'S. Korea',
        images: ['https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=600&auto=format&fit=crop'],
        category: 'Energy'
    },
    {
        id: '6',
        name: 'Ceramic Floor Tiles (60x60)',
        price: 12,
        currency: '$',
        unit: 'm²',
        country: 'Spain',
        images: ['https://images.unsplash.com/photo-1615971677499-54678ab563ce?q=80&w=600&auto=format&fit=crop'],
        category: 'Construction'
    },
    {
        id: '7',
        name: 'Natural Gas Valve Set',
        price: 45,
        currency: '$',
        unit: 'Set',
        country: 'Ukraine',
        images: ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=600&auto=format&fit=crop'],
        category: 'Industrial'
    },
    {
        id: '8',
        name: 'Cotton Yarn 30/1 Combed',
        price: 3.20,
        currency: '$',
        unit: 'kg',
        country: 'India',
        images: ['https://images.unsplash.com/photo-1605218427306-022248cebf77?q=80&w=600&auto=format&fit=crop'],
        category: 'Textile'
    }
];

const PAGE_SIZE = 12;

export function ProductGrid({ searchQuery, categoryFilter, categoryIdFilter, countryFilter, sidebarVisible = false }) {
    const [products, setProducts] = useState(DEFAULT_PRODUCTS);
    const [filteredProducts, setFilteredProducts] = useState(DEFAULT_PRODUCTS);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const gridTopRef = useRef(null);
    const { categories } = useCategories();
    const { isFavorited, toggleFavorite } = useFavoriteProduct();
    const { track } = useTrackEvent();
    // Featured advertising slot — takes the first grid tile on page 1
    // when a campaign is live. See useActiveAd for the selection rules.
    const { ad: featuredAd } = useActiveAd(AD_TYPES.FEATURED);

    // Fetch Products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const firestoreDS = container.getFirestoreDataSource();
                // Newest first (so recent uploads appear) with a generous cap.
                // Pagination is client-side over this set. TODO: server-side
                // filtering/cursor pagination if the catalog grows much larger.
                const allProducts = await firestoreDS.query('products', {
                    orderBy: [['createdAt', 'desc']],
                    limit: 500,
                });

                if (allProducts && allProducts.length > 0) {
                    const active = allProducts.filter(p => p.status === 'active');

                    // Enrich products with owner's country if product has no country field
                    const needsCountry = active.filter(p => !p.country && p.userId);
                    if (needsCountry.length > 0) {
                        const uniqueUserIds = [...new Set(needsCountry.map(p => p.userId))];
                        const userDocs = await Promise.all(
                            uniqueUserIds.map(uid => firestoreDS.getById('users', uid).catch(() => null))
                        );
                        const userCountryMap = {};
                        userDocs.forEach(u => { if (u?.country) userCountryMap[u.id] = u.country; });
                        active.forEach(p => { if (!p.country && userCountryMap[p.userId]) p.country = userCountryMap[p.userId]; });
                    }

                    const sorted = active.sort(sortByImageThenDate);

                    if (sorted.length > 0) {
                        setProducts(sorted);
                    }
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, categoryIdFilter, countryFilter]);

    // Filter Logic
    useEffect(() => {
        let result = products;

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerQ) ||
                (p.description && p.description.toLowerCase().includes(lowerQ)) ||
                (p.category && p.category.toLowerCase().includes(lowerQ))
            );
        }

        if (categoryFilter) {
            const lowerC = categoryFilter.toLowerCase();
            result = result.filter(p =>
                (p.category && p.category.toLowerCase() === lowerC)
            );
        }

        if (categoryIdFilter) {
            result = result.filter(p => p.categoryId === categoryIdFilter);
        }

        if (countryFilter) {
            result = result.filter(p => p.country === countryFilter);
        }

        setFilteredProducts([...result].sort(sortByImageThenDate));

    }, [products, searchQuery, categoryFilter, categoryIdFilter, countryFilter]);

    // Numbered pagination (client-side over the filtered set).
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const goToPage = useCallback((page) => {
        const clamped = Math.min(Math.max(1, page), totalPages);
        setCurrentPage(clamped);
        // Smooth-scroll back to the top of the grid on page change.
        gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [totalPages]);

    // Reduce to 3 columns when the category sidebar is visible (sidebar takes ~224px)
    const gridColsClass = sidebarVisible
        ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

    // Netflix-style suggestions when the current filter combo returns zero.
    // Priority ladder: keep whatever narrow filter the user set (category or
    // country) and drop the search string; fall through to the whole
    // catalog. `products` is already image-first + newest-first sorted so
    // we just take the head.
    const suggestedProducts = useMemo(() => {
        if (!searchQuery) return [];
        const inCategory = (p) => {
            if (categoryFilter && !(p.category && p.category.toLowerCase() === categoryFilter.toLowerCase())) return false;
            if (categoryIdFilter && p.categoryId !== categoryIdFilter) return false;
            return true;
        };
        const inCountry = (p) => (countryFilter ? p.country === countryFilter : true);

        if (categoryFilter || categoryIdFilter) {
            const scoped = products.filter((p) => inCategory(p) && inCountry(p));
            if (scoped.length > 0) return scoped;
        }
        if (countryFilter) {
            const scoped = products.filter(inCountry);
            if (scoped.length > 0) return scoped;
        }
        return products;
    }, [products, searchQuery, categoryFilter, categoryIdFilter, countryFilter]);

    // Fire zero_result_search once per (query, filter combo) so the same
    // empty result set doesn't spam analytics on every re-render.
    const lastZeroKeyRef = useRef('');
    useEffect(() => {
        if (loading) return;
        if (filteredProducts.length !== 0) return;
        if (!searchQuery) return;
        const key = `${searchQuery}|${categoryFilter}|${categoryIdFilter}|${countryFilter}`;
        if (lastZeroKeyRef.current === key) return;
        lastZeroKeyRef.current = key;
        track('zero_result_search', {
            search_term: searchQuery,
            category: categoryFilter || null,
            category_id: categoryIdFilter || null,
            country: countryFilter || null,
            suggestions_count: suggestedProducts.length,
        });
    }, [loading, filteredProducts.length, searchQuery, categoryFilter, categoryIdFilter, countryFilter, suggestedProducts.length, track]);

    if (loading) {
        return (
            <div className={`grid ${gridColsClass} gap-6`}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-[420px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
                ))}
            </div>
        );
    }

    if (filteredProducts.length === 0) {
        const suggested = suggestedProducts.slice(0, 12);
        const rfqHref = searchQuery
            ? `/request/new?title=${encodeURIComponent(searchQuery)}`
            : '/request/new';
        return (
            <div>
                <div className="text-center py-10 px-4">
                    <h3 className="text-xl font-bold text-white mb-2">
                        {searchQuery
                            ? <>No exact matches for <span className="text-[#FFD700]">&ldquo;{searchQuery}&rdquo;</span></>
                            : 'No products found'}
                    </h3>
                    <p className="text-[#A0A0A0] mb-5">
                        {searchQuery
                            ? "Can't find what you're looking for? Post an RFQ and let sellers come to you."
                            : 'Try adjusting your filters.'}
                    </p>
                    <Link
                        href={rfqHref}
                        style={{ color: '#ffffff' }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#3b82f6] font-bold text-sm hover:bg-[#60a5fa] hover:shadow-[0_0_25px_rgba(59,130,246,0.55)] transition-all no-underline"
                        onClick={() => track('rfq_cta_from_zero_search', { search_term: searchQuery })}
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                        {searchQuery
                            ? <>Post an RFQ for &ldquo;{searchQuery}&rdquo;</>
                            : 'Post an RFQ'}
                    </Link>
                </div>

                {suggested.length > 0 && (
                    <>
                        <div className="flex items-center gap-3 mb-5 mt-4">
                            <div className="flex-1 h-px bg-[rgba(255,255,255,0.1)]" />
                            <span className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold">
                                You might also like
                            </span>
                            <div className="flex-1 h-px bg-[rgba(255,255,255,0.1)]" />
                        </div>
                        <div className={`grid ${gridColsClass} gap-6`}>
                            {suggested.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    categories={categories}
                                    isFavorited={isFavorited(product.id)}
                                    onToggleFavorite={toggleFavorite}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Windowed page numbers with ellipsis: 1 … (p-1) p (p+1) … N
    const pageItems = (() => {
        const items = [];
        const add = (v) => items.push(v);
        const window = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
        let prev = 0;
        for (let i = 1; i <= totalPages; i++) {
            if (!window.has(i)) continue;
            if (i - prev > 1) add('ellipsis');
            add(i);
            prev = i;
        }
        return items;
    })();

    return (
        <>
            <div ref={gridTopRef} className="scroll-mt-28" />
            <div className={`grid ${gridColsClass} gap-6`}>
                {featuredAd && safePage === 1 && (
                    <SponsoredProductCard ad={featuredAd} />
                )}
                {pageProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        categories={categories}
                        isFavorited={isFavorited(product.id)}
                        onToggleFavorite={toggleFavorite}
                    />
                ))}
            </div>

            {/* Numbered pagination */}
            {totalPages > 1 && (
                <nav className="flex items-center justify-center flex-wrap gap-2 mt-10" aria-label="Products pagination">
                    <button
                        type="button"
                        onClick={() => goToPage(safePage - 1)}
                        disabled={safePage === 1}
                        className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all"
                    >
                        ‹ Previous
                    </button>

                    {pageItems.map((item, idx) =>
                        item === 'ellipsis' ? (
                            <span key={`e${idx}`} className="px-2 text-[#A0A0A0] select-none">…</span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                onClick={() => goToPage(item)}
                                aria-current={item === safePage ? 'page' : undefined}
                                className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                                    item === safePage
                                        ? 'bg-[#FFD700] text-[#0F1B2B] border-[#FFD700]'
                                        : 'bg-[rgba(255,255,255,0.05)] text-white border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]'
                                }`}
                            >
                                {item}
                            </button>
                        )
                    )}

                    <button
                        type="button"
                        onClick={() => goToPage(safePage + 1)}
                        disabled={safePage === totalPages}
                        className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all"
                    >
                        Next ›
                    </button>
                </nav>
            )}
        </>
    );
}

function ProductCard({ product, categories, isFavorited, onToggleFavorite }) {
    const [imageLoading, setImageLoading] = useState(true);

    // Resolve category name from categoryId
    const category = categories?.find(c => c.value === product.categoryId);
    const categoryName = category?.name || product.category || '';

    return (
        <Link
            href={`/product/${product.id}`}
            className="product-grid-card group"
        >
            {/* Image Area */}
            <div className="aspect-[4/3] w-full bg-[#1A283B] rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
                {product.images && product.images[0] ? (
                    <>
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B] z-10">
                                <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        <img
                            src={product.images[0]}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setImageLoading(false)}
                        />
                    </>
                ) : (
                    <div className="text-4xl">📦</div>
                )}
                {/* Star / Favorite Button */}
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleFavorite(product.id);
                        }}
                        className="absolute top-2 right-2 z-20 bg-black/40 hover:bg-black/60 rounded-full p-1.5 transition-colors"
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Star
                            className="w-4 h-4 transition-colors"
                            style={isFavorited ? { fill: '#FFD700', color: '#FFD700' } : { color: 'white' }}
                        />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1">
                {product.country && (
                    <div className="flex items-center gap-2 mb-2 text-[#A0A0A0] text-sm">
                        <CountryFlag countryCode={product.country} size={16} />
                        <span>{getCountryName(product.country)}</span>
                    </div>
                )}

                <h3 className="text-lg font-bold text-white mb-1 leading-tight line-clamp-2 min-h-[44px]">
                    {product.name}
                </h3>
                {categoryName && (
                    <span className="text-sm text-[#FFD700] font-bold mb-2">{categoryName}</span>
                )}

                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
                    <div className="text-[#FFD700] font-bold text-xl">
                        {product.price ? (
                            <>
                                {CURRENCY_SYMBOLS[product.currency] || product.currency || '$'} {product.price}
                                {product.unit && (
                                    <span
                                        className="text-sm font-semibold ml-1"
                                        style={{
                                            background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text'
                                        }}
                                    >
                                        / {product.unit}
                                    </span>
                                )}
                            </>
                        ) : 'Negotiable'}
                    </div>
                    <div className="px-5 py-2 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full text-center text-sm hover:brightness-110 transition-all">
                        View
                    </div>
                </div>
            </div>
        </Link>
    );
}

/**
 * SponsoredProductCard — visual sibling of ProductCard with a
 * gold-tinted border + "Sponsored" badge. Rendered as the very first
 * tile on page 1 whenever a Featured ad is active. Clicks are treated
 * as external nav when the link is a full URL.
 */
function SponsoredProductCard({ ad }) {
    const isExternal = /^https?:\/\//i.test(ad.linkUrl || '');
    const { setRef, trackClick } = useTrackAd(ad.id);
    // Mirror ProductCard's DOM/classes so grid rows stay aligned. The
    // ad-specific styling is layered as a gold outline + badge; internal
    // structure (aspect ratio, spacing, footer) is identical.
    return (
        <Link
            ref={setRef}
            onClick={trackClick}
            href={ad.linkUrl || '#'}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="product-grid-card group relative"
            style={{
                border: '2px solid rgba(255,215,0,0.6)',
                boxShadow: '0 10px 30px rgba(255,215,0,0.15)',
                textDecoration: 'none',
            }}
        >
            <span
                className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: '#FFD700', color: '#0F1B2B' }}
            >
                {ad.badgeText || 'Sponsored'}
            </span>

            {/* Image Area — matches ProductCard aspect + wrapper */}
            <div className="aspect-[4/3] w-full bg-[#1A283B] rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
                {ad.companyLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={ad.companyLogo}
                        alt={ad.companyName || 'Sponsored'}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center text-2xl font-extrabold"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(15,27,43,0.9))',
                            color: '#FFD700',
                        }}
                    >
                        {(ad.companyName || 'AD').slice(0, 2).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Content — matches ProductCard layout */}
            <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2 text-[#A0A0A0] text-sm">
                    <span className="uppercase tracking-wider text-[10px] text-[#FFD700] font-bold">Ad</span>
                    <span className="truncate">{ad.companyName}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 leading-tight line-clamp-2 min-h-[44px]">
                    {ad.description || ad.companyName || 'Featured Placement'}
                </h3>

                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
                    <div className="text-[#FFD700] font-bold text-sm uppercase tracking-wider">
                        Sponsored
                    </div>
                    <div className="px-5 py-2 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full text-center text-sm hover:brightness-110 transition-all">
                        Visit
                    </div>
                </div>
            </div>
        </Link>
    );
}

