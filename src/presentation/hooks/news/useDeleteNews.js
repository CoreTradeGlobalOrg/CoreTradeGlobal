/**
 * useDeleteNews Hook
 *
 * Custom hook for deleting news articles (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useDeleteNews() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteNews = async (newsId) => {
    setLoading(true);
    setError(null);

    try {
      const newsRepository = container.getNewsRepository();

      await newsRepository.delete(newsId);

      toast.success('Haber başarıyla silindi!');
    } catch (err) {
      console.error('useDeleteNews error:', err);
      setError(err.message);
      toast.error('Haber silinirken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteNews,
    loading,
    error,
  };
}

export default useDeleteNews;
