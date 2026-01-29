'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { container } from '@/core/di/container';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, Clock, Tag, User, Share2, BookOpen } from 'lucide-react';

export default function NewsDetailClient() {
    const router = useRouter();
    const params = useParams();
    const newsId = params.newsId;

    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const firestoreDS = container.getFirestoreDataSource();
                const fetchedNews = await firestoreDS.getById('news', newsId);
                if (fetchedNews) {
                    setNews(fetchedNews);
                } else {
                    setError('News not found');
                }
            } catch (err) {
                console.error('Error fetching news:', err);
                setError('Failed to load news details');
            } finally {
                setLoading(false);
            }
        };

        if (newsId) {
            fetchNews();
        }
    }, [newsId]);

    const formatDate = (date) => {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatShortDate = (date) => {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getCategoryBadge = (category) => {
        const colors = {
            'Markets': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'Regulations': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            'Trends': 'bg-green-500/20 text-green-400 border-green-500/30',
            'Logistics': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'Sustainability': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        };
        const colorClass = colors[category] || 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30';
        return (
            <span className={`px-4 py-2 text-sm font-bold rounded-full border ${colorClass}`}>
                {category}
            </span>
        );
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: news.title,
                    text: news.excerpt,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#0a1628]">
                <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !news) {
        return (
            <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy flex items-center justify-center px-4">
                <div className="glass-card max-w-lg w-full p-8 text-center">
                    <div className="text-6xl mb-4">📰</div>
                    <h2 className="text-2xl font-bold text-white mb-2">News Not Found</h2>
                    <p className="text-gray-400 mb-6">The article you're looking for doesn't exist or has been removed.</p>
                    <Button onClick={() => router.push('/news')} className="btn-signup text-white border-none w-full max-w-[200px]">
                        Browse News
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy">
            <div className="max-w-[1200px] mx-auto px-4">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to News</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <div className="glass-card p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/10 blur-[80px] rounded-full pointer-events-none" />

                            <div className="relative z-10">
                                {/* Category Badge */}
                                <div className="flex justify-between items-start mb-4">
                                    {getCategoryBadge(news.category)}
                                    <button
                                        onClick={handleShare}
                                        className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                                        title="Share article"
                                    >
                                        <Share2 className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                {/* Title */}
                                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                                    {news.title}
                                </h1>

                                {/* Meta Info */}
                                <div className="flex flex-wrap gap-6 text-[#A0A0A0]">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[#FFD700]" />
                                        <span>{formatShortDate(news.publishedAt)}</span>
                                    </div>
                                    {news.author && (
                                        <div className="flex items-center gap-2">
                                            <User className="w-5 h-5 text-[#FFD700]" />
                                            <span>{news.author}</span>
                                        </div>
                                    )}
                                    {news.readTime && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-[#FFD700]" />
                                            <span>{news.readTime} min read</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Featured Image */}
                        {news.imageUrl && (
                            <div className="glass-card p-2 overflow-hidden">
                                <img
                                    src={news.imageUrl}
                                    alt={news.title}
                                    className="w-full h-auto rounded-xl object-cover"
                                />
                            </div>
                        )}

                        {/* Excerpt Card */}
                        {news.excerpt && (
                            <div className="glass-card p-8 border-l-4 border-[#FFD700]">
                                <p className="text-xl text-gray-300 italic leading-relaxed">
                                    {news.excerpt}
                                </p>
                            </div>
                        )}

                        {/* Content Card */}
                        <div className="glass-card p-8">
                            <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Full Article
                            </div>
                            <div className="prose prose-invert prose-lg max-w-none">
                                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg font-light">
                                    {news.content || news.excerpt || 'Full article content coming soon.'}
                                </p>
                            </div>
                        </div>

                        {/* Tags */}
                        {news.tags && news.tags.length > 0 && (
                            <div className="glass-card p-6">
                                <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4 flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Tags
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {news.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 text-sm bg-[rgba(255,255,255,0.05)] text-gray-300 rounded-full border border-[rgba(255,255,255,0.1)]"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Article Info Card */}
                        <div className="glass-card p-6">
                            <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4">
                                Article Info
                            </div>

                            <div className="space-y-4">
                                <div className="pb-4 border-b border-[rgba(255,255,255,0.05)]">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Published</div>
                                    <div className="text-white font-medium">{formatDate(news.publishedAt)}</div>
                                </div>

                                {news.updatedAt && (
                                    <div className="pb-4 border-b border-[rgba(255,255,255,0.05)]">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Last Updated</div>
                                        <div className="text-white font-medium">{formatDate(news.updatedAt)}</div>
                                    </div>
                                )}

                                {news.author && (
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Author</div>
                                        <div className="flex items-center gap-2 text-white">
                                            <User className="w-4 h-4 text-[#FFD700]" />
                                            {news.author}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Info */}
                        <div className="glass-card p-6">
                            <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4">
                                Quick Info
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Category</span>
                                    <span className="text-white font-medium">{news.category || 'General'}</span>
                                </div>
                                {news.readTime && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Read Time</span>
                                        <span className="text-white font-medium">{news.readTime} minutes</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Status</span>
                                    <span className="text-green-400 font-medium">Published</span>
                                </div>
                            </div>
                        </div>

                        {/* Share Card */}
                        <div className="glass-card p-6">
                            <div className="text-center">
                                <p className="text-gray-400 mb-4 text-sm">
                                    Found this article helpful? Share it with your network.
                                </p>
                                <button
                                    onClick={handleShare}
                                    className="block w-full py-3 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all text-center mb-3"
                                >
                                    Share Article
                                </button>
                                <a
                                    href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(news.title + ' - Check out this article on Core Trade Global: https://coretradeglobal.com/news/' + newsId)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#0A66C2] rounded-xl font-bold hover:bg-[#004182] transition-all"
                                    style={{ color: 'white' }}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                    Share on LinkedIn
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
