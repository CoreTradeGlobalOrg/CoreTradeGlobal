/**
 * ProductHero Component
 *
 * Shows product context at the top of the deal page.
 * Compact hero section with product image, name, and category badge.
 * Links to the product detail page.
 * Falls back to fetching product image from Firestore if deal snapshot is stale.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, ChevronRight, Download } from 'lucide-react';
import { container } from '@/core/di/container';

/**
 * ProductHero
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 */
export function ProductHero({ deal }) {
  const [resolvedImage, setResolvedImage] = useState(deal?.productImage || null);
  const [imgError, setImgError] = useState(false);

  const { productId, productName, productCategory } = deal || {};
  const shortDealId = deal?.id ? deal.id.slice(0, 8).toUpperCase() : null;
  const pdfUrl = deal?.productPdfUrl || deal?.product?.pdfUrl || null;

  // If deal has no productImage or it fails to load, fetch from product doc
  useEffect(() => {
    if (!productId) return;
    if (resolvedImage && !imgError) return;

    const fetchProductImage = async () => {
      try {
        const firestoreDS = container.getFirestoreDataSource();
        const product = await firestoreDS.getById('products', productId);
        if (product?.images?.[0]) {
          setResolvedImage(product.images[0]);
          setImgError(false);
        }
      } catch (err) {
        // silently fail — Package icon will show
      }
    };
    fetchProductImage();
  }, [productId, resolvedImage, imgError]);

  if (!deal) return null;

  const showImage = resolvedImage && !imgError;

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4 flex items-center gap-4">
      {/* Product image */}
      <Link
        href={`/product/${productId}`}
        className="flex-shrink-0 block w-16 h-16 rounded-lg overflow-hidden bg-[#0F1C2E] border border-[#2A3B52] hover:border-[#FFD700]/40 transition-colors"
      >
        {showImage ? (
          <img
            src={resolvedImage}
            alt={productName || 'Product'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={24} className="text-[#8899AA]" />
          </div>
        )}
      </Link>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        {shortDealId && (
          <p className="text-[10px] text-[#4A5B6E] mb-1">
            Deal <span className="text-[#8899AA] font-mono">#{shortDealId}</span>
          </p>
        )}
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
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-[#8899AA]">Negotiating terms for this product</p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#FFD700] hover:text-[#FFE44D] underline transition-colors"
              title="Download product PDF"
            >
              <Download size={12} />
              Product PDF
            </a>
          )}
        </div>
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
