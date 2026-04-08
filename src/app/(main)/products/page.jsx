'use client';

import { ProductGrid } from '@/presentation/components/features/product/ProductGrid/ProductGrid';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { container } from '@/core/di/container';

function ProductsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialCategory = searchParams.get('category') || '';
    const initialCategoryId = searchParams.get('categoryId') || '';
    const initialSearch = searchParams.get('search') || '';

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [displayName, setDisplayName] = useState(initialCategory || 'Selected Category');

    // Update URL when search changes
    const handleSearch = useCallback((value) => {
        setSearchQuery(value);

        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }

        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [searchParams, pathname, router]);

    // Update state if URL params change
    useEffect(() => {
        setSearchQuery(initialSearch);

        if (initialCategory) {
            setDisplayName(initialCategory);
        } else if (initialCategoryId) {
            // Fetch name from ID
            const fetchCategoryName = async () => {
                try {
                    const categoryRepo = container.getCategoryRepository();
                    const category = await categoryRepo.getById(initialCategoryId);
                    if (category && category.name) {
                        setDisplayName(category.name);
                    }
                } catch (error) {
                    console.error('Error fetching category name:', error);
                }
            };
            fetchCategoryName();
        } else {
            setDisplayName('Selected Category');
        }
    }, [initialSearch, initialCategory, initialCategoryId]);

    return (
        <>
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

            {(initialCategory || initialCategoryId) && (
                <div className="mb-6 flex items-center gap-2">
                    <span className="text-[#A0A0A0]">Filtering by category:</span>
                    <span className="bg-[#FFD700] text-[#0F1B2B] px-3 py-1 rounded-full text-sm font-bold capitalize">
                        {displayName}
                    </span>
                </div>
            )}

            <ProductGrid
                searchQuery={searchQuery}
                categoryFilter={initialCategory}
                categoryIdFilter={initialCategoryId}
            />
        </>
    );
}

export default function ProductsPage() {
    return (
        <main className="min-h-screen pt-[var(--navbar-height)] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <Suspense fallback={
                  <div className="space-y-6 pt-10">
                    <div className="h-8 w-64 mx-auto rounded-2xl bg-[rgba(255,255,255,0.07)] animate-pulse" />
                    <div className="h-4 w-48 mx-auto rounded-2xl bg-[rgba(255,255,255,0.05)] animate-pulse" />
                    <div className="h-12 max-w-2xl mx-auto rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                      {[1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
                      ))}
                    </div>
                  </div>
                }>
                    <ProductsContent />
                </Suspense>
            </div>
        </main>
    );
}
