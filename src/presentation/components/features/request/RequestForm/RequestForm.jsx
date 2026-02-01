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
import { UNIT_CATEGORIES, getUnitsByCategory } from '@/core/constants/units';
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
      unit: request?.unit || 'PCE',
      unitCategory: request?.unitCategory || 'Quantity',
      description: request?.description || '',
      budget: request?.budget || '',
      status: request?.status || 'active',
    },
  });

  const categoryId = watch('categoryId');
  const targetCountry = watch('targetCountry');
  const unitCategory = watch('unitCategory');
  const unit = watch('unit');
  const quantity = watch('quantity');

  // Get filtered units based on selected category
  const availableUnits = getUnitsByCategory(unitCategory).map((u) => ({
    value: u.code,
    label: u.label,
  }));

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
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Product Name <span className="text-[#3b82f6]">*</span>
        </label>
        <Input
          type="text"
          {...register('productName')}
          error={!!errors.productName}
          disabled={submitting}
          placeholder="e.g., Steel Pipes"
          className="bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20"
        />
        {errors.productName && (
          <p className="mt-1 text-sm text-red-400">{errors.productName.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category <span className="text-[#3b82f6]">*</span>
        </label>
        <SearchableSelect
          options={categories}
          value={categoryId}
          onChange={(value) => setValue('categoryId', value, { shouldValidate: true })}
          placeholder="Select category"
          disabled={submitting || categoriesLoading}
          error={!!errors.categoryId}
          className="dark-select dark-select-blue"
        />
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-400">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Target Country & Target Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Country <span className="text-[#3b82f6]">*</span>
          </label>
          <SearchableSelect
            options={COUNTRIES}
            value={targetCountry}
            onChange={(value) => setValue('targetCountry', value, { shouldValidate: true })}
            placeholder="Select country"
            disabled={submitting}
            error={!!errors.targetCountry}
            className="dark-select dark-select-blue"
          />
          {errors.targetCountry && (
            <p className="mt-1 text-sm text-red-400">{errors.targetCountry.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Budget (USD) <span className="text-[#3b82f6]">*</span>
          </label>
          <Input
            type="number"
            {...register('budget', { valueAsNumber: true })}
            error={!!errors.budget}
            disabled={submitting}
            placeholder="0 = Negotiable"
            min="0"
            step="any"
            className="bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20"
          />
          {errors.budget && (
            <p className="mt-1 text-sm text-red-400">{errors.budget.message}</p>
          )}
        </div>
      </div>

      {/* Unit Category & Unit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Unit Category <span className="text-[#3b82f6]">*</span>
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
            className="dark-select dark-select-blue"
          />
          {errors.unitCategory && (
            <p className="mt-1 text-sm text-red-400">{errors.unitCategory.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Unit <span className="text-[#3b82f6]">*</span>
          </label>
          <SearchableSelect
            options={availableUnits}
            value={unit}
            onChange={(value) => setValue('unit', value, { shouldValidate: true })}
            placeholder="Select unit"
            disabled={submitting}
            error={!!errors.unit}
            className="dark-select dark-select-blue"
          />
          {errors.unit && (
            <p className="mt-1 text-sm text-red-400">{errors.unit.message}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quantity <span className="text-[#3b82f6]">*</span>
        </label>
        <Input
          type="number"
          {...register('quantity', { valueAsNumber: true })}
          error={!!errors.quantity}
          disabled={submitting}
          min="0.0000001"
          step="any"
          className="bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20"
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-400">{errors.quantity.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-[#3b82f6]">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 bg-[#0F1B2B] text-white placeholder:text-gray-500 ${errors.description
            ? 'border-red-500 focus:border-red-600 focus:ring-red-500/20'
            : 'border-[rgba(255,255,255,0.1)] focus:border-[#3b82f6] focus:ring-[#3b82f6]/20'
            }`}
          disabled={submitting}
          placeholder="Describe your request in detail..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
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
