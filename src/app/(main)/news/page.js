'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { SearchBar } from '@/presentation/components/common/SearchBar/SearchBar';
import { Calendar, ArrowRight } from 'lucide-react';

export default function NewsPage() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const firestoreDS = container.getFirestoreDataSource();

        // Real-time subscription to news
        const unsubscribe = firestoreDS.subscribeToQuery(
            'news',
            { limit: 50 },
            (allNews) => {
                if (allNews && allNews.length > 0) {
                    // Filter published news and sort by publishedAt
                    const published = allNews.filter(n => n.status === 'published');
                    const sorted = published.sort((a, b) => {
                        const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || 0);
                        const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt || 0);
                        return dateB - dateA;
                    });
                    setNews(sorted);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching news:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const filteredNews = news.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryBadge = (category) => {
        const colors = {
            'Markets': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'Regulations': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            'Trends': 'bg-green-500/20 text-green-400 border-green-500/30',
            'Logistics': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'Sustainability': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        };
        const colorClass = colors[category] || 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30';
        return <span className={`px-3 py-1 text-xs font-bold rounded-full border ${colorClass}`}>{category}</span>;
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <section className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Trade News</h1>
                    <p className="text-[#A0A0A0] mb-8">Stay informed with the latest updates from the global trade industry.</p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <SearchBar
                            placeholder="Search news by title, category, or content..."
                            initialValue={searchQuery}
                            onSearch={(val) => setSearchQuery(val)}
                        />
                    </div>
                </section>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-[380px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📰</div>
                        <h3 className="text-xl font-bold text-white mb-2">No News Found</h3>
                        <p className="text-[#A0A0A0]">
                            {searchQuery ? 'Try a different search term.' : 'Check back soon for the latest trade news.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredNews.map((item, index) => (
                            <Link
                                key={item.id}
                                href={`/news/${item.id}`}
                                className="group bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.02)] rounded-[20px] border border-[rgba(255,255,255,0.08)] overflow-hidden hover:border-[rgba(255,215,0,0.3)] transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Image Area */}
                                <div className={`h-48 bg-news-${(index % 5) + 1} relative`}>
                                    <div className="absolute top-4 left-4">
                                        {getCategoryBadge(item.category)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {/* Date */}
                                    <div className="flex items-center gap-2 text-sm text-[#A0A0A0] mb-3">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(item.publishedAt)}</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-[#FFD700] transition-colors">
                                        {item.title}
                                    </h3>

                                    {/* Excerpt */}
                                    <p className="text-sm text-[#A0A0A0] line-clamp-3 mb-4">
                                        {item.excerpt}
                                    </p>

                                    {/* Read More */}
                                    <div className="flex items-center gap-2 text-[#FFD700] font-semibold text-sm group-hover:gap-3 transition-all">
                                        Read More <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
