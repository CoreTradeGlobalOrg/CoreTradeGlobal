/**
 * useRequest Hook
 *
 * Custom hook for fetching a single request by ID
 * Used for request detail pages
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useRequest(requestId) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequest = async () => {
    if (!requestId) {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestRepository = container.getRequestRepository();
      const fetchedRequest = await requestRepository.getById(requestId);

      if (!fetchedRequest) {
        setError('Request not found');
        setRequest(null);
      } else {
        setRequest(fetchedRequest);
      }
    } catch (err) {
      console.error('useRequest error:', err);
      setError(err.message);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  return {
    request,
    loading,
    error,
    refetch: fetchRequest,
  };
}

export default useRequest;
