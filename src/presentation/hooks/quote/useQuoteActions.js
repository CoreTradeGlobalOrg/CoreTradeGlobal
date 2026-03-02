/**
 * useQuoteActions Hook
 *
 * Provides action handlers for provider quote operations.
 * All actions call Cloud Functions via httpsCallable (Admin SDK enforces state machine).
 *
 * Usage:
 * const { submitQuote, acceptQuote, declineRequest, withdrawQuote, confirmSelection, loading, error } = useQuoteActions();
 *
 * Follows the useDealActions.js pattern exactly.
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

/**
 * Provider quote action handlers — all state transitions go through Cloud Functions.
 *
 * @returns {{
 *   submitQuote: (requestId: string, quoteData: Object) => Promise<void>,
 *   acceptQuote: (quoteRequestId: string, quoteId: string) => Promise<void>,
 *   declineRequest: (requestId: string) => Promise<void>,
 *   withdrawQuote: (requestId: string, quoteId: string) => Promise<void>,
 *   confirmSelection: (dealId: string) => Promise<void>,
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useQuoteActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Submit a new quote for a quote request.
   * Moves the request from 'pending' to 'quoted' status.
   *
   * @param {string} requestId - Quote request document ID
   * @param {Object} quoteData - Insurance or logistics quote fields
   */
  const submitQuote = async (requestId, quoteData) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'submitQuote');
      await fn({ requestId, quoteData });
      toast.success('Quote submitted successfully!');
    } catch (err) {
      const msg = err?.message || 'Failed to submit quote';
      setError(msg);
      toast.error(`Failed to submit quote: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accept a quote on behalf of the buyer (select a provider's quote).
   * Handles failed-precondition error (expired quote) with a specific message.
   *
   * @param {string} quoteRequestId - Quote request document ID
   * @param {string} quoteId - Provider quote document ID
   */
  const acceptQuote = async (quoteRequestId, quoteId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'acceptQuote');
      await fn({ quoteRequestId, quoteId });
      toast.success('Quote accepted!');
    } catch (err) {
      const msg = err?.message || 'Failed to accept quote';
      setError(msg);
      // Handle expired quote with specific user-facing message
      if (err?.code === 'functions/failed-precondition' || msg.toLowerCase().includes('expired')) {
        toast.error('This quote has expired. Please request a new quote from the provider.');
      } else {
        toast.error(`Failed to accept quote: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Decline a pending quote request.
   * Provider explicitly rejects the request without submitting a quote.
   *
   * @param {string} requestId - Quote request document ID
   */
  const declineRequest = async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'declineQuoteRequest');
      await fn({ requestId });
      toast.success('Request declined.');
    } catch (err) {
      const msg = err?.message || 'Failed to decline request';
      setError(msg);
      toast.error(`Failed to decline request: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw a previously submitted quote before the buyer selects it.
   *
   * @param {string} requestId - Quote request document ID
   * @param {string} quoteId - Provider quote document ID
   */
  const withdrawQuote = async (requestId, quoteId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'withdrawQuote');
      await fn({ requestId, quoteId });
      toast.success('Quote withdrawn.');
    } catch (err) {
      const msg = err?.message || 'Failed to withdraw quote';
      setError(msg);
      toast.error(`Failed to withdraw quote: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirm provider selection for a deal.
   * Called after the buyer has selected both insurance and logistics providers.
   *
   * @param {string} dealId - Deal document ID
   */
  const confirmSelection = async (dealId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'confirmProviderSelection');
      await fn({ dealId });
      toast.success('Provider selection confirmed!');
    } catch (err) {
      const msg = err?.message || 'Failed to confirm selection';
      setError(msg);
      toast.error(`Failed to confirm selection: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitQuote,
    acceptQuote,
    declineRequest,
    withdrawQuote,
    confirmSelection,
    loading,
    error,
  };
}

export default useQuoteActions;
