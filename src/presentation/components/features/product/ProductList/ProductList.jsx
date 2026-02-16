/**
 * ProductList Component
 *
 * Displays products using the exact same design as homepage ProductCard
 * Adds Edit/Delete actions for Profile page
 */

'use client';

import Link from 'next/link';
import { Package, MoreVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState, memo } from 'react';
import { useCategories } from '@/presentation/hooks/category/useCategories';

// Map codes to symbols
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'TRY': '₺',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NZD': 'NZ$',
  'SGD': 'S$',
  'HKD': 'HK$',
  'NOK': 'kr',
  'KRW': '₩',
  'MXN': '$',
  'INR': '₹',
  'RUB': '₽',
  'BRL': 'R$',
  'ZAR': 'R'
};

// Truncate text to specified length
const truncateText = (text, maxLength = 80) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Image component with loading state (same as homepage)
const ProductCardImage = memo(function ProductCardImage({ src, alt, inactive }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <div className="text-6xl">📦</div>;
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B] z-10">
          <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${inactive ? 'opacity-50 grayscale' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </>
  );
});

export function ProductList({ products = [], loading, isOwnProfile, onEdit, onDelete, onToggleStatus }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const { categories } = useCategories();

  // Loading skeleton
  if (loading) {
    return (
      <div className="profile-products-grid">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="product-card" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="product-card-image animate-pulse" />
            <div className="product-card-content">
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3" />
              <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-[rgba(255,255,255,0.05)] rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-[#A0A0A0]" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {isOwnProfile ? 'No products yet' : 'No products available'}
        </h3>
        <p className="text-[#A0A0A0] mb-6 max-w-md">
          {isOwnProfile
            ? 'Start by adding your first product to showcase what you offer.'
            : 'This user has not added any products yet.'}
        </p>
      </div>
    );
  }

  // Product grid - using homepage card design
  return (
    <div className="profile-products-grid" onClick={() => setActiveMenu(null)}>
      {products.map((product) => {
        // Get first image from images array
        const imageUrl = product.images?.[0] || product.imageUrl;

        // Resolve Currency Symbol
        const code = product.currency || 'USD';
        const currencySymbol = CURRENCY_SYMBOLS[code] || code;

        // Resolve Category Name and Icon
        const category = categories?.find(c => c.value === product.categoryId);
        const categoryName = product.category || category?.label?.replace(/^[^\s]+\s/, '') || '';
        const categoryIcon = category?.icon || '';

        const isInactive = product.status !== 'active';

        return (
          <div
            key={product.id}
            className={`product-card relative !h-auto !min-h-0 ${isInactive && isOwnProfile ? 'opacity-70' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Menu (Only for Own Profile) */}
            {isOwnProfile && (
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveMenu(activeMenu === product.id ? null : product.id);
                  }}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>

                {activeMenu === product.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl overflow-hidden z-30">
                    <button
                      onClick={() => { onEdit(product); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                    >
                      <Edit size={14} className="text-[#FFD700]" /> Edit
                    </button>
                    <button
                      onClick={() => { onToggleStatus(product.id, product.status === 'active' ? 'draft' : 'active'); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                    >
                      {product.status === 'active' ?
                        <><EyeOff size={14} className="text-gray-400" /> Deactivate</> :
                        <><Eye size={14} className="text-green-400" /> Activate</>
                      }
                    </button>
                    <button
                      onClick={() => { onDelete(product.id); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[rgba(239,68,68,0.1)] flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status Badge (for inactive products on own profile) */}
            {isOwnProfile && isInactive && (
              <div className="absolute top-3 left-3 z-20 bg-gray-800/80 backdrop-blur px-3 py-1 rounded text-xs font-bold text-white uppercase">
                {product.status}
              </div>
            )}

            <Link href={`/product/${product.id}`} className="block no-underline text-inherit hover:no-underline">
              {/* Product Image */}
              <div className="product-card-image relative">
                <ProductCardImage
                  src={imageUrl}
                  alt={product.name}
                  inactive={isInactive && isOwnProfile}
                />
              </div>

              {/* Product Content */}
              <div className="p-5">
                <h3
                  className="text-lg font-bold mb-1 line-clamp-1"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {product.name}
                </h3>
                <span className="text-sm text-[#FFD700] font-bold flex items-center gap-2 min-h-[20px]">
                  {categoryName ? (
                    <>
                      {categoryIcon && <span>{categoryIcon}</span>}
                      <span>{categoryName}</span>
                    </>
                  ) : (
                    <span className="invisible">-</span>
                  )}
                </span>
                <p className="text-sm text-[#A0A0A0] my-2 line-clamp-2 min-h-[40px]">{truncateText(product.description, 80)}</p>

                <p className="text-xl font-bold text-[#FFD700] min-h-[28px]">
                  {product.price ? (
                    <>
                      {currencySymbol} {product.price}
                      {product.unit && (
                        <span
                          className="font-semibold text-sm ml-1"
                          style={{
                            background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                        >
                          / {product.unit.replace(/^\/\s*/, '')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Negotiable</span>
                  )}
                </p>

                <div className="w-full pt-3">
                  <div className="product-card-btn w-full text-center">View Details</div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default ProductList;
