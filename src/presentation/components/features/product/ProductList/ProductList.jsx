/**
 * ProductList Component
 *
 * Displays a grid of products using the .product-grid-card style (Dark Theme)
 * Matches ProductGrid.jsx EXACTLY but adds Edit/Delete actions for Profile
 */

'use client';

import Link from 'next/link';
import { Package, MoreVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState, memo } from 'react';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';

// Individual product card with image loading state
const ProductCardImage = memo(function ProductCardImage({ src, alt, inactive }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <div className="text-4xl">📦</div>;
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B] z-10">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${loading ? 'opacity-0' : 'opacity-100'} ${inactive ? 'opacity-50 grayscale' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </>
  );
});

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const country = COUNTRIES.find(c => c.value === countryCode);
  if (country) {
    return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

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

export function ProductList({ products = [], loading, isOwnProfile, onEdit, onDelete, onToggleStatus }) {
  const [activeMenu, setActiveMenu] = useState(null);

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="aspect-[4/3] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
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

  // Product grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" onClick={() => setActiveMenu(null)}>
      {products.map((product) => {
        // Resolve Currency Symbol
        const code = product.currency || 'USD';
        const currencySymbol = CURRENCY_SYMBOLS[code] || code;

        return (
          <div
            key={product.id}
            className="product-grid-card group relative"
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
                      <Edit size={14} className="text-[#D4AF37]" /> Edit
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

            <Link href={`/product/${product.id}`} className="block h-full flex flex-col">
              {/* Image Area */}
              <div className="aspect-[4/3] w-full bg-[#1A283B] rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
                <ProductCardImage
                  src={product.images?.[0]}
                  alt={product.name}
                  inactive={product.status !== 'active' && isOwnProfile}
                />

                {/* Status Badge */}
                {isOwnProfile && product.status !== 'active' && (
                  <div className="absolute top-3 left-3 bg-gray-800/80 backdrop-blur px-3 py-1 rounded text-xs font-bold text-white uppercase">
                    {product.status}
                  </div>
                )}

                <div className="absolute top-3 right-3 bg-[rgba(15,27,43,0.8)] backdrop-blur-md px-3 py-1 rounded-full border border-[rgba(255,255,255,0.1)]">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{product.category || 'Product'}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2 text-[#A0A0A0] text-sm">
                  <CountryFlag countryCode={product.country} size={16} />
                  <span>{getCountryName(product.country)}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 leading-tight line-clamp-2 min-h-[44px]">
                  {product.name}
                </h3>

                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-end">
                  <div>
                    <span className="block text-xs text-[#A0A0A0] mb-1">Price</span>
                    <div className="text-[#D4AF37] font-bold text-xl">
                      {currencySymbol} {product.price}
                      <span className="text-sm text-[#A0A0A0] font-normal ml-1">/ {product.unit}</span>
                    </div>
                  </div>
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
