/**
 * useLegalEngagement Hook
 *
 * Real-time subscription to the legal engagement for a specific deal + client.
 * Used by LegalBanner on DealPage to show hire CTA or active engagement badge.
 *
 * Privacy guarantee: only subscribes using the CURRENT user's UID as clientId.
 * The opposing party's engagement (if any) is never queried.
 *
 * Usage:
 * const { engagement, loading, error } = useLegalEngagement(dealId, currentUserUid);
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

/**
 * Subscribe to the legal engagement for a specific deal + client in real time.
 *
 * @param {string|null} dealId - Firestore deal document ID
 * @param {string|null} clientId - UID of the current user (client)
 * @returns {{ engagement: import('@/domain/entities/LegalEngagement').LegalEngagement|null, loading: boolean, error: string|null }}
 */
export function useLegalEngagement(dealId, clientId) {
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dealId || !clientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const legalRepo = container.getLegalEngagementRepository();

    const unsub = legalRepo.subscribeToEngagementForDeal(dealId, clientId, (engagementData) => {
      setEngagement(engagementData);
      setLoading(false);
    });

    return () => unsub();
  }, [dealId, clientId]);

  return { engagement, loading, error };
}

export default useLegalEngagement;
