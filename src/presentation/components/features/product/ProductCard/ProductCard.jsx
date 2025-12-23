/**
 * ProductCard Component
 *
 * Displays a single product with image, details, and actions
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2, Power, ChevronLeft, ChevronRight } from 'lucide-react';

export function ProductCard({ product, isOwnProfile, onEdit, onDelete, onToggleStatus }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const images = product?.images || [];
  const hasImages = images.length > 0;

  const handleEdit = () => {
    if (onEdit) onEdit(product);
  };

  const nextImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleDelete = async () => {
    if (onDelete) {
      const confirmed = confirm(`Delete "${product.name}"?`);
      if (confirmed) {
        await onDelete(product.id);
      }
    }
  };

  const handleToggleStatus = async () => {
    if (onToggleStatus) {
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      await onToggleStatus(product.id, newStatus);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image Carousel */}
      <div className="relative h-48 bg-gray-100 group">
        {hasImages ? (
          <>
            {/* Loading Spinner */}
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            <img
              src={images[currentImageIndex]}
              alt={`${product.name} - Image ${currentImageIndex + 1}`}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
            />

            {/* Navigation Arrows (only if multiple images) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(product.status)}`}>
            {product.status}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
          {product.name}
        </h3>

        <div className="space-y-2 mb-4">
          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Price:</span>
            <span className="font-medium text-gray-900">
              {product.currency} {product.price?.toLocaleString() || '0'}
            </span>
          </div>

          {/* Stock */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Stock:</span>
            <span className={`font-medium ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stockQuantity || 0} units
            </span>
          </div>
        </div>

        {/* Description Preview */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {product.description}
          </p>
        )}

        {/* Actions (Only for own profile) */}
        {isOwnProfile && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEdit}
                className="flex-1 flex items-center justify-center gap-1"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
            <Button
              variant={product.status === 'active' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleToggleStatus}
              className="w-full flex items-center justify-center gap-1"
            >
              <Power className="w-4 h-4" />
              {product.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
