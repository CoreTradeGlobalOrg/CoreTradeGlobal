/**
 * useDeals Hook
 *
 * Subscribes to all deals where the current user is buyer OR seller.
 * Returns real-time deal list, loading state, and error.
 *
 * Uses DealRepository.subscribeToDeals which runs two parallel Firestore
 * onSnapshot listeners and merges results client-side (two-query merge pattern).
 *
 * Cleanup: unsubscribes both listeners on unmount.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';

export function useDeals() {
  const { user, isAuthenticated } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Clean up any previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!isAuthenticated || !user?.uid) {
      setDeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dealRepository = container.getDealRepository();

      const unsubscribe = dealRepository.subscribeToDeals(user.uid, (updatedDeals) => {
        setDeals(updatedDeals);
        setLoading(false);
      });

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('useDeals subscription error:', err);
      setError(err.message || 'Failed to load deals.');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, isAuthenticated]);

  return { deals, loading, error };
}

export default useDeals;
