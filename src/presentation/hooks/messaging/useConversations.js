/**
 * useConversations Hook
 *
 * Custom hook for managing conversations
 * Provides conversation list and creation functionality
 */

'use client';

import { useState, useCallback } from 'react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { CreateConversationUseCase } from '@/domain/usecases/messaging/CreateConversationUseCase';

export function useConversations() {
  const { user } = useAuth();
  const { conversations, loading, error, openConversation } = useMessages();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  /**
   * Start a new direct conversation with another user
   * @param {string} otherUserId - The other user's ID
   * @param {Object} metadata - Optional metadata (productId, productName, productImage, source)
   * @returns {Promise<Object>} The conversation
   */
  const startDirectConversation = useCallback(
    async (otherUserId, metadata = {}) => {
      if (!user?.uid) {
        throw new Error('You must be logged in to start a conversation');
      }

      setCreating(true);
      setCreateError(null);

      try {
        const conversationRepository = container.getConversationRepository();
        const messageRepository = container.getMessageRepository();
        const notificationRepository = container.getNotificationRepository();
        const userRepository = container.getUserRepository();

        const createConversationUseCase = new CreateConversationUseCase(
          conversationRepository,
          messageRepository,
          notificationRepository,
          userRepository
        );

        const conversation = await createConversationUseCase.execute({
          type: 'direct',
          participantIds: [user.uid, otherUserId],
          creatorId: user.uid,
          metadata,
        });

        // Open the conversation in the widget
        openConversation(conversation.id);

        return conversation;
      } catch (err) {
        setCreateError(err.message);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [user?.uid, openConversation]
  );

  /**
   * Get a conversation by ID
   * @param {string} conversationId
   * @returns {Object|null}
   */
  const getConversationById = useCallback(
    (conversationId) => {
      return conversations.find((conv) => conv.id === conversationId) || null;
    },
    [conversations]
  );

  /**
   * Get conversations with unread messages
   * @returns {Array}
   */
  const getUnreadConversations = useCallback(() => {
    if (!user?.uid) return [];
    return conversations.filter((conv) => (conv.unreadCount[user.uid] || 0) > 0);
  }, [conversations, user?.uid]);

  /**
   * Get contact conversations (for admin view)
   * @returns {Array}
   */
  const getContactConversations = useCallback(() => {
    return conversations.filter((conv) => conv.type === 'contact');
  }, [conversations]);

  /**
   * Get direct conversations
   * @returns {Array}
   */
  const getDirectConversations = useCallback(() => {
    return conversations.filter((conv) => conv.type === 'direct');
  }, [conversations]);

  return {
    conversations,
    loading,
    error: error || createError,
    creating,
    startDirectConversation,
    getConversationById,
    getUnreadConversations,
    getContactConversations,
    getDirectConversations,
  };
}

export default useConversations;
