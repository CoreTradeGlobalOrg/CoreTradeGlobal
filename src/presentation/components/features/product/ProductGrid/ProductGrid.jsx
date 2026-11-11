/**
 * ProductGrid Component
 *
 * Displays a grid of products using the .product-grid-card style
 * Matches anasyf design
 * Supports filtering props
 */

'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Star, MessageSquarePlus } from 'lucide-react';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { ProductThumbImg } from '@/presentation/components/common/ProductThumbImg/ProductThumbImg';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useFavoriteProduct } from '@/presentation/hooks/product/useFavoriteProduct';
import { useOwnerRoles } from '@/presentation/hooks/user/useOwnerRoles';
import { useProductsByIds } from '@/presentation/hooks/product/useProductsByIds';
import { useTrackEvent } from '@/presentation/hooks/analytics';
import { useActiveAd } from '@/presentation/hooks/ads/useActiveAd';
import { useTrackAd } from '@/presentation/hooks/ads/useTrackAd';
import { AD_TYPES } from '@/core/constants/adTypes';
import { CurrencySymbol } from '@/presentation/components/common/CurrencySymbol/CurrencySymbol';

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

// DEFAULT_PRODUCTS mock array (ids '1'..'8', Unsplash placeholder images,
// fake /product/1..8 links) was removed on 2026-10-11. Googlebot's only
// SSR view of /products was eight 404-bound links which Google read as
// "this site's product catalog is broken" and throttled crawl budget.
// The /products server shell now hydrates the grid with real Firestore
// products via the `initialProducts` prop.

// Infinite scroll over the filtered set. The first batch is 11 products
// plus the sponsored tile (12 tiles, as page 1 used to be); every later
// batch adds 12, so rows stay full in 1-, 2-, 3- and 4-column layouts.
const FIRST_BATCH = 11;
const BATCH_SIZE = 12;
// The next batch is added while the end of the grid is still this far below the screen.
const LOAD_AHEAD_MARGIN = '0px 0px 800px 0px';

// The full list is kept for the whole visit: coming back from a product
// shows it at once (so the scroll position can be restored) without
// reading the 500 docs again.
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;
let productsCache = null; // { products, at }

// The last sponsored tile shown (ad + its product). A remount draws it at
// once instead of the "Book This Spot" placeholder: swapping the tile a
// moment later moves every card by one cell, so a restored scroll position
// lands a row off. Ad blockers hide .sponsored-slot (EasyList), which turns
// that swap into a removal.
let sponsoredCache = null; // { ad, product }

// Ürüne girip tarayıcının geri tuşuyla dönünce liste aynı yerden açılsın.
// Konum ürüne tıklanınca kaydediliyor; sadece popstate'in hemen ardından
// açılan liste geri yüklüyor (menüdeki Products linki en baştan açar).
const POSITION_KEY = 'ctg:products-position';
const RESTORE_WINDOW_MS = 3000;
let lastPopStateAt = 0;
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => { lastPopStateAt = Date.now(); });
}

function currentListUrl() {
    return `${window.location.pathname}${window.location.search}`;
}

function takeSavedPosition() {
    if (typeof window === 'undefined') return null;
    if (Date.now() - lastPopStateAt > RESTORE_WINDOW_MS) return null;
    try {
        const saved = JSON.parse(window.sessionStorage.getItem(POSITION_KEY) || 'null');
        return saved && saved.url === currentListUrl() ? saved : null;
    } catch {
        return null;
    }
}

