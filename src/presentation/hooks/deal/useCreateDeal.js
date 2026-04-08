/**
 * useCreateDeal Hook
 *
 * Custom hook for creating a deal from a product-based conversation.
 * Calls the createDeal Cloud Function and navigates to the new deal page on success.
 *
 * Follows the same pattern as useCreateProduct.js and other CF-calling hooks.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';

export function useCreateDeal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  /**
   * Create a new deal from a product conversation
   * @param {Object} params
   * @param {string} params.conversationId - Originating conversation ID
   * @param {string} params.productId - Product being negotiated
   * @param {Object} params.initialOffer - Validated offer data (from DealForm)
   */
  const createDeal = async ({ conversationId, productId, initialOffer }) => {
    setLoading(true);
    setError(null);

    try {
      const createDealFn = httpsCallable(functions, 'createDeal');
      const result = await createDealFn({ conversationId, productId, initialOffer });

      const { dealId } = result.data;
      router.push(`/deals/${dealId}`);

      return result.data;
    } catch (err) {
      console.error('useCreateDeal error:', err);
      const message = err?.message || 'Failed to create deal. Please try again.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createDeal,
    loading,
    error,
  };
}

export default useCreateDeal;
