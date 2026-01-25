/**
 * useCreateFair Hook
 *
 * Custom hook for creating fairs (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useCreateFair() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createFair = async (fairData) => {
    setLoading(true);
    setError(null);

    try {
      const fairsRepository = container.getFairsRepository();

      const fair = await fairsRepository.create(fairData);

      toast.success('Fuar başarıyla oluşturuldu!');
      return fair;
    } catch (err) {
      console.error('useCreateFair error:', err);
      setError(err.message);
      toast.error('Fuar oluşturulurken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createFair,
    loading,
    error,
  };
}

export default useCreateFair;
