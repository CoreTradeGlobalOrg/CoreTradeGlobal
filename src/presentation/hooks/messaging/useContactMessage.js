/**
 * useContactMessage Hook
 *
 * Custom hook for sending contact form messages
 * Supports both authenticated and anonymous users
 */

'use client';

import { useState, useCallback } from 'react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { SendContactMessageUseCase } from '@/domain/usecases/messaging/SendContactMessageUseCase';

export function useContactMessage() {
  const { user, isAuthenticated } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Send a contact message
   * @param {Object} params
   * @param {string} params.name - Sender's name
   * @param {string} params.email - Sender's email
   * @param {string} params.subject - Message subject
   * @param {string} params.message - Message content
   * @param {string} params.tag - Message tag (e.g., 'contact', 'advertising')
   * @returns {Promise<Object>} The created conversation
   */
  const sendContactMessage = useCallback(
    async ({ name, email, subject, message, tag = 'contact' }) => {
      setSending(true);
      setError(null);
      setSuccess(false);

      try {
        const conversationRepository = container.getConversationRepository();
        const messageRepository = container.getMessageRepository();
        const notificationRepository = container.getNotificationRepository();
        const userRepository = container.getUserRepository();

        const sendContactMessageUseCase = new SendContactMessageUseCase(
          conversationRepository,
          messageRepository,
          notificationRepository,
          userRepository
        );

        const conversation = await sendContactMessageUseCase.execute({
          name,
          email,
          subject,
          message,
          tag,
          userId: isAuthenticated ? user?.uid : null,
        });

        setSuccess(true);
        return conversation;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [isAuthenticated, user?.uid]
  );

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    sendContactMessage,
    sending,
    error,
    success,
    reset,
    isAuthenticated,
  };
}

export default useContactMessage;
