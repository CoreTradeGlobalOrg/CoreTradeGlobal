'use client';

import { ProductGrid } from '@/presentation/components/features/product/ProductGrid/ProductGrid';
import { ProductCategorySidebar } from '@/presentation/components/features/product/ProductCategorySidebar/ProductCategorySidebar';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { X } from 'lucide-react';

export function ProductsPageClient({ initialProducts = [], initialSearchParams = {} }) {
    // We used to read initial state via `useSearchParams()` wrapped in
    // a Suspense boundary. In Next 16 that pattern forces the WHOLE
    // Suspense subtree (including <ProductGrid>) to
    // BAILOUT_TO_CLIENT_SIDE_RENDERING — so Googlebot's view of
    // /products was a skeleton grid, nothing crawlable. Receiving the
    // initial params as a prop from the server shell keeps SSR intact.
    // Live URL updates still work via router.replace below; back/
    // forward state is read straight off window.location inside the
    // handlers to avoid re-introducing useSearchParams.
    const router = useRouter();
    const pathname = usePathname();

    const initialCategory = initialSearchParams.category || '';
    const initialCategoryId = initialSearchParams.categoryId || '';
    const initialSearch = initialSearchParams.search || '';
    const initialCountry = initialSearchParams.country || '';

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [countryFilter, setCountryFilter] = useState(initialCountry);
    const [displayName, setDisplayName] = useState(initialCategory || 'Selected Category');

    const getCurrentParams = useCallback(() => {
        if (typeof window === 'undefined') return new URLSearchParams();
        return new URLSearchParams(window.location.search);
    }, []);

    const handleSearch = useCallback((value) => {
        setSearchQuery(value);
        const params = getCurrentParams();
        if (value) params.set('search', value);
        else params.delete('search');
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router, getCurrentParams]);

    const handleCountryChange = useCallback((value) => {
        setCountryFilter(value);
        const params = getCurrentParams();
        if (value) params.set('country', value);
        else params.delete('country');
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router, getCurrentParams]);

    const handleCategorySelect = useCallback((categoryId) => {
        const params = getCurrentParams();
        if (categoryId) {
            params.set('categoryId', categoryId);
            params.delete('category');
        } else {
            params.delete('categoryId');
            params.delete('category');
        }
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router, getCurrentParams]);

    // Resolve the human-readable category label — the page.jsx shell
    // passes down categoryId/category raw, this effect fills in the
    // name once the Firestore lookup resolves (or when the user
    // navigates to a new category client-side).
    useEffect(() => {
        if (initialCategory) {
            setDisplayName(initialCategory);
            return;
        }
        if (!initialCategoryId) {
            setDisplayName('Selected Category');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const categoryRepo = container.getCategoryRepository();
                const category = await categoryRepo.getById(initialCategoryId);
                if (!cancelled && category?.name) setDisplayName(category.name);
            } catch (error) {
                console.error('Error fetching category name:', error);
            }
        })();
        return () => { cancelled = true; };
    }, [initialCategory, initialCategoryId]);

    return (
        <main className="min-h-screen pt-[calc(var(--navbar-height)+24px)] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold mb-3" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Explore Latest Products</h1>
                    <p className="text-[#A0A0A0] mb-8">Source high-quality materials from verified global suppliers.</p>

                    <div className="max-w-2xl mx-auto">
                        <SearchBar
                            placeholder="Search products..."
                            initialValue={searchQuery}
                            onSearch={handleSearch}
                        />
                    </div>
                </div>

                {/* Sidebar + Grid layout */}
                <div className="flex gap-6 items-start">
                    <ProductCategorySidebar
                        activeCategoryId={initialCategoryId}
                        activeCountry={countryFilter}
                        onCategorySelect={handleCategorySelect}
                        onCountrySelect={handleCountryChange}
                    />

                    <div className="flex-1 min-w-0">
                        {((initialCategory || initialCategoryId) || countryFilter) && (
                            <div className="mb-6 flex items-center gap-2 flex-wrap">
                                {(initialCategory || initialCategoryId) && (
                                    <>
                                        <span className="text-[#A0A0A0]">Category:</span>
                                        <span className="bg-[#FFD700] text-[#0F1B2B] px-3 py-1 rounded-full text-sm font-bold capitalize">
                                            {displayName}
                                        </span>
                                    </>
                                )}
                                {countryFilter && (
                                    <>
                                        <span className="text-[#A0A0A0]">{(initialCategory || initialCategoryId) ? '·' : ''} Country:</span>
                                        <span className="bg-[rgba(255,255,255,0.1)] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                            <CountryFlag countryCode={countryFilter} size={14} />
                                            {COUNTRIES.find(c => c.value === countryFilter)?.label?.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim() || countryFilter}
                                            <button onClick={() => handleCountryChange('')} className="ml-1 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        <ProductGrid
                            searchQuery={searchQuery}
                            categoryFilter={initialCategory}
                            categoryIdFilter={initialCategoryId}
                            countryFilter={countryFilter}
                            sidebarVisible
                            initialProducts={initialProducts}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
