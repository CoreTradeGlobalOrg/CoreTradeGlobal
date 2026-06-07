'use client';

import { RequestGrid } from '@/presentation/components/features/request/RequestGrid/RequestGrid';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function RequestsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialSearch = searchParams.get('search') || '';

    const [searchQuery, setSearchQuery] = useState(initialSearch);

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
    }, [initialSearch]);

    return (
        <>
            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold mb-3" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Live RFQ Feed</h1>
                <p className="text-[#A0A0A0] mb-8">Browse active buying requests from vetted companies worldwide.</p>

                <SearchBar
                    placeholder="Search RFQs by keyword, country..."
                    initialValue={searchQuery}
                    onSearch={handleSearch}
                />
            </div>
            <RequestGrid searchQuery={searchQuery} />
        </>
    );
}

export default function RequestsPage() {
    return (
        <main className="min-h-screen pt-[calc(var(--navbar-height)+24px)] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <Suspense fallback={
                  <div className="space-y-6 pt-10">
                    <div className="h-8 w-64 mx-auto rounded-2xl bg-[rgba(255,255,255,0.07)] animate-pulse" />
                    <div className="h-4 w-48 mx-auto rounded-2xl bg-[rgba(255,255,255,0.05)] animate-pulse" />
                    <div className="h-12 max-w-2xl mx-auto rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
                      ))}
                    </div>
                  </div>
                }>
                    <RequestsContent />
                </Suspense>
            </div>
        </main>
    );
}
