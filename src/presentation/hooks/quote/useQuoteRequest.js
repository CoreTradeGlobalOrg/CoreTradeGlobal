/**
 * useQuoteRequest Hook
 *
 * Real-time subscription to a single QuoteRequest document by ID.
 * Used by the /provider/quotes/[requestId] route page to load the correct request.
 *
 * Usage:
 * const { request, loading, error } = useQuoteRequest(requestId);
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { container } from '@/core/di/container';

/**
 * Subscribe to a single quote request document by ID.
 *
 * @param {string|null} requestId - QuoteRequest document ID
 * @returns {{
 *   request: import('@/domain/entities/QuoteRequest').QuoteRequest|null,
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useQuoteRequest(requestId) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!requestId) {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const quoteRequestRepository = container.getQuoteRequestRepository();

    const unsubscribe = quoteRequestRepository.subscribeToRequest(
      requestId,
      (updatedRequest) => {
        if (updatedRequest === null) {
          setRequest(null);
          setError('Quote request not found');
        } else {
          setRequest(updatedRequest);
          setError(null);
        }
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [requestId]);

  return { request, loading, error };
}

export default useQuoteRequest;
