/**
 * NewsSection Component
 *
 * Homepage section displaying latest trade news
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { ArrowRight } from 'lucide-react';

// Default news for initial display
const DEFAULT_NEWS = [
  {
    id: '1',
    title: 'Turkey Exports Hit Record High',
    excerpt: 'Turkish exports reached $65 billion in Q1 2025, up 15% from last year.',
    category: 'Markets',
    imageClass: 'bg-news-1',
    publishedAt: new Date('2025-01-15'),
  },
  {
    id: '2',
    title: 'New Customs Regulations in Effect',
    excerpt: 'New customs procedures for EU trade partners are now in effect.',
    category: 'Regulations',
    imageClass: 'bg-news-2',
    publishedAt: new Date('2025-01-12'),
  },
  {
    id: '3',
    title: 'Digital Trade Platforms on the Rise',
    excerpt: 'B2B e-commerce platforms are replacing traditional trade methods.',
    category: 'Trends',
    imageClass: 'bg-news-3',
    publishedAt: new Date('2025-01-10'),
  },
  {
    id: '4',
    title: 'Logistics Costs Declining',
    excerpt: 'Container shipping costs have dropped 20% in the last 6 months.',
    category: 'Logistics',
    imageClass: 'bg-news-4',
    publishedAt: new Date('2025-01-08'),
  },
  {
    id: '5',
    title: 'Sustainable Trade Practices',
    excerpt: 'More companies are adopting eco-friendly trading practices.',
    category: 'Sustainability',
    imageClass: 'bg-news-5',
    publishedAt: new Date('2025-01-05'),
  },
];

function NewsCard({ news, index }) {
  const formatDate = (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const imageClass = news.imageClass || `bg-news-${(index % 5) + 1}`;

  return (
    <div className="news-card">
      {/* News Image */}
      <div className="news-img-wrapper">
        <div className={`news-img-placeholder ${imageClass}`} />
        <span className="news-badge">{news.category}</span>
      </div>

      {/* News Content */}
      <div className="news-content">
        <div className="news-meta">
          <span>{formatDate(news.publishedAt)}</span>
        </div>
        <h3 className="news-title">{news.title}</h3>
        <p className="news-excerpt">{news.excerpt}</p>
        <Link href={`/news/${news.id}`} className="news-link">
          Read More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export function NewsSection() {
  const [news, setNews] = useState(DEFAULT_NEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firestoreDS = container.getFirestoreDataSource();

    // Real-time subscription to news
    const unsubscribe = firestoreDS.subscribeToQuery(
      'news',
      { limit: 20 },
      (allNews) => {
        if (allNews && allNews.length > 0) {
          // Filter published news and sort by publishedAt client-side
          const published = allNews.filter(n => n.status === 'published');
          const sorted = published.sort((a, b) => {
            const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || 0);
            const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt || 0);
            return dateB - dateA;
          });

          if (sorted.length > 0) {
            setNews(
              sorted.slice(0, 6).map((n, i) => ({
                ...n,
                imageClass: `bg-news-${(i % 5) + 1}`,
              }))
            );
          }
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

  return (
    <section className="news-section">
      {/* Background Glow */}
      <div className="news-glow" />

      <div className="news-container">
        {/* Header */}
        <div className="news-header">
          <div className="news-header-content">
            <h2>Trade News</h2>
          </div>
          <Link href="/news" className="btn-view-all-news">
            View All News <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* News Scroll Container */}
        <div className="news-scroll-wrapper">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="news-card"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="news-img-wrapper animate-pulse" />
                  <div className="news-content">
                    <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3" />
                    <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                    <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            news.map((item, index) => (
              <NewsCard key={item.id} news={item} index={index} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default NewsSection;
