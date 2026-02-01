/**
 * CategoriesSection Component
 *
 * Homepage section displaying product categories
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';

// Default categories with emojis - Show 5 on homepage + "More" card
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Electronics', icon: '⚡' },
  { id: '2', name: 'Textiles', icon: '🧶' },
  { id: '3', name: 'Food & Beverages', icon: '🍎' },
  { id: '4', name: 'Machinery', icon: '⚙️' },
  { id: '5', name: 'Chemicals', icon: '🧪' },
];

const CategoryCard = ({ category }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/products?categoryId=${category.id}`}
      className="cat-card group"
    >
      {category.iconUrl && !imgError ? (
        <div className="w-16 h-16 mb-4 relative flex items-center justify-center transform group-hover:scale-110 transition-transform">
          <img
            src={category.iconUrl}
            alt={category.name}
            className="w-full h-full object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))' }} // Gold glow
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <span className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">{category.icon}</span>
      )}
      <span className="cat-name">{category.name}</span>
    </Link>
  );
};

const CARD_WIDTH = 140;
const GAP = 16;
const PADDING = 60; // left + right = 120

export function CategoriesSection() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const containerRef = useRef(null);

  // Calculate how many cards fit
  useEffect(() => {
    const calculateVisibleCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - (PADDING * 2);
        // How many cards fit = (containerWidth + gap) / (cardWidth + gap)
        const fitsCount = Math.floor((containerWidth + GAP) / (CARD_WIDTH + GAP));
        // Show one less for "More Categories"
        setVisibleCount(Math.max(1, fitsCount - 1));
      }
    };

    // Small delay to ensure container is rendered
    const timeout = setTimeout(calculateVisibleCount, 100);
    window.addEventListener('resize', calculateVisibleCount);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', calculateVisibleCount);
    };
  }, [categories, loading]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryRepo = container.getCategoryRepository();
        const fetchedCategories = await categoryRepo.getAll();

        if (fetchedCategories.length > 0) {
          // Map fetched categories to display format
          const mappedCategories = fetchedCategories.map((cat, index) => {
            // Find matching default category to fallback
            const defaultMatch = DEFAULT_CATEGORIES.find(d => d.name === cat.name);

            // Consolidate possible sources
            const rawVal = cat.iconUrl || cat.icon_url || cat.imageUrl || cat.image || cat.icon || cat.emoji;

            // Check if it's a URL
            const isUrl = rawVal && (typeof rawVal === 'string') && (rawVal.startsWith('http') || rawVal.startsWith('/'));

            let finalIconUrl = null;
            let finalEmoji = null;

            if (isUrl) {
              finalIconUrl = rawVal;
              // Fallback emoji if URL fails loading (handled by CategoryCard onError, but we need a default here too)
              finalEmoji = defaultMatch ? defaultMatch.icon : (DEFAULT_CATEGORIES[index % DEFAULT_CATEGORIES.length]?.icon || '📦');
            } else {
              // It's a text/emoji
              finalEmoji = rawVal || (defaultMatch ? defaultMatch.icon : (DEFAULT_CATEGORIES[index % DEFAULT_CATEGORIES.length]?.icon || '📦'));
            }

            return {
              id: cat.id,
              name: cat.name,
              icon: finalEmoji,
              iconUrl: finalIconUrl
            };
          });
          setCategories(mappedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Keep default categories on error
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <section className="categories-section" id="categories" ref={containerRef}>
      <div className="categories-container">
        {/* Header */}
        <div className="cat-header">
          <div>
            <h2 className="cat-title">Browse by Category</h2>
            <p className="text-[#A0A0A0] mt-1 text-sm">Find products by industry.</p>
          </div>
          <Link href="/categories" className="btn-section-action">
            View All Categories →
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="cat-grid">
          {loading ? (
            <>
              {Array.from({ length: visibleCount + 1 }).map((_, i) => (
                <div key={i} className="cat-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.1)] animate-pulse mb-4" />
                  <div className="h-4 w-20 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                </div>
              ))}
            </>
          ) : (
            <>
              {categories.slice(0, visibleCount).map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
              {/* More Categories Card - Always Last */}
              <Link href="/categories" className="cat-card cat-card-more group">
                <span className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">➕</span>
                <span className="cat-name">More Categories</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default CategoriesSection;