export function ProductGrid({ searchQuery, categoryFilter, categoryIdFilter, countryFilter, sidebarVisible = false, initialProducts = [] }) {
    const [products, setProducts] = useState(() => productsCache?.products || initialProducts);
    // initialProducts is only the newest 60; more arrive with the full list.
    const [fullListReady, setFullListReady] = useState(() => !!productsCache);
    const [loading, setLoading] = useState(() => !productsCache && initialProducts.length === 0);
    const [savedPosition] = useState(takeSavedPosition);
    const [visibleCount, setVisibleCount] = useState(() => Math.max(FIRST_BATCH, savedPosition?.count || 0));
    const sentinelRef = useRef(null);
    // Reset the list only when the filters actually change (never on mount).
    const filterKey = `${searchQuery || ''}|${categoryFilter || ''}|${categoryIdFilter || ''}|${countryFilter || ''}`;
    const lastFilterKeyRef = useRef(filterKey);
    const { categories } = useCategories();
    const { isFavorited, toggleFavorite } = useFavoriteProduct();
    const { track } = useTrackEvent();
    // The sponsored package (SPONSORED) is the only ad tier — it fills
    // the top of /products from sponsored.productsListProductId.
    const { ad: liveSponsoredAd, loading: sponsoredAdLoading } = useActiveAd(AD_TYPES.SPONSORED);
    // Until the first ads snapshot arrives, keep the tile from the last visit.
    const sponsoredAd = sponsoredAdLoading ? (sponsoredCache?.ad ?? null) : liveSponsoredAd;
    useEffect(() => {
        if (!sponsoredAdLoading && !liveSponsoredAd) sponsoredCache = null;
    }, [sponsoredAdLoading, liveSponsoredAd]);

    // Fetch Products
    useEffect(() => {
        if (productsCache && Date.now() - productsCache.at < PRODUCTS_CACHE_TTL_MS) return;
        const fetchProducts = async () => {
            try {
                const firestoreDS = container.getFirestoreDataSource();
                // Every active product, newest first. The status filter has to
                // be in the query: with a plain "newest 500" cap, inactive docs
                // used up the slots and older active products (all of Germany's,
                // for one) never reached the list or the country filter.
                // Uses the status + createdAt index. Infinite scroll is
                // client-side over this set. TODO: server-side filtering/cursor
                // pagination if the catalog grows much larger.
                const allProducts = await firestoreDS.query('products', {
                    where: [['status', '==', 'active']],
                    orderBy: [['createdAt', 'desc']],
                    limit: 3000,
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
                        productsCache = { products: sorted, at: Date.now() };
                        setProducts(sorted);
                    }
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
                setFullListReady(true);
            }
        };

        fetchProducts();
    }, []);

    // Back to the first batch when the filters actually change (never on mount)
    useEffect(() => {
        if (lastFilterKeyRef.current === filterKey) return;
        lastFilterKeyRef.current = filterKey;
        setVisibleCount(FIRST_BATCH);
    }, [filterKey]);

    // Old numbered-pagination links (?page=N) open the list from the top.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('page')) return;
        params.delete('page');
        const qs = params.toString();
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }, []);

    // Filter Logic
    const filteredProducts = useMemo(() => {
        let result = products;

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            // Pull every category whose name matches the query, then
            // include products in those categories — so typing
            // "electron" surfaces both "Industrial Electronics" (name
            // match) and every product filed under the "Electronics"
            // category, even ones whose own name doesn't contain the
            // query. Product docs only carry categoryId, so the map
            // lookup does the string comparison.
            const matchedCategoryIds = new Set(
                (categories || [])
                    .filter((c) => c.name?.toLowerCase().includes(lowerQ))
                    .map((c) => c.value)
            );
            result = result.filter(p =>
                (p.name && p.name.toLowerCase().includes(lowerQ)) ||
                (p.description && p.description.toLowerCase().includes(lowerQ)) ||
                (p.categoryId && matchedCategoryIds.has(p.categoryId))
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

        return [...result].sort(sortByImageThenDate);
    }, [products, searchQuery, categoryFilter, categoryIdFilter, countryFilter, categories]);

    // The Sponsored Product slot is always the first tile — either a live
    // ad (SponsoredPackageCard) or a "Book This Spot" placeholder
    // (SponsoredProductPlaceholder) — so grid density stays the same
    // whether or not an ad is running.
    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProducts.length;
    // Products past the newest 60 are still on their way.
    const waitingForMore = !hasMore && !fullListReady;

    // Batch-load the owner role for every visible product so the
    // logistics-provider accent lights up without a per-card read.
    const ownerRoles = useOwnerRoles(visibleProducts.map((p) => p.userId));

    // Add the next batch as the end of the grid comes near. The observer is
    // rebuilt after every batch, so if the end is still in range (tall
    // screen) the next batch follows straight away.
    useEffect(() => {
        if (!hasMore) return undefined;
        const node = sentinelRef.current;
        if (!node) return undefined;
        if (!('IntersectionObserver' in window)) {
            setVisibleCount(filteredProducts.length);
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setVisibleCount((count) => count + BATCH_SIZE);
            }
        }, { rootMargin: LOAD_AHEAD_MARGIN });
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, visibleCount, filteredProducts.length]);

    // Coming back from a product: once the list is long enough again,
    // jump to where the visitor was before the first paint.
    const restoredRef = useRef(false);
    useLayoutEffect(() => {
        if (!savedPosition || restoredRef.current || !fullListReady) return;
        restoredRef.current = true;
        // 'instant': globals.css sets scroll-behavior: smooth, which would
        // animate the page down from the top for about a second.
        window.scrollTo({ top: savedPosition.scrollY, behavior: 'instant' });
    }, [savedPosition, fullListReady]);

    // Saved on click (capture phase, before next/link navigates).
    const rememberPosition = useCallback(() => {
        try {
            window.sessionStorage.setItem(POSITION_KEY, JSON.stringify({
                url: currentListUrl(),
                count: visibleCount,
                scrollY: window.scrollY,
            }));
        } catch {
            // Storage unavailable (private mode): coming back starts at the top.
        }
    }, [visibleCount]);

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
        // Only the full list can say there is no match.
        if (!fullListReady) return;
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
    }, [fullListReady, filteredProducts.length, searchQuery, categoryFilter, categoryIdFilter, countryFilter, suggestedProducts.length, track]);

    if (loading || (filteredProducts.length === 0 && !fullListReady)) {
        return (
            <div className={`grid ${gridColsClass} gap-6`}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-[420px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
                ))}
            </div>
        );
    }

    // Sponsored slot is always the first tile — on normal pages and on the
    // zero-result view alike, so a non-matching search never hides the ad.
    const sponsoredSlot = sponsoredAd
        ? <SponsoredPackageCard ad={sponsoredAd} categories={categories} />
        : <SponsoredProductPlaceholder />;

    if (filteredProducts.length === 0) {
        // The sponsored tile takes one slot, same as the first batch
        const suggested = suggestedProducts.slice(0, FIRST_BATCH);
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
                    <div className="flex items-center gap-3 mb-5 mt-4">
                        <div className="flex-1 h-px bg-[rgba(255,255,255,0.1)]" />
                        <span className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold">
                            You might also like
                        </span>
                        <div className="flex-1 h-px bg-[rgba(255,255,255,0.1)]" />
                    </div>
                )}
                <div className={`grid ${gridColsClass} gap-6`}>
                    {sponsoredSlot}
                    {suggested.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            categories={categories}
                            isFavorited={isFavorited(product.id)}
                            onToggleFavorite={toggleFavorite}
                            ownerRole={ownerRoles.get(product.userId)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div onClickCapture={rememberPosition}>
            <div className={`grid ${gridColsClass} gap-6`}>
                {sponsoredSlot}
                {visibleProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        categories={categories}
                        isFavorited={isFavorited(product.id)}
                        onToggleFavorite={toggleFavorite}
                        ownerRole={ownerRoles.get(product.userId)}
                    />
                ))}
            </div>

            {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
            {waitingForMore && (
                <div className="flex justify-center mt-10" role="status" aria-label="Loading more products">
                    <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            {!hasMore && fullListReady && filteredProducts.length > FIRST_BATCH && (
                <p className="text-center text-sm text-[#A0A0A0] mt-10">
                    You&rsquo;ve seen all {filteredProducts.length.toLocaleString('en-US')} products
                </p>
            )}
        </div>
    );
}

function ProductCard({ product, categories, isFavorited, onToggleFavorite, ownerRole }) {
    const [imageLoading, setImageLoading] = useState(true);

    // Resolve category name from categoryId
    const category = categories?.find(c => c.value === product.categoryId);
    const categoryName = category?.name || product.category || '';
    const isLogistics = ownerRole === 'logistics_provider';

    return (
        <Link
            href={`/product/${product.id}`}
            className="product-grid-card group"
            style={isLogistics ? { borderColor: 'rgba(226, 88, 34, 0.55)' } : undefined}
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
                        <ProductThumbImg
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
                                <CurrencySymbol symbol={CURRENCY_SYMBOLS[product.currency] || product.currency || '$'} /> {product.price}
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
 * SponsoredPackageCard — /products slot for the unified SPONSORED tier.
 *
 * The ad doc only stores a productId; we resolve the real product doc
 * at render time so the card always reflects the seller's latest price,
 * image, and stock state. Visually it reuses the local ProductCard with
 * a gold-tinted overlay border + "Sponsored" badge so the slot reads
 * as promoted content without breaking grid alignment.
 */
function SponsoredPackageCard({ ad, categories }) {
    const { setRef, trackClick } = useTrackAd(ad.id, 'products_list');
    const productId = ad.productsListProductId || ad.heroProductId
        || (Array.isArray(ad.showcaseProductIds) ? ad.showcaseProductIds[0] : null);
    const productMap = useProductsByIds(productId ? [productId] : []);
    const cachedProduct = sponsoredCache?.ad.id === ad.id && sponsoredCache.product.id === productId
        ? sponsoredCache.product
        : null;
    // has(): a deleted product resolves to null, which must not fall back to the cache.
    const product = !productId ? null
        : productMap.has(productId) ? productMap.get(productId) : cachedProduct;

    useEffect(() => {
        if (product) sponsoredCache = { ad, product };
    }, [ad, product]);

    if (!product) return <SponsoredProductPlaceholder />;

    return (
        <div
            ref={setRef}
            onClick={trackClick}
            className="sponsored-slot relative"
        >
            {/* Badge sits on the image corner (card padding 20px + 8px), mirroring the favorite button */}
            <span
                className="absolute top-[28px] left-[28px] z-20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider pointer-events-none"
                style={{ background: '#FFD700', color: '#0F1B2B' }}
            >
                Sponsored
            </span>
            <ProductCard
                product={product}
                categories={categories}
            />
        </div>
    );
}

/**
 * SponsoredProductPlaceholder — dashed-gold "book this spot" card that
 * takes the same top slot as SponsoredProductCard when no live ad is
 * running for the sponsored product slot. Mirrors ProductCard's DOM +
 * spacing so the grid alignment stays identical; only the border style
 * and copy swap to signal availability. Clicking routes into the
 * pricing inquiry form with the Sponsored Product package pre-selected.
 */
function SponsoredProductPlaceholder() {
    return (
        <Link
            href="/pricing/inquire?type=sponsored_product"
            aria-label="Book the Sponsored Product placement"
            className="product-grid-card group relative"
            style={{
                border: '2px dashed rgba(255,215,0,0.55)',
                background: '#0f1b2b',
                textDecoration: 'none',
            }}
        >
            <span
                className="absolute top-[28px] left-[28px] z-20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: '#FFD700', color: '#0F1B2B' }}
            >
                Available
            </span>

            {/* Image Area — matches ProductCard shape with a dashed gold
                "+" placeholder in place of the product image. */}
            <div className="aspect-[4/3] w-full rounded-xl mb-4 overflow-hidden relative flex items-center justify-center"
                 style={{
                     background: '#0f1b2b',
                     border: '1px dashed rgba(255,215,0,0.4)',
                 }}
            >
                <div className="flex flex-col items-center gap-2 text-[#FFD700]">
                    <span className="text-5xl font-extrabold leading-none">+</span>
                    <span className="text-[11px] uppercase tracking-wider font-bold">Book This Spot</span>
                </div>
            </div>

            {/* Content — matches SponsoredProductCard layout */}
            <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2 text-[#A0A0A0] text-sm">
                    <span className="uppercase tracking-wider text-[10px] text-[#FFD700] font-bold">Ad</span>
                    <span className="truncate">Available</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 leading-tight line-clamp-2 min-h-[44px]">
                    Your Product Here
                </h3>

                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
                    <div className="text-[#FFD700] font-bold text-sm uppercase tracking-wider">
                        Sponsored Spot
                    </div>
                    <div className="px-5 py-2 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full text-center text-sm hover:brightness-110 transition-all">
                        Book →
                    </div>
                </div>
            </div>
        </Link>
    );
}

