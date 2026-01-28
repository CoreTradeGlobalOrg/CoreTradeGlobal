'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { MapPin } from 'lucide-react';

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
        fair.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fair.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fair.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ongoing':
                return <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Ongoing</span>;
            case 'upcoming':
                return <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30">Upcoming</span>;
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
                    <h1 className="text-4xl font-bold mb-4" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Global Trade Calendar</h1>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-[420px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse"></div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredFairs.map((fair) => {
                            const getDateInfo = (date) => {
                                if (!date) return { day: '--', month: '---' };
                                const d = date?.toDate ? date.toDate() : new Date(date);
                                return {
                                    day: d.getDate(),
                                    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
                                };
                            };
                            const startDateInfo = getDateInfo(fair.startDate);

                            return (
                                <Link
                                    key={fair.id}
                                    href={`/fair/${fair.id}`}
                                    className="fair-card fair-card-large"
                                >
                                    <div className="fair-content">
                                        {/* Status Badge */}
                                        <div className="mb-3">
                                            {getStatusBadge(fair.status)}
                                        </div>

                                        {/* Fair Title */}
                                        <h3 className="fair-card-title">{fair.name}</h3>

                                        {/* Location */}
                                        <div className="fair-card-location">
                                            <MapPin className="w-4 h-4" />
                                            <span>{fair.location || 'Location TBA'}</span>
                                        </div>

                                        {/* Description */}
                                        <p className="fair-card-desc">{fair.description || 'More details coming soon.'}</p>

                                        {/* Visual Area with Date */}
                                        <div className="fair-visual-area">
                                            <div className="fair-date-box">
                                                <span className="fair-date-day">{startDateInfo.day}</span>
                                                <span className="fair-date-month">{startDateInfo.month}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
