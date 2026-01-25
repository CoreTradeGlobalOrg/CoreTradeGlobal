'use client';

import { RequestGrid } from '@/presentation/components/features/request/RequestGrid/RequestGrid';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RequestsPage() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';

    const [searchQuery, setSearchQuery] = useState(initialSearch);

    // Update state if URL params change
    useEffect(() => {
        setSearchQuery(initialSearch);
    }, [initialSearch]);

    return (
        <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-3">Live RFQ Feed</h1>
                    <p className="text-[#A0A0A0] mb-8">Browse active buying requests from vetted companies worldwide.</p>

                    <SearchBar
                        placeholder="Search RFQs by keyword, country..."
                        initialValue={searchQuery}
                        onSearch={setSearchQuery}
                    />
                </div>
                <RequestGrid searchQuery={searchQuery} />
            </div>
        </main>
    );
}
