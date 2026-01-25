'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';

// Default Categories Fallback
const DEFAULT_CATEGORIES = [
    { id: '1', name: 'Electronics', icon: '⚡' },
    { id: '2', name: 'Textiles', icon: '🧶' },
    { id: '3', name: 'Food & Beverages', icon: '🍎' },
    { id: '4', name: 'Machinery', icon: '⚙️' },
    { id: '5', name: 'Chemicals', icon: '🧪' },
    { id: '6', name: 'Automotive', icon: '🚗' },
    { id: '7', name: 'Furniture', icon: '🛋️' },
    { id: '8', name: 'Cosmetics', icon: '💄' },
    { id: '9', name: 'Construction', icon: '🏗️' },
    { id: '10', name: 'Jewelry', icon: '💎' },
    { id: '11', name: 'Agriculture', icon: '🌾' },
    { id: '12', name: 'Other', icon: '📦' },
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoryRepo = container.getCategoryRepository();
                const fetchedCategories = await categoryRepo.getAll();

                if (fetchedCategories.length > 0) {
                    // Map fetched to display format
                    const mapped = fetchedCategories.map((cat, index) => {
                        // Priority: DB iconUrl > DB Icon > DB Emoji > Default Fallback
                        const icon = cat.iconUrl || cat.icon || cat.emoji || '📦';
                        return {
                            id: cat.id,
                            name: cat.name,
                            icon: icon,
                            count: cat.productCount || 0
                        };
                    });
                    setCategories(mapped);
                } else {
                    setCategories(DEFAULT_CATEGORIES);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                setCategories(DEFAULT_CATEGORIES);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[var(--bg-deep-navy)] text-[var(--color-text-primary)]">
            <Navbar />

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto">
                <section className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 text-white">Browse by Industry</h1>
                    <p className="text-[var(--text-grey)] mb-8">Explore thousands of verified suppliers across major sectors.</p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <SearchBar
                            placeholder="Search categories..."
                            initialValue={searchQuery}
                            onSearch={(val) => setSearchQuery(val)}
                        />
                    </div>
                </section>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-40 bg-[rgba(255,255,255,0.05)] rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredCategories.map((category) => (
                            <Link
                                key={category.id}
                                href={`/products?category=${category.id}`}
                                className="bg-[rgba(26,40,59,0.4)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 flex flex-col items-center justify-center hover:border-[var(--accent-gold)] hover:bg-[rgba(255,255,255,0.05)] transition-all hover:-translate-y-1 group"
                            >
                                <div className="mb-4 h-16 w-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    {category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/')) ? (
                                        <img src={category.icon} alt={category.name} className="w-full h-full object-contain filter drop-shadow-lg" />
                                    ) : (
                                        <span className="text-4xl filter drop-shadow-lg">{category.icon}</span>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold mb-1 text-center text-[#F5F5F5]">{category.name}</h3>
                                {/* Listing count removed per user request */}
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
