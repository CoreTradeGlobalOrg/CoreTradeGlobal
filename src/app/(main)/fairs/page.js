'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';

// Build a lookup map: lowercase country name → 2-letter code (with common aliases)
const COUNTRY_NAME_TO_CODE = {};
COUNTRIES.forEach(c => { COUNTRY_NAME_TO_CODE[c.label.toLowerCase()] = c.value; });
const ALIASES = {
  'uae': 'AE', 'u.a.e': 'AE', 'u.a.e.': 'AE', 'emirates': 'AE',
  'uk': 'GB', 'u.k.': 'GB', 'england': 'GB', 'britain': 'GB',
  'usa': 'US', 'u.s.a': 'US', 'u.s.a.': 'US', 'u.s.': 'US', 'america': 'US',
  'holland': 'NL', 'the netherlands': 'NL', 'netherland': 'NL',
  'south korea': 'KR', 'korea': 'KR',
  'czech republic': 'CZ', 'czechia': 'CZ',
  'ivory coast': 'CI', "cote d'ivoire": 'CI',
  'türkiye': 'TR', 'turkiye': 'TR',
};
Object.entries(ALIASES).forEach(([k, v]) => { COUNTRY_NAME_TO_CODE[k] = v; });

/** Extract country code from location string like "Tashkent – Uzbekistan" */
function getCountryCodeFromLocation(location) {
  if (!location) return null;
  const parts = location.split(/[,–—\-]/).map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const code = COUNTRY_NAME_TO_CODE[parts[i].toLowerCase()];
    if (code) return code;
  }
  return null;
}

export default function FairsPage() {
    const [fairs, setFairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [pastExpanded, setPastExpanded] = useState(false);

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

    const getFairStatus = (fair) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const start = fair.startDate?.toDate ? fair.startDate.toDate() : new Date(fair.startDate);
        const end = fair.endDate?.toDate ? fair.endDate.toDate() : new Date(fair.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (now > end) return 'past';
        if (now >= start && now <= end) return 'ongoing';
        return 'upcoming';
    };

    const getStatusBadge = (fair) => {
        const status = getFairStatus(fair);
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

    // Apply search filter first, then partition by status
    const filteredFairs = fairs.filter(fair =>
        fair.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fair.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fair.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Partition filtered fairs into ongoing, upcoming, past
    const ongoing = filteredFairs
        .filter(f => getFairStatus(f) === 'ongoing')
        .sort((a, b) => {
            const aDate = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
            const bDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
            return aDate - bDate;
        });

    const upcoming = filteredFairs
        .filter(f => getFairStatus(f) === 'upcoming')
        .sort((a, b) => {
            const aDate = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
            const bDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
            return aDate - bDate;
        });

    const past = filteredFairs
        .filter(f => getFairStatus(f) === 'past')
        .sort((a, b) => {
            const aDate = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
            const bDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
            return bDate - aDate; // newest first for past
        });

    const activeFairs = [...ongoing, ...upcoming];
    const totalVisible = activeFairs.length + (pastExpanded ? past.length : 0);

    const getDateInfo = (date) => {
        if (!date) return { day: '--', month: '---' };
        const d = date?.toDate ? date.toDate() : new Date(date);
        return {
            day: d.getDate(),
            month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        };
    };

    const renderFairCard = (fair) => {
        const startDateInfo = getDateInfo(fair.startDate);
        return (
            <Link
                key={fair.id}
                href={`/fair/${fair.id}`}
                className="fair-card fair-card-large"
            >
                <div className="fair-content">
                    {/* Status Badge + Category */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {getStatusBadge(fair)}
                        {fair.category && (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[#FFD700]/20">
                                {fair.category}
                            </span>
                        )}
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

                    {/* Visual Area with Flag or Date fallback */}
                    <div className="fair-visual-area">
                        {(fair.country || getCountryCodeFromLocation(fair.location)) ? (
                            <div className="fair-date-box flex items-center justify-center">
                                <CountryFlag countryCode={fair.country || getCountryCodeFromLocation(fair.location)} size={64} />
                            </div>
                        ) : (
                            <div className="fair-date-box flex flex-col items-center gap-1">
                                <span className="fair-date-day">{startDateInfo.day}</span>
                                <span className="fair-date-month">{startDateInfo.month}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <main className="min-h-screen pt-[var(--navbar-height)] pb-20 px-6 bg-radial-navy">
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
                ) : totalVisible === 0 && past.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Fairs Found</h3>
                        <p className="text-[#A0A0A0]">
                            {searchQuery ? 'Try a different search term.' : 'Check back soon for upcoming trade fairs.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Active fairs: ongoing + upcoming */}
                        {activeFairs.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {activeFairs.map(renderFairCard)}
                            </div>
                        )}

                        {/* Past fairs collapsible section */}
                        {past.length > 0 && (
                            <div className="mt-12">
                                <div className="flex items-center gap-4 mb-6">
                                    <hr className="flex-1 border-[rgba(255,255,255,0.1)]" />
                                    <button
                                        onClick={() => setPastExpanded(v => !v)}
                                        className="flex items-center gap-2 text-[#A0A0A0] text-sm hover:text-white transition-colors"
                                    >
                                        Past Fairs ({past.length})
                                        {pastExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    <hr className="flex-1 border-[rgba(255,255,255,0.1)]" />
                                </div>
                                {pastExpanded && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {past.map(renderFairCard)}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
