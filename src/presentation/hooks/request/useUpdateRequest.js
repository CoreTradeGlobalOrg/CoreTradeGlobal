/**
 * useUpdateRequest Hook
 *
 * Custom hook for updating requests
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { UpdateRequestUseCase } from '@/domain/usecases/request/UpdateRequestUseCase';

export function useUpdateRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateRequest = async (requestId, userId, updateData, { isAdmin = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const requestRepository = container.getRequestRepository();
      const updateRequestUseCase = new UpdateRequestUseCase(requestRepository);
      const request = await updateRequestUseCase.execute(
        requestId,
        userId,
        updateData,
        { isAdmin }
      );
      return request;
    } catch (err) {
      console.error('useUpdateRequest error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateRequest,
    loading,
    error,
  };
}

export default useUpdateRequest;
