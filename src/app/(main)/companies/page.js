import React from 'react';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { UserCheck } from 'lucide-react';

export const metadata = {
    title: 'Verified Companies | CoreTradeGlobal',
    description: 'Connect with verified manufacturers and exporters.',
};

const COMPANIES = [
    { name: 'EuroLogistics GmbH', country: 'Germany', flag: '🇩🇪', type: 'Logistics', logo: 'EL' },
    { name: 'AsiaTech Mfg', country: 'China', flag: '🇨🇳', type: 'Electronics', logo: 'AT' },
    { name: 'Anatolia Textile', country: 'Turkey', flag: '🇹🇷', type: 'Textile', logo: 'AX' },
    { name: 'Royal Steel Industries', country: 'UK', flag: '🇬🇧', type: 'Industrial', logo: 'RS' },
    { name: 'Koto Automotive Parts', country: 'Japan', flag: '🇯🇵', type: 'Automotive', logo: 'KA' },
    { name: 'Brasilia Coffee Exp.', country: 'Brazil', flag: '🇧🇷', type: 'Food', logo: 'BC' },
    { name: 'Nordic Supply Co.', country: 'Sweden', flag: '🇸🇪', type: 'Materials', logo: 'NS' },
    { name: 'US Polymers Inc.', country: 'USA', flag: '🇺🇸', type: 'Chemical', logo: 'UP' },
];

export default function CompaniesPage() {
    return (
        <div className="bg-[var(--color-bg-base)] min-h-screen text-[var(--color-text-primary)]">
            <Navbar />

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto">
                <section className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-[var(--color-primary)]">Verified Suppliers</h1>
                        <p className="text-[var(--color-text-secondary)]">Trusted partners freshly verified by CoreTradeGlobal.</p>
                    </div>

                    <button className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-primary)] hover:text-[#0F1B2B] text-[var(--color-text-primary)] px-6 py-3 rounded-full font-semibold transition-colors">
                        Register Your Company
                    </button>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {COMPANIES.map((company, index) => (
                        <div
                            key={index}
                            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 hover:border-[var(--color-primary)] transition-all hover:shadow-xl cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-16 h-16 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center text-xl font-bold text-[var(--color-primary)] border border-[var(--color-border)]">
                                    {company.logo}
                                </div>
                                <div className="bg-[rgba(16,185,129,0.1)] text-[#10b981] p-2 rounded-full" title="Verified">
                                    <UserCheck size={20} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-1 truncate">{company.name}</h3>

                            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-4">
                                <span className="text-lg">{company.flag}</span>
                                <span>{company.country}</span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full mx-1"></span>
                                <span className="text-[var(--color-primary)]">{company.type}</span>
                            </div>

                            <button className="w-full py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-[#0F1B2B] transition-colors">
                                View Profile
                            </button>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
