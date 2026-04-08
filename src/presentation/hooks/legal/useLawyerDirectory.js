/**
 * useLawyerDirectory Hook
 *
 * Fetches all lawyers from Firestore and applies client-side filtering.
 * Client-side filtering is appropriate because the lawyer population is small
 * and Firestore cannot combine multiple array-contains filters in one query.
 *
 * Filters supported:
 *   - search: filter by displayName or companyName (case-insensitive)
 *   - specialization: filter where lawyer's specializations array includes value
 *   - availability: filter where isAvailable === true
 *   - language: filter where lawyer's languages array includes value
 *
 * Sort order: available lawyers first, then by rating descending, then alphabetically
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { container } from '@/core/di/container';

const DEFAULT_FILTERS = {
  search: '',
  specialization: null,
  availability: null,
  language: null,
};

/**
 * @returns {{
 *   lawyers: Object[],
 *   loading: boolean,
 *   error: string|null,
 *   filters: Object,
 *   setFilter: (key: string, value: any) => void,
 *   clearFilters: () => void,
 * }}
 */
export function useLawyerDirectory() {
  const [allLawyers, setAllLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Fetch all lawyers on mount
  useEffect(() => {
    let cancelled = false;

    const fetchLawyers = async () => {
      try {
        setLoading(true);
        setError(null);
        const userRepository = container.getUserRepository();
        const lawyers = await userRepository.getLawyers();
        if (!cancelled) {
          setAllLawyers(lawyers);
        }
      } catch (err) {
        console.error('[useLawyerDirectory] Failed to fetch lawyers:', err);
        if (!cancelled) {
          setError('Failed to load lawyers. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLawyers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Client-side filtering + sorting (memoized to avoid re-filtering every render)
  const lawyers = useMemo(() => {
    let result = [...allLawyers];

    // Filter: search by displayName or companyName
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.displayName || '').toLowerCase().includes(searchLower) ||
          (l.companyName || '').toLowerCase().includes(searchLower)
      );
    }

    // Filter: specialization (array-contains)
    if (filters.specialization) {
      result = result.filter(
        (l) =>
          Array.isArray(l.specializations) &&
          l.specializations.includes(filters.specialization)
      );
    }

    // Filter: availability
    if (filters.availability === true) {
      result = result.filter((l) => l.isAvailable === true);
    }

    // Filter: language (array-contains)
    if (filters.language) {
      result = result.filter(
        (l) =>
          Array.isArray(l.languages) &&
          l.languages.includes(filters.language)
      );
    }

    // Sort: available first, then by rating desc, then alphabetically
    result.sort((a, b) => {
      // Available lawyers first
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;

      // Then by rating descending (higher rating first)
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      if (ratingB !== ratingA) return ratingB - ratingA;

      // Then alphabetically by displayName
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

    return result;
  }, [allLawyers, filters]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    lawyers,
    loading,
    error,
    filters,
    setFilter,
    clearFilters,
  };
}

export default useLawyerDirectory;
