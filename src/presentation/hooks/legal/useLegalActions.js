/**
 * useLegalActions Hook
 *
 * Provides hire, respond, close, and review actions for legal engagements.
 * All actions call Cloud Functions via httpsCallable.
 *
 * Follows the useDealActions.js and useQuoteActions.js patterns exactly.
 *
 * Usage:
 * const { hireLawyer, respondToHireRequest, closeLegalEngagement, submitReview, loading, error } = useLegalActions();
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

/**
 * Legal engagement action handlers — all state transitions go through Cloud Functions.
 *
 * @returns {{
 *   hireLawyer: (dealId: string, lawyerId: string) => Promise<Object|null>,
 *   respondToHireRequest: (engagementId: string, action: 'accept'|'decline') => Promise<Object|null>,
 *   closeLegalEngagement: (engagementId: string) => Promise<Object|null>,
 *   submitReview: (engagementId: string, rating: number, comment: string) => Promise<Object|null>,
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useLegalActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Hire a lawyer for a deal.
   * Creates a new engagement in 'pending' status.
   *
   * @param {string} dealId - Deal to attach the engagement to
   * @param {string} lawyerId - UID of the lawyer to hire
   * @returns {Promise<Object|null>} { engagementId, status } or null on error
   */
  const hireLawyer = async (dealId, lawyerId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'hireLayyer');
      const result = await fn({ dealId, lawyerId });
      toast.success('Hire request sent! Awaiting lawyer confirmation.');
      return result.data;
    } catch (err) {
      const msg = err?.message || 'Failed to send hire request';
      setError(msg);
      toast.error(`Failed to send hire request: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Respond to a hire request (lawyer action).
   * action 'accept' transitions engagement to 'active'.
   * action 'decline' transitions engagement to 'completed' (terminated).
   *
   * @param {string} engagementId - Engagement document ID
   * @param {'accept'|'decline'} action - Response action
   * @returns {Promise<Object|null>} { status } or null on error
   */
  const respondToHireRequest = async (engagementId, action) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'respondToHireRequest');
      const result = await fn({ engagementId, action });
      const successMsg = action === 'accept' ? 'Engagement accepted!' : 'Request declined.';
      toast.success(successMsg);
      return result.data;
    } catch (err) {
      const msg = err?.message || 'Failed to respond to hire request';
      setError(msg);
      toast.error(`Failed to respond: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Close an active legal engagement.
   * Transitions engagement to 'completed' status.
   *
   * @param {string} engagementId - Engagement document ID
   * @returns {Promise<Object|null>} { status } or null on error
   */
  const closeLegalEngagement = async (engagementId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'closeLegalEngagement');
      const result = await fn({ engagementId });
      toast.success('Engagement closed.');
      return result.data;
    } catch (err) {
      const msg = err?.message || 'Failed to close engagement';
      setError(msg);
      toast.error(`Failed to close engagement: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit a review for a completed engagement.
   *
   * @param {string} engagementId - Engagement document ID
   * @param {number} rating - Star rating (1-5)
   * @param {string} comment - Review text
   * @returns {Promise<Object|null>} Result data or null on error
   */
  const submitReview = async (engagementId, rating, comment) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'submitLawyerReview');
      const result = await fn({ engagementId, rating, comment });
      toast.success('Review submitted!');
      return result.data;
    } catch (err) {
      const msg = err?.message || 'Failed to submit review';
      setError(msg);
      toast.error(`Failed to submit review: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve a contract draft and apply it to the deal.
   * Only callable by the client on an active engagement.
   *
   * @param {string} engagementId - Engagement document ID
   * @param {string} draftId - Draft document ID to approve
   * @returns {Promise<Object|null>} { success } or null on error
   */
  const approveDraft = async (engagementId, draftId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'approveLegalDraft');
      const result = await fn({ engagementId, draftId });
      toast.success('Draft approved and applied to deal!');
      return result.data;
    } catch (err) {
      const msg = err?.message || 'Failed to approve draft';
      setError(msg);
      toast.error(`Failed to approve draft: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    hireLawyer,
    respondToHireRequest,
    closeLegalEngagement,
    submitReview,
    approveDraft,
    loading,
    error,
  };
}

export default useLegalActions;
