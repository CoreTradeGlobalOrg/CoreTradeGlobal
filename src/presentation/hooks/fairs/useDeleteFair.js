/**
 * useDeleteFair Hook
 *
 * Custom hook for deleting fairs (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useDeleteFair() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteFair = async (fairId) => {
    setLoading(true);
    setError(null);

    try {
      const fairsRepository = container.getFairsRepository();

      await fairsRepository.delete(fairId);

      toast.success('Fuar başarıyla silindi!');
    } catch (err) {
      console.error('useDeleteFair error:', err);
      setError(err.message);
      toast.error('Fuar silinirken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteFair,
    loading,
    error,
  };
}

export default useDeleteFair;
