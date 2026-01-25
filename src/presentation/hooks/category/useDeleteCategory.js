/**
 * useDeleteCategory Hook
 *
 * Custom hook for deleting categories (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useDeleteCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteCategory = async (categoryId) => {
    setLoading(true);
    setError(null);

    try {
      const categoryRepository = container.getCategoryRepository();
      await categoryRepository.delete(categoryId);

      toast.success('Category deleted successfully!');
    } catch (err) {
      console.error('useDeleteCategory error:', err);
      setError(err.message);
      toast.error('Failed to delete category');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteCategory,
    loading,
    error,
  };
}

export default useDeleteCategory;
