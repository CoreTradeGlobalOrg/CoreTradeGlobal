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
import { useCategories } from '@/presentation/hooks/category/useCategories';

export function ProductForm({ product, onSubmit, onCancel, userId }) {
  const { categories, loading: categoriesLoading } = useCategories();
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(product?.images || []);
  const [submitting, setSubmitting] = useState(false);

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
      price: product?.price || 0,
      currency: product?.currency || 'USD',
      description: product?.description || '',
      status: product?.status || 'active',
    },
  });

  const categoryId = watch('categoryId');
  const currency = watch('currency');

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const totalImages = imagePreviews.length + files.length;

    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }
    });

    setImageFiles([...imageFiles, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
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
      const productData = {
        ...data,
        userId,
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
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Product Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          {...register('name')}
          error={!!errors.name}
          disabled={submitting}
          placeholder="e.g., Steel Pipes"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <SearchableSelect
          options={categories}
          value={categoryId}
          onChange={(value) => setValue('categoryId', value, { shouldValidate: true })}
          placeholder="Select category"
          disabled={submitting || categoriesLoading}
          error={!!errors.categoryId}
        />
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Stock & Price */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Stock Quantity <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            {...register('stockQuantity', { valueAsNumber: true })}
            error={!!errors.stockQuantity}
            disabled={submitting}
            min="0"
          />
          {errors.stockQuantity && (
            <p className="mt-1 text-sm text-red-600">{errors.stockQuantity.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Price <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            error={!!errors.price}
            disabled={submitting}
            min="0.01"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Currency <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={CURRENCIES}
            value={currency}
            onChange={(value) => setValue('currency', value, { shouldValidate: true })}
            placeholder="Select currency"
            disabled={submitting}
            error={!!errors.currency}
          />
          {errors.currency && (
            <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={submitting}
          placeholder="Describe your product..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Product Images (max 5)
        </label>

        {/* Preview */}
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        {imagePreviews.length < 5 && (
          <label className="cursor-pointer inline-block">
            <div className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Add Images ({imagePreviews.length}/5)
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="sr-only"
              disabled={submitting}
            />
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default ProductForm;
