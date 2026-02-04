/**
 * NewsSection Component
 *
 * Homepage section displaying latest trade news
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResponsiveLimit, useScrollLoadMore } from '@/presentation/hooks/useResponsiveLimit';

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
    <Link href={`/news/${news.id}`} className="news-card block cursor-pointer">
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
        <span className="news-link">
          Read More <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

export function NewsSection() {
  const [news, setNews] = useState(DEFAULT_NEWS);
  const [allNews, setAllNews] = useState([]); // Store all fetched news
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);

  // Responsive limits with lazy loading: mobile 3, tablet 4, desktop 6, max 20
  const { limit, displayCount, isReady, loadMore, hasMore } = useResponsiveLimit({
    mobile: 3,
    tablet: 4,
    desktop: 6,
    maxItems: 20
  });

  // Lazy load more when scrolling near end
  useScrollLoadMore(scrollRef, loadMore, hasMore, 200);

  // Update displayed news when displayCount changes (lazy loading)
  useEffect(() => {
    if (allNews.length > 0) {
      setNews(allNews.slice(0, displayCount));
    }
  }, [displayCount, allNews]);

  // Check initial scroll position on mount and when content loads
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollWidth > clientWidth);
      }
    };
    checkScroll();
    const timeout = setTimeout(checkScroll, 500);
    return () => clearTimeout(timeout);
  }, [news]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!isReady) return; // Wait for responsive limit to be determined

    const firestoreDS = container.getFirestoreDataSource();

    // Real-time subscription to news (fetch enough for lazy loading)
    const unsubscribe = firestoreDS.subscribeToQuery(
      'news',
      { limit: 25 }, // Fetch enough for lazy loading
      (fetchedNews) => {
        if (fetchedNews && fetchedNews.length > 0) {
          // Filter published news and sort by publishedAt client-side
          const published = fetchedNews.filter(n => n.status === 'published');
          const sorted = published.sort((a, b) => {
            const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || 0);
            const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt || 0);
            return dateB - dateA;
          });

          const mappedNews = sorted.map((n, i) => ({
            ...n,
            imageClass: `bg-news-${(i % 5) + 1}`,
          }));

          setAllNews(mappedNews);
          setNews(mappedNews.slice(0, displayCount));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching news:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isReady]);

  return (
    <section className="news-section">
      {/* Background Glow */}
      <div className="news-glow" />

      <div className="news-container">
        {/* Header */}
        <div className="news-header">
          <div className="news-header-content">
            <h2>Trade News</h2>
            <p>Stay informed with the latest updates.</p>
          </div>
          <Link href="/news" className="btn-view-all-news">
            View All News <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Dynamic Container with Arrows */}
        <div className="dynamic-container" style={{ padding: 0, background: 'transparent' }}>
          {/* Scroll Arrows */}
          <button
            className={`scroll-arrow-btn scroll-left ${showLeftArrow ? 'visible' : ''}`}
            id="dash-left-news"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className={`scroll-arrow-btn scroll-right ${showRightArrow ? 'visible' : ''}`}
            id="dash-right-news"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* News Scroll Container */}
          <div
            className="news-scroll-wrapper"
            ref={scrollRef}
            onScroll={handleScroll}
          >
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
      </div>
    </section>
  );
}

export default NewsSection;
