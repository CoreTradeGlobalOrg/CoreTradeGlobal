/**
 * useForgotPassword Hook
 *
 * Send password reset email
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const sendResetEmail = async (email) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const authRepository = container.getAuthRepository();
      await authRepository.sendPasswordResetEmail(email);
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendResetEmail,
    loading,
    error,
    success,
  };
}

export default useForgotPassword;
