/**
 * ProductList Component
 *
 * Displays a grid of products with loading and empty states
 */

'use client';

import { ProductCard } from '../ProductCard/ProductCard';
import { Package } from 'lucide-react';

export function ProductList({ products = [], loading, isOwnProfile, onEdit, onDelete, onToggleStatus }) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-8 bg-gray-200 rounded w-full" />
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
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isOwnProfile ? 'No products yet' : 'No products available'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          {isOwnProfile
            ? 'Start by adding your first product to showcase what you offer.'
            : 'This user has not added any products yet.'}
        </p>
      </div>
    );
  }

  // Product grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isOwnProfile={isOwnProfile}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
}

export default ProductList;
