/**
 * useDeleteRequest Hook
 *
 * Custom hook for deleting requests
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { DeleteRequestUseCase } from '@/domain/usecases/request/DeleteRequestUseCase';

export function useDeleteRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteRequest = async (requestId, userId) => {
    setLoading(true);
    setError(null);

    try {
      const requestRepository = container.getRequestRepository();
      const deleteRequestUseCase = new DeleteRequestUseCase(requestRepository);
      await deleteRequestUseCase.execute(requestId, userId);
    } catch (err) {
      console.error('useDeleteRequest error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteRequest,
    loading,
    error,
  };
}

export default useDeleteRequest;
