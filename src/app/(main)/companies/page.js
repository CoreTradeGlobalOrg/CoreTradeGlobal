'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, Building2 } from 'lucide-react';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { container } from '@/core/di/container';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
    if (!countryCode) return 'Global';
    const country = COUNTRIES.find(c => c.value === countryCode);
    if (country) {
        return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
    }
    return countryCode;
};

// Get abbreviation from company name
const getAbbreviation = (name) => {
    if (!name) return '??';
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

function CompanyCard({ company }) {
    const [imgError, setImgError] = useState(false);
    const profileImage = company.companyLogo || company.photoURL;
    const hasImage = profileImage && !imgError;

    return (
        <Link
            href={`/profile/${company.id}`}
            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:border-[var(--color-primary)] transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer block"
        >
            {/* Image/Logo Area */}
            <div className="w-full h-40 bg-[var(--color-bg-tertiary)] flex items-center justify-center overflow-hidden">
                {hasImage ? (
                    <img
                        src={profileImage}
                        alt={company.companyName}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="text-4xl font-extrabold text-[var(--color-primary)]">
                        {getAbbreviation(company.companyName)}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <CountryFlag countryCode={company.country} size={18} />
                        <span>{getCountryName(company.country)}</span>
                    </div>
                    <div className="bg-[rgba(16,185,129,0.1)] text-[#10b981] p-1.5 rounded-full" title="Verified">
                        <UserCheck size={16} />
                    </div>
                </div>

                <h3 className="text-lg font-bold mb-2 truncate text-white">{company.companyName}</h3>

                {company.industry && (
                    <p className="text-sm text-[var(--color-primary)] mb-3">{company.industry}</p>
                )}

                <div className="w-full py-2.5 bg-gradient-to-r from-[#D4A745] to-[#E0B555] rounded-full text-sm font-bold text-[#0F1B2B] text-center">
                    View Profile
                </div>
            </div>
        </Link>
    );
}

function CompaniesContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';
    const initialCountry = searchParams.get('country') || '';

    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);

    // Fetch verified companies from Firebase
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const firestoreDS = container.getFirestoreDataSource();
                const allUsers = await firestoreDS.query('users', { limit: 100 });

                if (allUsers && allUsers.length > 0) {
                    // Filter: must have company name, email verified, admin approved, and not suspended
                    const verifiedCompanies = allUsers.filter(u =>
                        u.companyName &&
                        u.emailVerified === true &&
                        u.adminApproved === true &&
                        !u.isSuspended
                    );

                    const sorted = verifiedCompanies.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                        return dateB - dateA;
                    });

                    setCompanies(sorted);
                    setFilteredCompanies(sorted);
                }
            } catch (error) {
                console.error('Error fetching companies:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCompanies();
    }, []);

    // Filter companies based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredCompanies(companies);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = companies.filter(company => {
            const companyName = (company.companyName || '').toLowerCase();
            const industry = (company.industry || '').toLowerCase();
            const country = getCountryName(company.country).toLowerCase();

            return companyName.includes(query) ||
                   industry.includes(query) ||
                   country.includes(query);
        });

        setFilteredCompanies(filtered);
    }, [searchQuery, companies]);

    // Apply initial country filter if present
    useEffect(() => {
        if (initialCountry && companies.length > 0) {
            const filtered = companies.filter(c => c.country === initialCountry);
            setFilteredCompanies(filtered);
        }
    }, [initialCountry, companies]);

    return (
        <>
            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold mb-3" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Verified Suppliers</h1>
                <p className="text-[#A0A0A0] mb-8">Trusted partners verified by CoreTradeGlobal.</p>

                <div className="max-w-2xl mx-auto">
                    <SearchBar
                        placeholder="Search companies by name, industry, or country..."
                        initialValue={searchQuery}
                        onSearch={(val) => setSearchQuery(val)}
                    />
                </div>
            </div>

            {initialCountry && (
                <div className="mb-6 flex items-center gap-2">
                    <span className="text-[#A0A0A0]">Filtering by country:</span>
                    <span className="bg-[#FFD700] text-[#0F1B2B] px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                        <CountryFlag countryCode={initialCountry} size={16} />
                        {getCountryName(initialCountry)}
                    </span>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                            <div className="w-full h-40 bg-[var(--color-bg-tertiary)] animate-pulse" />
                            <div className="p-5">
                                <div className="h-4 bg-[var(--color-bg-tertiary)] rounded animate-pulse mb-3" />
                                <div className="h-6 bg-[var(--color-bg-tertiary)] rounded animate-pulse mb-2" />
                                <div className="h-4 bg-[var(--color-bg-tertiary)] rounded animate-pulse w-20 mb-3" />
                                <div className="h-10 bg-[var(--color-bg-tertiary)] rounded-full animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredCompanies.length === 0 ? (
                <div className="text-center py-20">
                    <Building2 size={64} className="mx-auto text-[var(--color-text-secondary)] mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Companies Found</h3>
                    <p className="text-[var(--color-text-secondary)]">
                        {searchQuery
                            ? `No verified companies match "${searchQuery}"`
                            : 'No verified companies available at the moment.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
                        Showing {filteredCompanies.length} verified {filteredCompanies.length === 1 ? 'company' : 'companies'}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCompanies.map((company) => (
                            <CompanyCard key={company.id} company={company} />
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

export default function CompaniesPage() {
    return (
        <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
                    <CompaniesContent />
                </Suspense>
            </div>
        </main>
    );
}
