/**
 * CategoryForm Component
 *
 * Form for creating and editing categories (admin only)
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { categorySchema } from '@/core/validation/categorySchema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';

export function CategoryForm({ category, categories = [], onSubmit, onCancel }) {
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!category;

  // Filter out current category from parent options to prevent circular reference
  const parentOptions = [
    { value: null, label: 'None (Top Level)' },
    ...categories
      .filter((cat) => !category || cat.value !== category.id)
      .map((cat) => ({
        value: cat.value,
        label: cat.label,
      })),
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      iconUrl: category?.iconUrl || '',
      parentId: category?.parentId || null,
    },
  });

  const parentId = watch('parentId');

  const handleFormSubmit = async (data) => {
    setSubmitting(true);

    try {
      await onSubmit(data);
      toast.success(isEditing ? 'Category updated!' : 'Category created!');
    } catch (error) {
      toast.error(error.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Category Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Category Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          {...register('name')}
          error={!!errors.name}
          disabled={submitting}
          placeholder="e.g., Electronics"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Icon (Emoji) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Icon (Emoji) <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          {...register('iconUrl')}
          error={!!errors.iconUrl}
          disabled={submitting}
          placeholder="e.g., 🔌"
          maxLength={10}
        />
        {errors.iconUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.iconUrl.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Use a single emoji character (e.g., 🔌 ⚙️ 🏗️)
        </p>
      </div>

      {/* Parent Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Parent Category
        </label>
        <SearchableSelect
          options={parentOptions}
          value={parentId}
          onChange={(value) => setValue('parentId', value === 'null' ? null : value, { shouldValidate: true })}
          placeholder="Select parent category (optional)"
          disabled={submitting}
          error={!!errors.parentId}
        />
        {errors.parentId && (
          <p className="mt-1 text-sm text-red-600">{errors.parentId.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Leave as "None" to create a top-level category
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default CategoryForm;
