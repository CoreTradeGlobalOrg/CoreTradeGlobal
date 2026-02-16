/**
 * HomepageProductCard Component
 *
 * Product card for homepage display with 3-product limit handling
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProductView } from '@/presentation/contexts/ProductViewContext';
import { MapPin, Package, Eye } from 'lucide-react';

export function HomepageProductCard({ product, onLimitReached }) {
  const router = useRouter();
  const {
    canViewProduct,
    recordView,
    hasViewedProduct,
    isAuthenticated,
    remainingViews,
  } = useProductView();

  const handleClick = (e) => {
    e.preventDefault();

    // Authenticated users can view freely
    if (isAuthenticated) {
      router.push(`/product/${product.id}`);
      return;
    }

    // Already viewed this product
    if (hasViewedProduct(product.id)) {
      router.push(`/product/${product.id}`);
      return;
    }

    // Can view more products
    if (canViewProduct(product.id)) {
      recordView(product.id);
      router.push(`/product/${product.id}`);
      return;
    }

    // Limit reached
    if (onLimitReached) {
      onLimitReached();
    }
  };

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const mainImage = product.images?.[0] || '/images/placeholder-product.jpg';
  const isViewed = hasViewedProduct(product.id);

  return (
    <div
      onClick={handleClick}
      className="hp-product-card cursor-pointer w-[280px] flex-shrink-0"
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={mainImage}
          alt={product.name}
          className="hp-product-card-image"
        />
        {/* Badge for viewed products */}
        {isViewed && !isAuthenticated && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-[var(--hp-gold)]/90 rounded-full flex items-center gap-1">
            <Eye className="w-3 h-3 text-[var(--hp-bg-primary)]" />
            <span className="text-xs font-medium text-[var(--hp-bg-primary)]">
              Görüntülendi
            </span>
          </div>
        )}
        {/* Stock badge */}
        {product.stockQuantity > 0 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-green-500/90 rounded-full">
            <span className="text-xs font-medium text-white">Stokta</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="hp-product-card-content">
        {/* Category */}
        <span className="text-xs text-[var(--hp-gold)] font-medium uppercase tracking-wider">
          {product.categoryName || 'Ürün'}
        </span>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--hp-text-primary)] mt-1 line-clamp-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold text-[var(--hp-gold)]">
            {product.price ? formatPrice(product.price, product.currency) : 'Negotiable'}
          </span>
          {product.minOrderQuantity && (
            <span className="text-xs text-[var(--hp-text-muted)]">
              min. {product.minOrderQuantity} adet
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="mt-3 pt-3 border-t border-[var(--hp-border)] flex items-center justify-between text-xs text-[var(--hp-text-muted)]">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{product.location || 'Türkiye'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>{product.stockQuantity || 0} adet</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomepageProductCard;
