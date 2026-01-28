/**
 * Messages Page
 *
 * Full-page view of all conversations
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import ConversationList from '@/presentation/components/features/messaging/ConversationList/ConversationList';
import './messages.css';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { conversations, loading, openConversation } = useMessages();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/messages');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle conversation click - navigate to conversation page
  const handleConversationClick = (conversationId) => {
    router.push(`/messages/${conversationId}`);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <main className="messages-page">
        <div className="messages-loading">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="messages-page">
      <div className="messages-container">
        {/* Header */}
        <div className="messages-header">
          <Link href="/" className="messages-back-link">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="messages-header-title">
            <MessageSquare className="w-6 h-6 text-[#FFD700]" />
            <h1>Messages</h1>
          </div>
        </div>

        {/* Conversations List */}
        <div className="messages-list-container">
          {loading ? (
            <div className="messages-loading">
              <div className="loading-spinner" />
              <p>Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="messages-empty">
              <MessageSquare className="w-16 h-16 text-[#64748b]" />
              <h2>No messages yet</h2>
              <p>Start a conversation by contacting another user or visiting the contact page.</p>
              <Link href="/contact" className="messages-cta-button">
                Contact Us
              </Link>
            </div>
          ) : (
            <div className="messages-list">
              {conversations.map((conversation) => {
                const display = getConversationDisplay(conversation, user?.uid);
                const unreadCount = conversation.unreadCount[user?.uid] || 0;
                const lastMessage = conversation.lastMessage;

                return (
                  <div
                    key={conversation.id}
                    className={`message-list-item ${unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handleConversationClick(conversation.id)}
                  >
                    <div className="message-list-avatar">
                      {display.photoURL ? (
                        <img src={display.photoURL} alt={display.name} />
                      ) : (
                        <span>{display.initial}</span>
                      )}
                    </div>

                    <div className="message-list-info">
                      <div className="message-list-header">
                        <span className="message-list-name">{display.name}</span>
                        <span className="message-list-time">
                          {formatTime(lastMessage?.createdAt)}
                        </span>
                      </div>

                      {display.subtitle && (
                        <span className="message-list-subtitle">{display.subtitle}</span>
                      )}

                      {lastMessage && (
                        <p className="message-list-preview">
                          {lastMessage.senderId === user?.uid && <span>You: </span>}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <span className="message-list-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function getConversationDisplay(conversation, userId) {
  if (conversation.type === 'contact') {
    const name = conversation.metadata?.contactName || 'Contact';
    return {
      name,
      initial: name.charAt(0).toUpperCase(),
      subtitle: conversation.metadata?.contactEmail || conversation.metadata?.subject,
      isContact: true,
    };
  }

  const otherUserId = conversation.participants.find((id) => id !== userId);
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
}

function formatTime(date) {
  if (!date) return '';
  const now = new Date();
  const msgDate = new Date(date);
  const diffMs = now - msgDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return msgDate.toLocaleDateString();
}
