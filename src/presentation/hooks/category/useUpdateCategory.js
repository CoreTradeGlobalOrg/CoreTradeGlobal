/**
 * useUpdateCategory Hook
 *
 * Custom hook for updating categories (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useUpdateCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateCategory = async (categoryId, categoryData) => {
    setLoading(true);
    setError(null);

    try {
      const categoryRepository = container.getCategoryRepository();

      await categoryRepository.update(categoryId, {
        ...categoryData,
        updatedAt: new Date(),
      });

      toast.success('Category updated successfully!');
    } catch (err) {
      console.error('useUpdateCategory error:', err);
      setError(err.message);
      toast.error('Failed to update category');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateCategory,
    loading,
    error,
  };
}

export default useUpdateCategory;
