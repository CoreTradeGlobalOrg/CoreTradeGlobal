/**
 * useQuoteForRequest Hook
 *
 * Real-time subscription to the current provider's quote for a specific quote request.
 * Used by ProviderDashboard to pass existingQuote to QuoteDetailView for edit mode
 * and withdraw functionality.
 *
 * Returns the first (most recent) quote from the subscribed array, since a provider
 * can only have one quote per request.
 *
 * Usage:
 * const { quote, loading } = useQuoteForRequest(requestId, providerUid);
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { container } from '@/core/di/container';

/**
 * Subscribe to the provider's quote under a specific quote request.
 *
 * @param {string|null} requestId - QuoteRequest document ID
 * @param {string|null} providerUid - Current provider's UID
 * @returns {{ quote: import('@/domain/entities/Quote').Quote|null, loading: boolean }}
 */
export function useQuoteForRequest(requestId, providerUid) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!requestId || !providerUid) {
      setQuote(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const quoteRepository = container.getQuoteRepository();

    const unsubscribe = quoteRepository.subscribeToQuotesForRequest(
      requestId,
      providerUid,
      (quotes) => {
        // Provider has at most one quote per request — take the first (most recent)
        setQuote(quotes.length > 0 ? quotes[0] : null);
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
  }, [requestId, providerUid]);

  return { quote, loading };
}

export default useQuoteForRequest;
