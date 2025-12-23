/**
 * useRequests Hook
 *
 * Custom hook for fetching requests
 * Fetches requests by user ID
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';
import { GetRequestsUseCase } from '@/domain/usecases/request/GetRequestsUseCase';

export function useRequests(userId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestRepository = container.getRequestRepository();
      const getRequestsUseCase = new GetRequestsUseCase(requestRepository);
      const fetchedRequests = await getRequestsUseCase.getByUserId(userId);
      setRequests(fetchedRequests);
    } catch (err) {
      console.error('useRequests error:', err);
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
  };
}

export default useRequests;
