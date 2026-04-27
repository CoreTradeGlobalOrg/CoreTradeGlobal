/**
 * useQuoteRequests Hook
 *
 * Real-time subscription to all quote requests assigned to a provider.
 * Computes kanban column groupings from request status for the provider dashboard.
 *
 * Usage:
 * const { requests, columns, loading, error } = useQuoteRequests(providerUid);
 *
 * columns shape:
 *   { newRequests: QuoteRequest[], quoted: QuoteRequest[], declined: QuoteRequest[], selected: QuoteRequest[] }
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { container } from '@/core/di/container';

/**
 * Subscribe to all quote requests for a specific provider UID.
 * Returns real-time data grouped into kanban columns.
 *
 * @param {string|null} providerUid - UID of the authenticated provider
 * @returns {{
 *   requests: import('@/domain/entities/QuoteRequest').QuoteRequest[],
 *   columns: { newRequests: QuoteRequest[], quoted: QuoteRequest[], declined: QuoteRequest[], selected: QuoteRequest[] },
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useQuoteRequests(providerUid) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Clean up any previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!providerUid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const quoteRequestRepository = container.getQuoteRequestRepository();

      const unsubscribe = quoteRequestRepository.subscribeToRequestsForProvider(
        providerUid,
        (updatedRequests) => {
          setRequests(updatedRequests);
          setLoading(false);
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('useQuoteRequests subscription error:', err);
      setError(err.message || 'Failed to load quote requests.');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [providerUid]);

  /**
   * Group requests into kanban columns using the entity's getKanbanColumn() method.
   * Memoized to avoid unnecessary re-renders when requests array reference changes.
   */
  const columns = useMemo(() => ({
    newRequests: requests.filter((r) => r.getKanbanColumn() === 'newRequests'),
    quoted: requests.filter((r) => r.getKanbanColumn() === 'quoted'),
    declined: requests.filter((r) => r.getKanbanColumn() === 'declined'),
    selected: requests.filter((r) => r.getKanbanColumn() === 'selected'),
  }), [requests]);

  return { requests, columns, loading, error };
}

export default useQuoteRequests;
