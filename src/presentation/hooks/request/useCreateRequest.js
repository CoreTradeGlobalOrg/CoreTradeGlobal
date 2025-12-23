/**
 * useCreateRequest Hook
 *
 * Custom hook for creating requests (RFQs)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { CreateRequestUseCase } from '@/domain/usecases/request/CreateRequestUseCase';

export function useCreateRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createRequest = async (requestData) => {
    setLoading(true);
    setError(null);

    try {
      const requestRepository = container.getRequestRepository();
      const createRequestUseCase = new CreateRequestUseCase(requestRepository);
      const request = await createRequestUseCase.execute(requestData);
      return request;
    } catch (err) {
      console.error('useCreateRequest error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createRequest,
    loading,
    error,
  };
}

export default useCreateRequest;
