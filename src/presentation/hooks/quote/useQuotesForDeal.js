/**
 * useQuotesForDeal Hook
 *
 * Real-time two-level subscription for the buyer quotes comparison page.
 *
 * Level 1: Subscribe to all quote requests for the deal.
 * Level 2: For each quote request, subscribe to its providerQuotes subcollection.
 *
 * Aggregates all quotes into insurance and logistics splits.
 * Tracks selected quotes (status 'accepted') for each provider type.
 *
 * Usage:
 * const {
 *   quoteRequests, insuranceQuotes, logisticsQuotes,
 *   selectedInsuranceQuote, selectedLogisticsQuote,
 *   insuranceRequestCount, logisticsRequestCount, declinedCount,
 *   allQuotes, loading
 * } = useQuotesForDeal(dealId);
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { container } from '@/core/di/container';
import { QUOTE_STATUS } from '@/core/constants/quoteConstants';

/**
 * Subscribe to all quote requests and their provider quotes for a deal.
 * Returns real-time data split by insurance and logistics types.
 *
 * @param {string|null} dealId - Firestore deal document ID
 * @returns {{
 *   quoteRequests: import('@/domain/entities/QuoteRequest').QuoteRequest[],
 *   insuranceQuotes: import('@/domain/entities/Quote').Quote[],
 *   logisticsQuotes: import('@/domain/entities/Quote').Quote[],
 *   selectedInsuranceQuote: import('@/domain/entities/Quote').Quote|null,
 *   selectedLogisticsQuote: import('@/domain/entities/Quote').Quote|null,
 *   insuranceRequestCount: number,
 *   logisticsRequestCount: number,
 *   declinedCount: number,
 *   allQuotes: import('@/domain/entities/Quote').Quote[],
 *   loading: boolean
 * }}
 */
export function useQuotesForDeal(dealId) {
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track all active subscriptions for cleanup on unmount or dealId change
  const unsubscribesRef = useRef([]);

  useEffect(() => {
    // Clean up all previous subscriptions
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];

    if (!dealId) {
      setQuoteRequests([]);
      setAllQuotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Track per-request quote maps for aggregation
    const quotesMapRef = {}; // requestId -> Quote[]
    let requestsLoaded = false;

    /**
     * Aggregate all per-request quote arrays into a single flat array.
     * Called whenever any quote subscription updates.
     */
    function aggregateQuotes() {
      const all = Object.values(quotesMapRef).flat();
      setAllQuotes(all);
    }

    // Level 1: Subscribe to all quote requests for the deal
    const unsubRequests = container
      .getQuoteRequestRepository()
      .subscribeToRequestsForDeal(dealId, (requests) => {
        setQuoteRequests(requests);

        // Level 2: For each new request, subscribe to its providerQuotes if not already subscribed
        requests.forEach((request) => {
          if (!quotesMapRef.hasOwnProperty(request.id)) {
            // Initialize with empty array so we get an entry even before quotes arrive
            quotesMapRef[request.id] = [];

            const unsubQuotes = container
              .getQuoteRepository()
              .subscribeToQuotesForRequest(request.id, (quotes) => {
                quotesMapRef[request.id] = quotes;
                aggregateQuotes();
              });

            unsubscribesRef.current.push(unsubQuotes);
          }
        });

        if (!requestsLoaded) {
          requestsLoaded = true;
          // Allow a brief moment for per-request subscriptions to fire before clearing loading
          // If there are no requests, we're done immediately
          if (requests.length === 0) {
            setLoading(false);
          } else {
            // Clear loading after a tick to allow quote subscriptions to initialize
            setTimeout(() => setLoading(false), 0);
          }
        }
      });

    unsubscribesRef.current.push(unsubRequests);

    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
      unsubscribesRef.current = [];
    };
  }, [dealId]);

  // ── Derived state (memoized) ───────────────────────────────────────────────

  /**
   * Active insurance quotes: providerType 'insurance', status not withdrawn/expired.
   * Includes 'accepted' quotes so the selected quote remains visible.
   */
  const insuranceQuotes = useMemo(
    () =>
      allQuotes.filter(
        (q) =>
          q.providerType === 'insurance' &&
          q.status !== QUOTE_STATUS.WITHDRAWN &&
          q.status !== QUOTE_STATUS.EXPIRED
      ),
    [allQuotes]
  );

  /**
   * Active logistics quotes: providerType 'logistics', status not withdrawn/expired.
   */
  const logisticsQuotes = useMemo(
    () =>
      allQuotes.filter(
        (q) =>
          q.providerType === 'logistics' &&
          q.status !== QUOTE_STATUS.WITHDRAWN &&
          q.status !== QUOTE_STATUS.EXPIRED
      ),
    [allQuotes]
  );

  /**
   * The insurance quote the buyer has accepted (status 'accepted'), if any.
   */
  const selectedInsuranceQuote = useMemo(
    () =>
      allQuotes.find(
        (q) =>
          q.providerType === 'insurance' && q.status === QUOTE_STATUS.ACCEPTED
      ) || null,
    [allQuotes]
  );

  /**
   * The logistics quote the buyer has accepted (status 'accepted'), if any.
   */
  const selectedLogisticsQuote = useMemo(
    () =>
      allQuotes.find(
        (q) =>
          q.providerType === 'logistics' && q.status === QUOTE_STATUS.ACCEPTED
      ) || null,
    [allQuotes]
  );

  /**
   * Count of insurance quote requests (not quotes — the requests themselves).
   */
  const insuranceRequestCount = useMemo(
    () => quoteRequests.filter((r) => r.providerType === 'insurance').length,
    [quoteRequests]
  );

  /**
   * Count of logistics quote requests.
   */
  const logisticsRequestCount = useMemo(
    () => quoteRequests.filter((r) => r.providerType === 'logistics').length,
    [quoteRequests]
  );

  /**
   * Count of declined quote requests (provider explicitly declined).
   */
  const declinedCount = useMemo(
    () => quoteRequests.filter((r) => r.isDeclined()).length,
    [quoteRequests]
  );

  return {
    quoteRequests,
    insuranceQuotes,
    logisticsQuotes,
    selectedInsuranceQuote,
    selectedLogisticsQuote,
    insuranceRequestCount,
    logisticsRequestCount,
    declinedCount,
    allQuotes,
    loading,
  };
}

export default useQuotesForDeal;
