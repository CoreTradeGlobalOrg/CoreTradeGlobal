/**
 * useSendMessage Hook
 *
 * Custom hook for sending messages in a conversation
 */

'use client';

import { useState, useCallback } from 'react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { SendMessageUseCase } from '@/domain/usecases/messaging/SendMessageUseCase';

export function useSendMessage() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send a message to a conversation
   * @param {string} conversationId - The conversation to send to
   * @param {string} content - The message content
   * @param {Array} attachments - Optional file attachments
   * @param {Object} options - Optional settings
   * @param {string} options.type - Message type ('text' | 'contact_inquiry')
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} The created message
   */
  const sendMessage = useCallback(
    async (conversationId, content, attachments = [], options = {}) => {
      if (!user?.uid) {
        throw new Error('You must be logged in to send messages');
      }

      // Allow empty content if there are attachments
      if (!content?.trim() && attachments.length === 0) {
        throw new Error('Message content or attachment is required');
      }

      setSending(true);
      setError(null);

      try {
        const messageRepository = container.getMessageRepository();
        const conversationRepository = container.getConversationRepository();
        const notificationRepository = container.getNotificationRepository();

        // Upload attachments first if any
        let uploadedAttachments = [];
        if (attachments.length > 0) {
          const files = attachments.map((a) => a.file);
          uploadedAttachments = await messageRepository.uploadAttachments(
            conversationId,
            user.uid,
            files
          );
        }

        const sendMessageUseCase = new SendMessageUseCase(
          messageRepository,
          conversationRepository,
          notificationRepository
        );

        const message = await sendMessageUseCase.execute({
          conversationId,
          senderId: user.uid,
          senderName: user.displayName || user.email || 'Unknown',
          content: content?.trim() || '',
          type: uploadedAttachments.length > 0 ? 'attachment' : (options.type || 'text'),
          attachments: uploadedAttachments,
          metadata: options.metadata || {},
        });

        return message;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [user]
  );

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    sending,
    error,
    clearError,
  };
}

export default useSendMessage;
