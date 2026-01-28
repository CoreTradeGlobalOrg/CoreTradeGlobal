'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
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
        <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                <section className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Browse by Industry</h1>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-[240px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredCategories.map((category) => (
                            <Link
                                key={category.id}
                                href={`/products?categoryId=${category.id}`}
                                className="product-grid-card !h-[240px] group"
                            >
                                {/* Icon Area */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="w-20 h-20 rounded-2xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[rgba(255,215,0,0.1)] transition-all duration-300">
                                        {category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/')) ? (
                                            <img src={category.icon} alt={category.name} className="w-12 h-12 object-contain" />
                                        ) : (
                                            <span className="text-4xl">{category.icon}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Category Name */}
                                <h3 className="text-lg font-bold text-white text-center group-hover:text-[#FFD700] transition-colors mb-4">
                                    {category.name}
                                </h3>

                                {/* View Products Button */}
                                <div className="w-full py-3 text-center text-sm font-semibold text-[#d1d5db] bg-[rgba(255,255,255,0.05)] rounded-xl border border-transparent group-hover:bg-[rgba(212,163,69,0.15)] group-hover:text-[#d4a345] group-hover:border-[rgba(212,163,69,0.3)] transition-all">
                                    View Products
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
