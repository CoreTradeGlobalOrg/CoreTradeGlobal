/**
 * useUpdateNews Hook
 *
 * Custom hook for updating news articles (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useUpdateNews() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateNews = async (newsId, newsData) => {
    setLoading(true);
    setError(null);

    try {
      const newsRepository = container.getNewsRepository();

      await newsRepository.update(newsId, newsData);

      toast.success('Haber başarıyla güncellendi!');
    } catch (err) {
      console.error('useUpdateNews error:', err);
      setError(err.message);
      toast.error('Haber güncellenirken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const publishNews = async (newsId) => {
    setLoading(true);
    setError(null);

    try {
      const newsRepository = container.getNewsRepository();

      await newsRepository.publish(newsId);

      toast.success('Haber yayınlandı!');
    } catch (err) {
      console.error('publishNews error:', err);
      setError(err.message);
      toast.error('Haber yayınlanırken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unpublishNews = async (newsId) => {
    setLoading(true);
    setError(null);

    try {
      const newsRepository = container.getNewsRepository();

      await newsRepository.unpublish(newsId);

      toast.success('Haber yayından kaldırıldı!');
    } catch (err) {
      console.error('unpublishNews error:', err);
      setError(err.message);
      toast.error('Haber yayından kaldırılırken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateNews,
    publishNews,
    unpublishNews,
    loading,
    error,
  };
}

export default useUpdateNews;
