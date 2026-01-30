/**
 * useQuotes Hook
 *
 * Fetches and subscribes to quotes for a specific RFQ.
 * Quotes are stored as a subcollection under the request document.
 */

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useQuotes(requestId) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const firestoreDS = container.getFirestoreDataSource();

    // Subscribe to real-time updates on quotes subcollection
    const unsubscribe = firestoreDS.subscribeToSubcollection(
      'requests',
      requestId,
      'quotes',
      {}, // No orderBy to avoid index requirements - we'll sort client-side
      (docs) => {
        // Convert Firestore timestamps to dates and sort by createdAt desc
        const formattedQuotes = docs
          .map((quote) => ({
            ...quote,
            createdAt: quote.createdAt?.toDate?.() || quote.createdAt || new Date(),
            updatedAt: quote.updatedAt?.toDate?.() || quote.updatedAt,
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setQuotes(formattedQuotes);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quotes:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [requestId]);

  return {
    quotes,
    loading,
    error,
  };
}

export default useQuotes;
