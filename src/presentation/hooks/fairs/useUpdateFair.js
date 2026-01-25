/**
 * useUpdateFair Hook
 *
 * Custom hook for updating fairs (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useUpdateFair() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateFair = async (fairId, fairData) => {
    setLoading(true);
    setError(null);

    try {
      const fairsRepository = container.getFairsRepository();

      await fairsRepository.update(fairId, fairData);

      toast.success('Fuar başarıyla güncellendi!');
    } catch (err) {
      console.error('useUpdateFair error:', err);
      setError(err.message);
      toast.error('Fuar güncellenirken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateFair,
    loading,
    error,
  };
}

export default useUpdateFair;
