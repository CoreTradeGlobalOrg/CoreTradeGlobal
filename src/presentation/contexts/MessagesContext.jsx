/**
 * Messages Context
 *
 * Manages global messaging state with real-time subscriptions
 * Provides conversations, active messages, and unread counts
 */

'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { Conversation } from '@/domain/entities/Conversation';
import { Message } from '@/domain/entities/Message';
import { readNotificationSoundEnabled } from '@/presentation/hooks/settings/useNotificationSound';

const MessagesContext = createContext(null);

/**
 * Messages Provider Component
 */
export function MessagesProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  // Repositories
  const conversationRepository = container.getConversationRepository();
  const messageRepository = container.getMessageRepository();
  const notificationRepository = container.getNotificationRepository();

  // Subscribe to user's conversations
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = conversationRepository.subscribeToUserConversations(
      user.uid,
      (docs) => {
        const convos = docs.map((doc) => Conversation.fromFirestore(doc));
        setConversations(convos);

        // Calculate total unread count
        const unread = convos.reduce((sum, conv) => {
          return sum + (conv.unreadCount[user.uid] || 0);
        }, 0);
        setTotalUnreadCount(unread);

        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to conversations:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  // Notification chime — plays a short mp3 whenever the unread count
  // goes UP (i.e. a brand-new notification arrived while the tab is
  // open). Guarded so it never fires on the initial snapshot or on
  // reads that only shrink the count (marking-as-read).
  const audioRef = useRef(null);
  const lastUnreadCountRef = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio('/sounds/notification.mp3');
    audio.preload = 'auto';
    audio.volume = 0.6;
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Subscribe to user's notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setNotifications([]);
      lastUnreadCountRef.current = null;
      return;
    }

    const unsubscribe = notificationRepository.subscribeToUserNotifications(
      user.uid,
      (docs) => {
        const nextUnread = docs.filter((n) => !n.isRead).length;
        const prevUnread = lastUnreadCountRef.current;
        // Skip the very first snapshot (initial load) so we don't chime
        // for every unread notification the user hasn't opened yet.
        // After that, only chime when the unread count strictly grew.
        if (
          prevUnread !== null &&
          nextUnread > prevUnread &&
          readNotificationSoundEnabled() &&
          audioRef.current
        ) {
          try {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
              // Autoplay policy or missing user gesture — silent fail.
            });
          } catch {
            // Some browsers throw synchronously; ignore.
          }
        }
        lastUnreadCountRef.current = nextUnread;
        setNotifications(docs);
      },
      (err) => {
        console.error('Error subscribing to notifications:', err);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  // Subscribe to active conversation's messages
  useEffect(() => {
    if (!activeConversationId) {
      setActiveMessages([]);
      return;
    }

    const unsubscribe = messageRepository.subscribeToConversationMessages(
      activeConversationId,
      (docs) => {
        const msgs = docs.map((doc) => Message.fromFirestore(doc));
        setActiveMessages(msgs);
      },
      (err) => {
        console.error('Error subscribing to messages:', err);
      }
    );

    return () => unsubscribe();
  }, [activeConversationId]);

  // Draft message to prefill in the input (set externally, consumed by MessageInput)
  const [draftMessage, setDraftMessage] = useState('');

  // Open a conversation, optionally with a prefilled draft
  const openConversation = useCallback((conversationId, draft = '') => {
    setDraftMessage(draft);
    setActiveConversationId(conversationId);
    setIsWidgetOpen(true);
  }, []);

  // Close active conversation
  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
    setActiveMessages([]);
  }, []);

  // Toggle widget
  const toggleWidget = useCallback(() => {
    setIsWidgetOpen((prev) => !prev);
    if (isWidgetOpen) {
      setActiveConversationId(null);
    }
  }, [isWidgetOpen]);

  // Get active conversation
  const getActiveConversation = useCallback(() => {
    if (!activeConversationId) return null;
    return conversations.find((conv) => conv.id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  // Get unread count for a specific conversation
  const getUnreadCount = useCallback(
    (conversationId) => {
      const conversation = conversations.find((conv) => conv.id === conversationId);
      if (!conversation || !user?.uid) return 0;
      return conversation.unreadCount[user.uid] || 0;
    },
    [conversations, user?.uid]
  );

  // Get unread notification count
  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  const value = {
    // State
    conversations,
    activeConversationId,
    activeMessages,
    notifications,
    totalUnreadCount,
    unreadNotificationCount,
    loading,
    error,
    isWidgetOpen,

    // Draft
    draftMessage,
    setDraftMessage,

    // Actions
    openConversation,
    closeConversation,
    toggleWidget,
    setIsWidgetOpen,

    // Getters
    getActiveConversation,
    getUnreadCount,
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

/**
 * useMessages Hook
 *
 * Access messaging state from any component
 */
export function useMessages() {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }

  return context;
}

export default MessagesContext;
