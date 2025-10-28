'use client';

/**
 * useNewsletter Hook
 * Manages newsletter subscription state and logic
 * Separates business logic from UI components
 */

import { useState, useCallback, useEffect } from 'react';
import { subscribeToNewsletter } from '@/lib/api';


export function useNewsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  /**
   * Subscribe to newsletter
   * @param {Object} metadata - Optional metadata
   */
  const subscribe = useCallback(async (metadata = {}) => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
        const result = await subscribeToNewsletter(email, metadata);

      setMessage({
        text: result.message,
        type: result.success ? 'success' : 'error',
      });

      // Clear input on success
      if (result.success) {
        setEmail('');
      } else {
        setMessage({
            text: result.message,
            type: result.success ? 'success' : 'error',
        });
      }

      return result;
    } catch (error) {
      setMessage({
        text: error.message || 'An unexpected error occurred. Please try again.',
        type: 'error',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [email]);

  /**
   * Clear message
   */
  const clearMessage = useCallback(() => {
    setMessage({ text: '', type: '' });
  }, []);

  /**
   * Reset form
   */
  const reset = useCallback(() => {
    setEmail('');
    setMessage({ text: '', type: '' });
    setLoading(false);
  }, []);

  return {
    email,
    setEmail,
    loading,
    message,
    subscribe,
    clearMessage,
    reset,
  };
}

export default useNewsletter;