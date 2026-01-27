/**
 * RequestGrid Component
 *
 * Displays a grid of requests using the .rfq-card style (Dark Theme)
 * Matches FeaturedRFQs EXACTLY
 * Supports filtering props
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
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

// Default RFQs - country is ISO code
const DEFAULT_RFQS = [
    {
        id: '1',
        title: 'Steel Beams H-Profile for Construction Project',
        quantity: '500 Tons',
        deadline: '2 hrs ago',
        country: 'DE',
        budget: 'Open',
        badge: 'Urgent',
        description: 'Seeking high-quality H-Profile steel beams for a large scale commercial project in Berlin. Standard DIN 1025.'
    },
    {
        id: '2',
        title: 'Organic Cotton Fabric Rolls',
        quantity: '20,000 Meters',
        deadline: '4 hrs ago',
        country: 'US',
        budget: '$150k - $200k',
        badge: 'New',
        description: 'Looking for GOTS certified organic cotton fabric manufacturers. Sample required before bulk order.'
    },
    {
        id: '3',
        title: 'Automotive Brake Pads (Ceramic)',
        quantity: '5,000 Sets',
        deadline: '6 hrs ago',
        country: 'JP',
        budget: 'Market Price',
        badge: 'New',
        description: 'Distributor seeking OEM standard ceramic brake pads for Japanese car models (Toyota, Honda).'
    },
    {
        id: '4',
        title: 'Bulk Wheat Grain (Hard Red Winter)',
        quantity: '1,000 Tons',
        deadline: '1 day ago',
        country: 'EG',
        budget: '$280/Ton',
        badge: 'Urgent',
        description: 'Immediate requirement for milling grade wheat. CIF Alexandria port. Payment via LC.'
    },
    {
        id: '5',
        title: 'Polypropylene (PP) Granules',
        quantity: '200 Tons',
        deadline: '1 day ago',
        country: 'PL',
        budget: 'Negotiable',
        badge: 'New',
        description: 'Injection molding grade PP required for plastic container manufacturing. Monthly recurring order.'
    },
    {
        id: '6',
        title: 'Solar Inverters 5kW Hybrid',
        quantity: '100 Units',
        deadline: '2 days ago',
        country: 'ZA',
        budget: '$50k Total',
        badge: 'New',
        description: 'Looking for reliable suppliers of hybrid solar inverters compatible with lithium batteries.'
    }
];

export function RequestGrid({ searchQuery, categoryFilter }) {
    const [requests, setRequests] = useState(DEFAULT_RFQS);
    const [filteredRequests, setFilteredRequests] = useState(DEFAULT_RFQS);
    const [loading, setLoading] = useState(true);

    // Fetch RFQs
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const firestoreDS = container.getFirestoreDataSource();
                const allRequests = await firestoreDS.query('requests', { limit: 50 });

                if (allRequests && allRequests.length > 0) {
                    const active = allRequests.filter(r => r.status === 'active');
                    const sorted = active.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                        return dateB - dateA;
                    });

                    if (sorted.length > 0) {
                        setRequests(
                            sorted.map((r) => {
                                return {
                                    ...r,
                                    title: r.productName || r.title,
                                    country: r.targetCountry || r.country, // ISO code
                                    deadline: r.deadline || 'ASAP',
                                    budget: r.budget || 'Negotiable',
                                };
                            })
                        );
                    }
                }
            } catch (error) {
                console.error('Error fetching requests:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = requests;

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.title.toLowerCase().includes(lowerQ) ||
                (r.description && r.description.toLowerCase().includes(lowerQ)) ||
                (r.category && r.category.toLowerCase().includes(lowerQ)) ||
                (r.country && r.country.toLowerCase().includes(lowerQ))
            );
        }

        // We can add category filtering here too if requests have category field

        setFilteredRequests(result);
    }, [requests, searchQuery]);


    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[300px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
                ))}
            </div>
        );
    }

    if (filteredRequests.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2">No active requests found</h3>
                <p className="text-[#A0A0A0]">Try adjusting your search.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((rfq) => (
                <div key={rfq.id} className="rfq-card">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${rfq.badge === 'Urgent' ? 'bg-[rgba(239,68,68,0.15)] text-[#f87171] border border-[rgba(239,68,68,0.3)]' : 'bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)]'}`}>
                            {rfq.badge || 'New'}
                        </span>
                        <span className="text-xs text-[var(--text-grey)]">{rfq.deadline}</span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-3 leading-snug">{rfq.title}</h3>

                    <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 mb-4 flex flex-col gap-2">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text-grey)]">Quantity:</span>
                            <span className="text-white font-semibold">{rfq.quantity}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text-grey)]">Budget:</span>
                            <span className="text-white font-semibold">{rfq.budget}</span>
                        </div>
                    </div>

                    {rfq.description && (
                        <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 line-clamp-2 overflow-hidden">{rfq.description}</p>
                    )}

                    <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-[13px] text-white">
                            <CountryFlag countryCode={rfq.country} size={16} />
                            <span>{getCountryName(rfq.country)}</span>
                        </div>
                        <Link href={`/request/${rfq.id}`}>
                            <button className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white border-0 px-5 py-2 rounded-full text-[13px] font-semibold shadow-lg hover:bg-blue-400 hover:-translate-y-0.5 transition-all">Quote Now</button>
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}
