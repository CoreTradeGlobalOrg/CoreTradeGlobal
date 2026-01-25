/**
 * useNews Hook
 *
 * Custom hook for fetching news articles
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useNews(options = {}) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);

    try {
      const newsRepository = container.getNewsRepository();

      let fetchedNews;
      if (options.publishedOnly) {
        fetchedNews = await newsRepository.getPublished(options);
      } else if (options.category) {
        fetchedNews = await newsRepository.getByCategory(options.category, options);
      } else if (options.draftsOnly) {
        fetchedNews = await newsRepository.getDrafts(options);
      } else {
        fetchedNews = await newsRepository.getAll(options);
      }

      setNews(fetchedNews);
    } catch (err) {
      console.error('useNews error:', err);
      setError(err.message);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [options.publishedOnly, options.category, options.draftsOnly]);

  return {
    news,
    loading,
    error,
    refetch: fetchNews,
  };
}

export default useNews;
