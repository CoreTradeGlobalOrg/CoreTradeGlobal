/**
 * ProductHero Component
 *
 * Shows product context at the top of the deal page.
 * Compact hero section with product image, name, and category badge.
 * Links to the product detail page.
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';

/**
 * ProductHero
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 */
export function ProductHero({ deal }) {
  if (!deal) return null;

  const { productId, productName, productImage, productCategory } = deal;

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4 flex items-center gap-4">
      {/* Product image */}
      <Link
        href={`/product/${productId}`}
        className="flex-shrink-0 block w-16 h-16 rounded-lg overflow-hidden bg-[#0F1C2E] border border-[#2A3B52] hover:border-[#FFD700]/40 transition-colors"
      >
        {productImage ? (
          <img
            src={productImage}
            alt={productName || 'Product'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={24} className="text-[#8899AA]" />
          </div>
        )}
      </Link>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        {productCategory && (
          <span className="inline-block text-xs text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-2 py-0.5 rounded-full mb-1">
            {productCategory}
          </span>
        )}
        <Link
          href={`/product/${productId}`}
          className="block text-white font-semibold truncate hover:text-[#FFD700] transition-colors"
        >
          {productName || 'Product'}
        </Link>
        <p className="text-xs text-[#8899AA] mt-0.5">Negotiating terms for this product</p>
      </div>

      {/* Link arrow */}
      <Link
        href={`/product/${productId}`}
        className="flex-shrink-0 text-[#8899AA] hover:text-[#FFD700] transition-colors"
        title="View product"
      >
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}

export default ProductHero;
