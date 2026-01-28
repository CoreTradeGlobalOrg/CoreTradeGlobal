/**
 * useMarkAsRead Hook
 *
 * Custom hook for marking messages and notifications as read
 */

'use client';

import { useCallback } from 'react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { MarkAsReadUseCase } from '@/domain/usecases/messaging/MarkAsReadUseCase';

export function useMarkAsRead() {
  const { user } = useAuth();

  /**
   * Mark all messages in a conversation as read
   * @param {string} conversationId
   * @returns {Promise<void>}
   */
  const markConversationAsRead = useCallback(
    async (conversationId) => {
      if (!user?.uid || !conversationId) return;

      try {
        const messageRepository = container.getMessageRepository();
        const conversationRepository = container.getConversationRepository();
        const notificationRepository = container.getNotificationRepository();

        const markAsReadUseCase = new MarkAsReadUseCase(
          messageRepository,
          conversationRepository,
          notificationRepository
        );

        await markAsReadUseCase.execute(conversationId, user.uid);
      } catch (err) {
        console.error('Error marking conversation as read:', err);
      }
    },
    [user?.uid]
  );

  /**
   * Mark a single notification as read
   * @param {string} notificationId
   * @returns {Promise<void>}
   */
  const markNotificationAsRead = useCallback(
    async (notificationId) => {
      if (!user?.uid || !notificationId) return;

      try {
        const messageRepository = container.getMessageRepository();
        const conversationRepository = container.getConversationRepository();
        const notificationRepository = container.getNotificationRepository();

        const markAsReadUseCase = new MarkAsReadUseCase(
          messageRepository,
          conversationRepository,
          notificationRepository
        );

        await markAsReadUseCase.markNotificationAsRead(user.uid, notificationId);
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    },
    [user?.uid]
  );

  /**
   * Mark all notifications as read
   * @returns {Promise<void>}
   */
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const messageRepository = container.getMessageRepository();
      const conversationRepository = container.getConversationRepository();
      const notificationRepository = container.getNotificationRepository();

      const markAsReadUseCase = new MarkAsReadUseCase(
        messageRepository,
        conversationRepository,
        notificationRepository
      );

      await markAsReadUseCase.markAllNotificationsAsRead(user.uid);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user?.uid]);

  return {
    markConversationAsRead,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };
}

export default useMarkAsRead;
