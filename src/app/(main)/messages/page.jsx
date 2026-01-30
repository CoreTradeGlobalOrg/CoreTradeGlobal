/**
 * Messages Page
 *
 * Full-page view of all conversations
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import './messages.css';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { conversations, loading, openConversation } = useMessages();

  // Get conversation ID from URL if present
  const conversationIdFromUrl = searchParams.get('conversation');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/messages');
    }
  }, [authLoading, isAuthenticated, router]);

  // Open conversation from URL parameter
  useEffect(() => {
    if (conversationIdFromUrl && !loading && conversations.length > 0) {
      const conversationExists = conversations.find(c => c.id === conversationIdFromUrl);
      if (conversationExists) {
        router.push(`/messages/${conversationIdFromUrl}`);
      }
    }
  }, [conversationIdFromUrl, loading, conversations, router]);

  // Handle conversation click - navigate to conversation page
  const handleConversationClick = (conversationId) => {
    router.push(`/messages/${conversationId}`);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
        <div className="max-w-[900px] mx-auto">
          <div className="messages-loading">
            <div className="loading-spinner" />
            <p>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <MessageSquare className="w-10 h-10 text-[#FFD700]" />
            <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Messages
            </h1>
          </div>
          <p className="text-[#A0A0A0]">Your conversations with suppliers and buyers.</p>
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
              <div className="messages-empty-icon">
                <MessageSquare className="w-12 h-12" />
              </div>
              <h2>No messages yet</h2>
              <p>Start a conversation by contacting a supplier on a product page or submitting an RFQ.</p>
              <div className="messages-empty-actions">
                <Link href="/products" className="messages-cta-button">
                  Browse Products
                </Link>
                <Link href="/requests" className="messages-cta-button secondary">
                  View RFQs
                </Link>
              </div>
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
    const name = otherUser.companyName || otherUser.displayName || otherUser.email || 'Unknown';
    const subtitle = otherUser.companyName ? (otherUser.displayName || otherUser.email) : null;
    return {
      name,
      initial: name.charAt(0).toUpperCase(),
      photoURL: otherUser.photoURL,
      subtitle,
      isContact: false,
    };
  }

  return { name: 'Conversation', initial: 'C' };
}

function formatTime(date) {
  if (!date) return '';

  // Handle Firestore Timestamp
  let msgDate;
  if (date?.toDate && typeof date.toDate === 'function') {
    msgDate = date.toDate();
  } else if (date instanceof Date) {
    msgDate = date;
  } else if (date?.seconds) {
    msgDate = new Date(date.seconds * 1000);
  } else {
    msgDate = new Date(date);
  }

  if (isNaN(msgDate.getTime())) return '';

  const now = new Date();
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
