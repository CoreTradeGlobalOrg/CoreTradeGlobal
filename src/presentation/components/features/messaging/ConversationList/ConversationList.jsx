/**
 * ConversationList Component
 *
 * Displays list of conversations for the current user
 */

'use client';

import { MessageSquare, User, Mail, Clock } from 'lucide-react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import './ConversationList.css';

export function ConversationList() {
  const { user } = useAuth();
  const { conversations, loading, openConversation } = useMessages();

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return msgDate.toLocaleDateString();
  };

  const getConversationDisplay = (conversation) => {
    if (!user?.uid) return { name: 'Unknown', initial: '?' };

    if (conversation.type === 'contact') {
      const name = conversation.metadata?.contactName || 'Contact';
      return {
        name,
        initial: name.charAt(0).toUpperCase(),
        subtitle: conversation.metadata?.contactEmail || conversation.metadata?.subject,
        isContact: true,
      };
    }

    // Direct conversation - get the other participant
    const otherUserId = conversation.participants.find((id) => id !== user.uid);
    const otherUser = otherUserId ? conversation.participantDetails?.[otherUserId] : null;

    if (otherUser) {
      const name = otherUser.displayName || otherUser.email || 'Unknown';
      return {
        name,
        initial: name.charAt(0).toUpperCase(),
        photoURL: otherUser.photoURL,
        isContact: false,
      };
    }

    return { name: 'Conversation', initial: 'C' };
  };

  if (loading) {
    return (
      <div className="conversation-list-loading">
        <div className="loading-spinner" />
        <p>Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="conversation-list-empty">
        <MessageSquare className="w-12 h-12 text-[#64748b]" />
        <h4>No conversations yet</h4>
        <p>Start a conversation by messaging another user</p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map((conversation) => {
        const display = getConversationDisplay(conversation);
        const unreadCount = conversation.unreadCount[user?.uid] || 0;
        const lastMessage = conversation.lastMessage;

        return (
          <div
            key={conversation.id}
            className={`conversation-item ${unreadCount > 0 ? 'unread' : ''}`}
            onClick={() => openConversation(conversation.id)}
          >
            <div className="conversation-avatar">
              {display.photoURL ? (
                <img src={display.photoURL} alt={display.name} />
              ) : (
                <span>{display.initial}</span>
              )}
              {display.isContact && (
                <div className="conversation-avatar-badge">
                  <Mail className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="conversation-info">
              <div className="conversation-header">
                <span className="conversation-name">{display.name}</span>
                <span className="conversation-time">
                  {formatTime(lastMessage?.createdAt)}
                </span>
              </div>

              <div className="conversation-preview">
                {display.subtitle && (
                  <span className="conversation-subtitle">{display.subtitle}</span>
                )}
                {lastMessage && (
                  <p className="conversation-last-message">
                    {lastMessage.senderId === user?.uid && <span>You: </span>}
                    {lastMessage.content}
                  </p>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="conversation-unread-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ConversationList;
