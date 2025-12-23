/**
 * useCategories Hook
 *
 * Custom hook for fetching categories
 * Fetches all categories for dropdowns/selects
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const categoryRepository = container.getCategoryRepository();
      const fetchedCategories = await categoryRepository.getAll();

      // Transform to SearchableSelect format with icons
      const formattedCategories = fetchedCategories.map((cat) => ({
        value: cat.id,
        label: cat.iconUrl ? `${cat.iconUrl} ${cat.name}` : cat.name,
        icon: cat.iconUrl,
        name: cat.name,
      }));

      setCategories(formattedCategories);
    } catch (err) {
      console.error('useCategories error:', err);
      setError(err.message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

export default useCategories;
