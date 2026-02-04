/**
 * ConversationList Component
 *
 * Displays list of conversations for the current user
 */

'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, User, Mail, Clock, Search, X } from 'lucide-react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import './ConversationList.css';

export function ConversationList() {
  const { user } = useAuth();
  const { conversations, loading, openConversation } = useMessages();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();

    return conversations.filter((conversation) => {
      // Search in last message content
      if (conversation.lastMessage?.content?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in participant details - only check the OTHER participant in the conversation
      if (conversation.participants && conversation.participantDetails) {
        // Find the other participant (not the current user)
        const otherParticipantId = conversation.participants.find(id => id !== user?.uid);

        if (otherParticipantId) {
          const otherParticipant = conversation.participantDetails[otherParticipantId];
          if (otherParticipant) {
            if (
              otherParticipant.displayName?.toLowerCase().includes(query) ||
              otherParticipant.companyName?.toLowerCase().includes(query) ||
              otherParticipant.email?.toLowerCase().includes(query)
            ) {
              return true;
            }
          }
        }
      }

      // Search in contact metadata
      if (conversation.type === 'contact') {
        if (
          conversation.metadata?.contactName?.toLowerCase().includes(query) ||
          conversation.metadata?.contactEmail?.toLowerCase().includes(query) ||
          conversation.metadata?.subject?.toLowerCase().includes(query)
        ) {
          return true;
        }
      }

      return false;
    });
  }, [conversations, searchQuery, user?.uid]);

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
    <div className="conversation-list-wrapper">
      {/* Search Bar */}
      <div className="conversation-search">
        <div className="conversation-search-input-wrapper">
          <Search className="conversation-search-icon" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="conversation-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="conversation-search-clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* No Results */}
      {filteredConversations.length === 0 && searchQuery && (
        <div className="conversation-list-empty">
          <Search className="w-8 h-8 text-[#64748b]" />
          <h4>No results</h4>
          <p>No conversations match "{searchQuery}"</p>
        </div>
      )}

      {/* Conversation List */}
      <div className="conversation-list">
        {filteredConversations.map((conversation) => {
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
    </div>
  );
}

export default ConversationList;
