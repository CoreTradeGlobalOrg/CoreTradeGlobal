/**
 * RequestForm Component
 *
 * Form for creating and editing requests (RFQs)
 * Uses react-hook-form + zod validation
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { requestSchema } from '@/core/validation/requestSchema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { COUNTRIES } from '@/core/constants/countries';
import { useCategories } from '@/presentation/hooks/category/useCategories';

export function RequestForm({ request, onSubmit, onCancel, userId }) {
  const { categories, loading: categoriesLoading } = useCategories();
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!request;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      productName: request?.productName || '',
      categoryId: request?.categoryId || '',
      targetCountry: request?.targetCountry || '',
      quantity: request?.quantity || 1,
      description: request?.description || '',
      status: request?.status || 'active',
    },
  });

  const categoryId = watch('categoryId');
  const targetCountry = watch('targetCountry');

  const handleFormSubmit = async (data) => {
    setSubmitting(true);

    try {
      const requestData = {
        ...data,
        userId,
      };

      await onSubmit(requestData);
      toast.success(isEditing ? 'Request updated!' : 'Request created!');
    } catch (error) {
      toast.error(error.message || 'Failed to save request');
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
          {...register('productName')}
          error={!!errors.productName}
          disabled={submitting}
          placeholder="e.g., Steel Pipes"
        />
        {errors.productName && (
          <p className="mt-1 text-sm text-red-600">{errors.productName.message}</p>
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

      {/* Target Country & Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Target Country <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={COUNTRIES}
            value={targetCountry}
            onChange={(value) => setValue('targetCountry', value, { shouldValidate: true })}
            placeholder="Select country"
            disabled={submitting}
            error={!!errors.targetCountry}
          />
          {errors.targetCountry && (
            <p className="mt-1 text-sm text-red-600">{errors.targetCountry.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Quantity <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            error={!!errors.quantity}
            disabled={submitting}
            min="1"
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
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
          placeholder="Describe your request in detail..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEditing ? 'Update Request' : 'Create Request'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default RequestForm;
