import React from 'react';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export const metadata = {
    title: 'Trade Fairs & Events | CoreTradeGlobal',
    description: 'Upcoming global trade exhibitions and networking events.',
};

const FAIRS = [
    {
        id: 1,
        title: "Dubai Big 5",
        category: "Construction",
        date: "04-07",
        month: "DEC",
        year: "2025",
        location: "Dubai, UAE",
        description: "The largest construction event in the Middle East.",
        image: "🏗️"
    },
    {
        id: 2,
        title: "CES Las Vegas",
        category: "Technology",
        date: "08-11",
        month: "JAN",
        year: "2026",
        location: "Las Vegas, USA",
        description: "The most influential tech event in the world.",
        image: "💻"
    },
    {
        id: 3,
        title: "Hannover Messe",
        category: "Industry",
        date: "17-21",
        month: "APR",
        year: "2026",
        location: "Hannover, Germany",
        description: "The world's leading industrial trade fair.",
        image: "⚙️"
    },
    {
        id: 4,
        title: "Canton Fair",
        category: "General Consumer",
        date: "15-19",
        month: "OCT",
        year: "2025",
        location: "Guangzhou, China",
        description: "China's biggest import and export fair.",
        image: "🌏"
    },
    {
        id: 5,
        title: "FinTech London",
        category: "Finance",
        date: "15-16",
        month: "JUN",
        year: "2026",
        location: "London, UK",
        description: "Connecting the global fintech ecosystem.",
        image: "💷"
    },
    {
        id: 6,
        title: "Marseille Meetup",
        category: "Networking",
        date: "12",
        month: "JUL",
        year: "2026",
        location: "Marseille, France",
        description: "Exclusive networking for Euro-Med traders.",
        image: "🤝"
    }
];

export default function FairsPage() {
    return (
        <div className="bg-[var(--color-bg-base)] min-h-screen text-[var(--color-text-primary)]">
            <Navbar />

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto">
                {/* Header */}
                <section className="mb-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[var(--color-primary)]">
                        Global Trade Calendar
                    </h1>
                    <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
                        Discover upcoming exhibitions, conferences, and networking events to expand your business reach.
                    </p>
                </section>

                {/* Fairs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {FAIRS.map((fair) => (
                        <div
                            key={fair.id}
                            className="group bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-primary)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                        >
                            <div className="p-6 relative">
                                {/* Date Badge */}
                                <div className="absolute top-6 right-6 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-2 text-center min-w-[60px]">
                                    <div className="text-xs text-[var(--color-text-muted)] font-bold">{fair.year}</div>
                                    <div className="text-lg font-bold text-[var(--color-primary)]">{fair.date}</div>
                                    <div className="text-xs font-bold">{fair.month}</div>
                                </div>

                                <div className="w-12 h-12 bg-[rgba(255,255,255,0.05)] rounded-full flex items-center justify-center text-2xl mb-4">
                                    {fair.image}
                                </div>

                                <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-2">
                                    {fair.category}
                                </div>

                                <h3 className="text-2xl font-bold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                                    {fair.title}
                                </h3>

                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm mb-4">
                                    <span>📍</span>
                                    {fair.location}
                                </div>

                                <p className="text-[var(--color-text-tertiary)] text-sm leading-relaxed mb-6">
                                    {fair.description}
                                </p>

                                <button className="w-full py-3 bg-[rgba(255,255,255,0.05)] rounded-xl font-semibold hover:bg-[var(--color-primary)] hover:text-[#0F1B2B] transition-colors">
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
