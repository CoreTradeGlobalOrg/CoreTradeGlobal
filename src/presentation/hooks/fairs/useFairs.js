/**
 * useFairs Hook
 *
 * Custom hook for fetching fairs
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useFairs(options = {}) {
  const [fairs, setFairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFairs = async () => {
    setLoading(true);
    setError(null);

    try {
      const fairsRepository = container.getFairsRepository();

      let fetchedFairs;
      if (options.status) {
        fetchedFairs = await fairsRepository.getByStatus(options.status, options);
      } else if (options.activeOnly) {
        fetchedFairs = await fairsRepository.getActive(options);
      } else {
        fetchedFairs = await fairsRepository.getAll(options);
      }

      setFairs(fetchedFairs);
    } catch (err) {
      console.error('useFairs error:', err);
      setError(err.message);
      setFairs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFairs();
  }, [options.status, options.activeOnly]);

  return {
    fairs,
    loading,
    error,
    refetch: fetchFairs,
  };
}

export default useFairs;
