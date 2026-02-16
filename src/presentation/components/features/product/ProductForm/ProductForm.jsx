/**
 * ProductForm Component
 *
 * Form for creating and editing products
 * Uses react-hook-form + zod validation
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { productSchema } from '@/core/validation/productSchema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { CURRENCIES } from '@/core/constants/currencies';
import { UNIT_CATEGORIES, getUnitsByCategory } from '@/core/constants/units';
import { useCategories } from '@/presentation/hooks/category/useCategories';

export function ProductForm({ product, onSubmit, onCancel, userId }) {
  const { categories, loading: categoriesLoading } = useCategories();
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(product?.images || []);
  const [imageLoadingCount, setImageLoadingCount] = useState(0); // Track how many images are loading
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      categoryId: product?.categoryId || '',
      stockQuantity: product?.stockQuantity || 0,
      unit: product?.unit || 'PCE',
      unitCategory: product?.unitCategory || 'Quantity',
      price: product?.price || 0,
      currency: product?.currency || 'USD',
      description: product?.description || '',
      status: product?.status || 'active',
    },
  });

  const categoryId = watch('categoryId');
  const currency = watch('currency');
  const unitCategory = watch('unitCategory');
  const unit = watch('unit');

  // Get filtered units based on selected category
  const availableUnits = getUnitsByCategory(unitCategory).map((u) => ({
    value: u.code,
    label: u.label,
  }));

  const validateAndProcessFiles = (files) => {
    const fileArray = Array.from(files);
    const totalImages = imagePreviews.length + fileArray.length;

    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validFiles = [];
    fileArray.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    setImageFiles([...imageFiles, ...validFiles]);
    setImageLoadingCount((prev) => prev + validFiles.length);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
        setImageLoadingCount((prev) => prev - 1);
      };
      reader.onerror = () => {
        toast.error(`Failed to load ${file.name}`);
        setImageLoadingCount((prev) => prev - 1);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    validateAndProcessFiles(e.target.files || []);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFiles(files);
    }
  };

  const handleRemoveImage = (index) => {
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);

    if (index >= (product?.images?.length || 0)) {
      const fileIndex = index - (product?.images?.length || 0);
      const newFiles = [...imageFiles];
      newFiles.splice(fileIndex, 1);
      setImageFiles(newFiles);
    }
  };

  const handleFormSubmit = async (data) => {
    setSubmitting(true);

    try {
      // Get existing images that are still in previews (not removed by user)
      const existingImageCount = product?.images?.length || 0;
      const remainingExistingImages = imagePreviews
        .slice(0, existingImageCount)
        .filter(img => product?.images?.includes(img));

      const productData = {
        ...data,
        userId,
        // Pass remaining existing images so UseCase knows which ones to keep
        existingImages: remainingExistingImages,
      };

      await onSubmit(productData, imageFiles);
      toast.success(isEditing ? 'Product updated!' : 'Product created!');
    } catch (error) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Product Name <span className="text-[#FFD700]">*</span>
        </label>
        <Input
          type="text"
          {...register('name')}
          error={!!errors.name}
          disabled={submitting}
          placeholder="e.g., Steel Pipes"
          className="bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:ring-[#FFD700]/20"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category <span className="text-[#FFD700]">*</span>
        </label>
        <SearchableSelect
          options={categories}
          value={categoryId}
          onChange={(value) => setValue('categoryId', value, { shouldValidate: true })}
          placeholder="Select category"
          disabled={submitting || categoriesLoading}
          error={!!errors.categoryId}
          className="dark-select"
        />
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-400">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Stock & Unit Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Stock Quantity <span className="text-[#FFD700]">*</span>
          </label>
          <Input
            type="number"
            {...register('stockQuantity', { valueAsNumber: true })}
            error={!!errors.stockQuantity}
            disabled={submitting}
            min="0"
            className="bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:ring-[#FFD700]/20"
          />
          {errors.stockQuantity && (
            <p className="mt-1 text-sm text-red-400">{errors.stockQuantity.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Unit Category <span className="text-[#FFD700]">*</span>
          </label>
          <SearchableSelect
            options={UNIT_CATEGORIES}
            value={unitCategory}
            onChange={(value) => {
              setValue('unitCategory', value, { shouldValidate: true });
              // Reset unit when category changes
              const firstUnit = getUnitsByCategory(value)[0];
              if (firstUnit) {
                setValue('unit', firstUnit.code, { shouldValidate: true });
              }
            }}
            placeholder="Select unit category"
            disabled={submitting}
            error={!!errors.unitCategory}
            className="dark-select"
          />
          {errors.unitCategory && (
            <p className="mt-1 text-sm text-red-400">{errors.unitCategory.message}</p>
          )}
        </div>
      </div>

      {/* Unit & Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Unit <span className="text-[#FFD700]">*</span>
          </label>
          <SearchableSelect
            options={availableUnits}
            value={unit}
            onChange={(value) => setValue('unit', value, { shouldValidate: true })}
            placeholder="Select unit"
            disabled={submitting}
            error={!!errors.unit}
            className="dark-select"
          />
          {errors.unit && (
            <p className="mt-1 text-sm text-red-400">{errors.unit.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price <span className="text-[#FFD700]">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            error={!!errors.price}
            disabled={submitting}
            min="0"
            placeholder="0 = Negotiable"
            className="bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:ring-[#FFD700]/20"
          />
          <p className="mt-1 text-xs text-[#A0A0A0]">Set to 0 for negotiable pricing</p>
          {errors.price && (
            <p className="mt-1 text-sm text-red-400">{errors.price.message}</p>
          )}
        </div>
      </div>

      {/* Currency */}
      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Currency <span className="text-[#FFD700]">*</span>
        </label>
        <SearchableSelect
          options={CURRENCIES}
          value={currency}
          onChange={(value) => setValue('currency', value, { shouldValidate: true })}
          placeholder="Select currency"
          disabled={submitting}
          error={!!errors.currency}
          className="dark-select"
        />
        {errors.currency && (
          <p className="mt-1 text-sm text-red-400">{errors.currency.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-[#FFD700]">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 bg-[#0F1B2B] text-white placeholder:text-gray-500 ${errors.description
            ? 'border-red-500 focus:border-red-600 focus:ring-red-500/20'
            : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
            }`}
          disabled={submitting}
          placeholder="Describe your product..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
        )}
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Product Images (max 5)
        </label>

        {/* Preview */}
        {(imagePreviews.length > 0 || imageLoadingCount > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border-2 border-[rgba(255,215,0,0.3)]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-8 h-8 md:w-6 md:h-6 flex items-center justify-center hover:bg-red-700 shadow-lg text-lg md:text-base font-bold opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
            ))}
            {/* Loading placeholders for images being processed */}
            {[...Array(imageLoadingCount)].map((_, index) => (
              <div key={`loading-${index}`} className="relative w-full h-24 rounded-lg border-2 border-dashed border-[#FFD700] bg-[rgba(255,215,0,0.1)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-[#FFD700]">Loading...</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drag & Drop Zone */}
        {imagePreviews.length < 5 && (
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging
              ? 'border-[#FFD700] bg-[rgba(255,215,0,0.1)]'
              : 'border-[rgba(255,215,0,0.4)] hover:border-[#FFD700]'
              } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={submitting}
              id="image-upload"
            />

            <div className="flex flex-col items-center gap-3">
              <svg
                className={`w-12 h-12 ${isDragging ? 'text-[#FFD700]' : 'text-[rgba(255,215,0,0.6)]'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>

              <div>
                <p className="text-sm font-medium text-white">
                  {isDragging ? 'Drop images here' : 'Drag & drop images here'}
                </p>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  or click to browse ({imagePreviews.length}/5)
                </p>
              </div>

              <div className="text-xs text-[#64748b]">
                PNG, JPG, GIF up to 5MB each
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" variant="gold" disabled={submitting || imageLoadingCount > 0}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#0F1B2B] border-t-transparent rounded-full animate-spin"></span>
              Uploading...
            </span>
          ) : isEditing ? 'Update Product' : 'Create Product'}
        </Button>
        <Button
          type="button"
          variant="white"
          onClick={onCancel}
          disabled={submitting || imageLoadingCount > 0}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default ProductForm;
