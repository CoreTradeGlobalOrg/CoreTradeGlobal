/**
 * useLegalEngagements Hook
 *
 * Real-time subscription to all legal engagements for a lawyer.
 * Used by LawyerDashboard to show all engagements grouped by status.
 *
 * Provides derived state via useMemo:
 *   - pendingEngagements: awaiting lawyer response
 *   - activeEngagements: currently active engagements
 *   - completedEngagements: closed engagements
 *
 * Usage:
 * const { engagements, pendingEngagements, activeEngagements, completedEngagements, loading, error } = useLegalEngagements(lawyerId);
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { container } from '@/core/di/container';
import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';

/**
 * Subscribe to all legal engagements for a lawyer in real time.
 *
 * @param {string|null} lawyerId - UID of the lawyer
 * @returns {{
 *   engagements: import('@/domain/entities/LegalEngagement').LegalEngagement[],
 *   pendingEngagements: import('@/domain/entities/LegalEngagement').LegalEngagement[],
 *   activeEngagements: import('@/domain/entities/LegalEngagement').LegalEngagement[],
 *   completedEngagements: import('@/domain/entities/LegalEngagement').LegalEngagement[],
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useLegalEngagements(lawyerId) {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lawyerId) {
      setEngagements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const legalRepo = container.getLegalEngagementRepository();

    const unsub = legalRepo.subscribeToEngagementsForLawyer(lawyerId, (engagementsData) => {
      setEngagements(engagementsData);
      setLoading(false);
    });

    return () => unsub();
  }, [lawyerId]);

  const pendingEngagements = useMemo(
    () => engagements.filter((e) => e.status === ENGAGEMENT_STATUS.PENDING),
    [engagements]
  );

  const activeEngagements = useMemo(
    () => engagements.filter((e) => e.status === ENGAGEMENT_STATUS.ACTIVE),
    [engagements]
  );

  const completedEngagements = useMemo(
    () => engagements.filter((e) => e.status === ENGAGEMENT_STATUS.COMPLETED),
    [engagements]
  );

  return {
    engagements,
    pendingEngagements,
    activeEngagements,
    completedEngagements,
    loading,
    error,
  };
}

export default useLegalEngagements;
