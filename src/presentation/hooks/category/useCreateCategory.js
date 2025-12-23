/**
 * useCreateCategory Hook
 *
 * Custom hook for creating categories (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useCreateCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCategory = async (categoryData) => {
    setLoading(true);
    setError(null);

    try {
      const categoryRepository = container.getCategoryRepository();

      const category = await categoryRepository.create({
        ...categoryData,
        createdAt: new Date(),
      });

      toast.success('Category created successfully!');
      return category;
    } catch (err) {
      console.error('useCreateCategory error:', err);
      setError(err.message);
      toast.error('Failed to create category');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCategory,
    loading,
    error,
  };
}

export default useCreateCategory;
