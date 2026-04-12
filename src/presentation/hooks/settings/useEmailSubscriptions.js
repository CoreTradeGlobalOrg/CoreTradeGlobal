/**
 * useEmailSubscriptions Hook
 *
 * Reads the current marketing email subscription status for a given email address
 * and provides a toggle function to subscribe/unsubscribe.
 *
 * Uses:
 *   GET  /api/subscription-status  — to fetch initial state
 *   POST /api/unsubscribe          — to opt out
 *   POST /api/resubscribe          — to opt back in
 */

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export function useEmailSubscriptions(email) {
  const [subscribed, setSubscribed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/subscription-status?email=${encodeURIComponent(email)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSubscribed(data.subscribed);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
        // Default to subscribed on error (safe default)
        setSubscribed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [email]);

  /**
   * Toggle the subscription state.
   * If subscribed -> unsubscribe (POST /api/unsubscribe)
   * If unsubscribed -> resubscribe (POST /api/resubscribe)
   */
  const toggleSubscription = async () => {
    if (!email || updating) return;

    setUpdating(true);
    try {
      const endpoint = subscribed ? '/api/unsubscribe' : '/api/resubscribe';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }

      const newState = !subscribed;
      setSubscribed(newState);
      toast.success(
        newState ? 'Resubscribed to marketing emails' : 'Unsubscribed from marketing emails'
      );
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
      toast.error(err.message || 'Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  };

  return { subscribed, toggleSubscription, loading, updating };
}

export default useEmailSubscriptions;
