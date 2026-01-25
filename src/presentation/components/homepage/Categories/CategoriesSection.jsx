/**
 * CategoriesSection Component
 *
 * Homepage section displaying product categories
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';

// Default categories with emojis - Updated to be more relevant
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
            style={{ filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' }} // Gold glow
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

export function CategoriesSection() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

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
          setCategories(mappedCategories.slice(0, 12));
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
    <section className="categories-section" id="categories">
      {/* Header */}
      <div className="cat-header">
        <h2 className="cat-title">Browse by Category</h2>
        <Link href="/products" className="btn-section-action">
          View All Categories →
        </Link>
      </div>

      {/* Categories Grid */}
      <div className="cat-container">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}

export default CategoriesSection;
