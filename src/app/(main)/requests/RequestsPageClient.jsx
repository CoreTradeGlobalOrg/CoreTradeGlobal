'use client';

import { RequestGrid } from '@/presentation/components/features/request/RequestGrid/RequestGrid';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function RequestsPageClient({ initialRequests = [], initialSearchParams = {} }) {
    // Same reasoning as /products: useSearchParams forces a Suspense
    // bailout that strips the SSR'd grid. Initial params come from the
    // server shell as a plain object; live URL mutations happen via
    // router.replace + window.location below.
    const router = useRouter();
    const pathname = usePathname();

    const initialSearch = initialSearchParams.search || '';
    const [searchQuery, setSearchQuery] = useState(initialSearch);

    const handleSearch = useCallback((value) => {
        setSearchQuery(value);
        const params = typeof window === 'undefined'
            ? new URLSearchParams()
            : new URLSearchParams(window.location.search);
        if (value) params.set('search', value);
        else params.delete('search');
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    return (
        <main className="min-h-screen pt-[calc(var(--navbar-height)+24px)] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold mb-3" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Live RFQ Feed</h1>
                    <p className="text-[#A0A0A0] mb-8">Browse active buying requests from vetted companies worldwide.</p>

                    <SearchBar
                        placeholder="Search RFQs by keyword, country..."
                        initialValue={searchQuery}
                        onSearch={handleSearch}
                    />
                </div>
                <RequestGrid searchQuery={searchQuery} initialRequests={initialRequests} />
            </div>
        </main>
    );
}
