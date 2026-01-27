'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { MapPin, Calendar } from 'lucide-react';

export default function FairsPage() {
    const [fairs, setFairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchFairs = async () => {
            try {
                const fairsRepo = container.getFairsRepository();
                const fetchedFairs = await fairsRepo.getAll();
                setFairs(fetchedFairs);
            } catch (error) {
                console.error('Error fetching fairs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFairs();
    }, []);

    const filteredFairs = fairs.filter(fair =>
        fair.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fair.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fair.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (date) => {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ongoing':
                return <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Ongoing</span>;
            case 'upcoming':
                return <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">Upcoming</span>;
            case 'past':
                return <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">Past</span>;
            default:
                return null;
        }
    };

    return (
        <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <section className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 text-white">Global Trade Calendar</h1>
                    <p className="text-[#A0A0A0] mb-8">Discover upcoming exhibitions, conferences, and networking events to expand your business reach.</p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <SearchBar
                            placeholder="Search fairs by name, category, or location..."
                            initialValue={searchQuery}
                            onSearch={(val) => setSearchQuery(val)}
                        />
                    </div>
                </section>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-[320px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredFairs.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Fairs Found</h3>
                        <p className="text-[#A0A0A0]">
                            {searchQuery ? 'Try a different search term.' : 'Check back soon for upcoming trade fairs.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFairs.map((fair) => (
                            <Link
                                key={fair.id}
                                href={`/fair/${fair.id}`}
                                className="product-grid-card !h-auto min-h-[320px] group"
                            >
                                {/* Header with icon and status */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-3xl group-hover:scale-110 group-hover:bg-[rgba(212,175,55,0.1)] transition-all duration-300">
                                        {fair.icon || fair.image || '🌐'}
                                    </div>
                                    {getStatusBadge(fair.status)}
                                </div>

                                {/* Category Badge */}
                                <div className="inline-block mb-3">
                                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider bg-[rgba(212,175,55,0.1)] px-3 py-1 rounded-full">
                                        {fair.category || 'Trade Fair'}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                                    {fair.title}
                                </h3>

                                {/* Location */}
                                <div className="flex items-center gap-2 text-[#A0A0A0] text-sm mb-2">
                                    <MapPin className="w-4 h-4 text-[#D4AF37]" />
                                    {fair.location || 'Location TBA'}
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-2 text-[#A0A0A0] text-sm mb-4">
                                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                                    {fair.startDate && fair.endDate ? (
                                        `${formatDate(fair.startDate)} - ${formatDate(fair.endDate)}`
                                    ) : fair.date ? (
                                        `${fair.date} ${fair.month} ${fair.year}`
                                    ) : (
                                        'Date TBA'
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-[#A0A0A0] text-sm leading-relaxed line-clamp-2 flex-1">
                                    {fair.description || 'More details coming soon.'}
                                </p>

                                {/* View Details Button */}
                                <div className="mt-6 w-full py-3 text-center text-sm font-semibold text-[#d1d5db] bg-[rgba(255,255,255,0.05)] rounded-xl border border-transparent group-hover:bg-[rgba(212,163,69,0.15)] group-hover:text-[#d4a345] group-hover:border-[rgba(212,163,69,0.3)] transition-all">
                                    View Details
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
