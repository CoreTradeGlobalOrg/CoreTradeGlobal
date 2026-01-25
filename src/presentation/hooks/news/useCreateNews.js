/**
 * useCreateNews Hook
 *
 * Custom hook for creating news articles (admin only)
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useCreateNews() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createNews = async (newsData) => {
    setLoading(true);
    setError(null);

    try {
      const newsRepository = container.getNewsRepository();

      const news = await newsRepository.create(newsData);

      toast.success('Haber başarıyla oluşturuldu!');
      return news;
    } catch (err) {
      console.error('useCreateNews error:', err);
      setError(err.message);
      toast.error('Haber oluşturulurken hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createNews,
    loading,
    error,
  };
}

export default useCreateNews;
