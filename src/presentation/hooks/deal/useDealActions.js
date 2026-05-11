/**
 * useDealActions Hook
 *
 * Provides action handlers for deal negotiation operations.
 * All actions call Cloud Functions via httpsCallable (Admin SDK enforces state machine).
 *
 * Usage:
 * const { submitCounterOffer, acceptOffer, rejectOffer, withdrawOffer, loading, error } = useDealActions();
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

/**
 * Deal action handlers — all state transitions go through Cloud Functions.
 *
 * @returns {{
 *   submitCounterOffer: (dealId: string, offerData: Object, expectedRound: number) => Promise<void>,
 *   acceptOffer: (dealId: string, offerId: string) => Promise<void>,
 *   rejectOffer: (dealId: string, offerId: string) => Promise<void>,
 *   withdrawOffer: (dealId: string, offerId: string) => Promise<void>,
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useDealActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Submit a counter-offer for a deal.
   * Guard: must be the current turn holder; expectedRound prevents stale writes.
   *
   * @param {string} dealId
   * @param {Object} offerData - Offer form fields
   * @param {number} expectedRound - Current deal round (stale write prevention)
   */
  const submitCounterOffer = async (dealId, offerData, expectedRound) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'submitCounterOffer');
      await fn({ dealId, offer: offerData, expectedRound });
      toast.success('Counter-offer submitted!');
    } catch (err) {
      const msg = err?.message || 'Failed to submit counter-offer';
      setError(msg);
      toast.error(`Failed to submit counter-offer: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accept the latest open offer for a deal.
   *
   * @param {string} dealId
   * @param {string} offerId
   */
  const acceptOffer = async (dealId, offerId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'acceptOffer');
      await fn({ dealId, offerId });
      toast.success('Offer accepted!');
    } catch (err) {
      const msg = err?.message || 'Failed to accept offer';
      setError(msg);
      toast.error(`Failed to accept offer: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reject the latest open offer for a deal.
   *
   * @param {string} dealId
   * @param {string} offerId
   */
  const rejectOffer = async (dealId, offerId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'rejectOffer');
      await fn({ dealId, offerId });
      toast.success('Offer rejected.');
    } catch (err) {
      const msg = err?.message || 'Failed to reject offer';
      setError(msg);
      toast.error(`Failed to reject offer: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw a previously submitted open offer.
   * Only callable by the offer submitter before the receiver responds.
   *
   * @param {string} dealId
   * @param {string} offerId
   */
  const withdrawOffer = async (dealId, offerId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'withdrawOffer');
      await fn({ dealId, offerId });
      toast.success('Offer withdrawn.');
    } catch (err) {
      const msg = err?.message || 'Failed to withdraw offer';
      setError(msg);
      toast.error(`Failed to withdraw offer: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitCounterOffer,
    acceptOffer,
    rejectOffer,
    withdrawOffer,
    loading,
    error,
  };
}

export default useDealActions;
