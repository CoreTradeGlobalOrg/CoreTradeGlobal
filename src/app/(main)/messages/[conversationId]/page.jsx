/**
 * Conversation Detail Page
 *
 * Full-page view of a specific conversation
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import MessageThread from '@/presentation/components/features/messaging/MessageThread/MessageThread';
import MessageInput from '@/presentation/components/features/messaging/MessageInput/MessageInput';
import { container } from '@/core/di/container';
import { Conversation } from '@/domain/entities/Conversation';
import '../messages.css';
import './conversation.css';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { conversations, openConversation } = useMessages();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/messages/${conversationId}`);
    }
  }, [authLoading, isAuthenticated, router, conversationId]);

  // Load conversation
  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;

    // First check if we already have it in context
    const existing = conversations.find((c) => c.id === conversationId);
    if (existing) {
      setConversation(existing);
      setLoading(false);
      openConversation(conversationId);
      return;
    }

    // Otherwise fetch it
    const fetchConversation = async () => {
      try {
        const conversationRepo = container.getConversationRepository();
        const data = await conversationRepo.getById(conversationId);
        if (data) {
          setConversation(Conversation.fromFirestore(data));
          openConversation(conversationId);
        } else {
          // Conversation not found
          router.push('/messages');
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
        router.push('/messages');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, isAuthenticated, conversations, openConversation, router]);

  // Update conversation when it changes in context
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const updated = conversations.find((c) => c.id === conversationId);
      if (updated) {
        setConversation(updated);
      }
    }
  }, [conversations, conversationId]);

  if (authLoading || loading || !conversation) {
    return (
      <main className="conversation-page">
        <div className="conversation-loading">
          <div className="loading-spinner" />
          <p>Loading conversation...</p>
        </div>
      </main>
    );
  }

  const getDisplayInfo = () => {
    if (!user?.uid) return { name: 'Conversation', subtitle: null };

    if (conversation.type === 'contact') {
      return {
        name: conversation.metadata?.contactName || 'Contact Inquiry',
        subtitle: conversation.metadata?.contactEmail,
        isContact: true,
        userId: null,
      };
    }

    const otherUserId = conversation.participants.find((id) => id !== user.uid);
    const otherUser = otherUserId ? conversation.participantDetails?.[otherUserId] : null;

    if (otherUser) {
      return {
        name: otherUser.displayName || otherUser.email || 'Unknown',
        companyName: otherUser.companyName || null,
        subtitle: otherUser.email,
        photoURL: otherUser.photoURL,
        isContact: false,
        userId: otherUserId,
      };
    }

    return { name: 'Conversation', subtitle: null };
  };

  const displayInfo = getDisplayInfo();

  return (
    <main className="conversation-page">
      <div className="conversation-container">
        {/* Header */}
        <div className="conversation-header">
          <Link href="/messages" className="conversation-back-link">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {displayInfo.userId ? (
            <Link href={`/profile/${displayInfo.userId}`} className="conversation-header-profile-link">
              <div className="conversation-header-avatar">
                {displayInfo.photoURL ? (
                  <img src={displayInfo.photoURL} alt={displayInfo.name} />
                ) : (
                  <span>{displayInfo.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="conversation-header-info">
                {displayInfo.companyName && (
                  <h1>{displayInfo.companyName}</h1>
                )}
                <span className={`conversation-header-name ${displayInfo.companyName ? 'secondary' : 'primary'}`}>
                  {displayInfo.name}
                </span>
              </div>
            </Link>
          ) : (
            <>
              <div className="conversation-header-avatar">
                {displayInfo.photoURL ? (
                  <img src={displayInfo.photoURL} alt={displayInfo.name} />
                ) : (
                  <span>{displayInfo.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="conversation-header-info">
                <h1>{displayInfo.name}</h1>
                {displayInfo.subtitle && (
                  <span className="conversation-header-subtitle">
                    {displayInfo.isContact && <Mail className="w-3 h-3" />}
                    {displayInfo.subtitle}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages area with sticky banners */}
        <div className="conversation-messages">
          {/* Subject banner for contact inquiries */}
          {conversation.type === 'contact' && conversation.metadata?.subject && (
            <div className="conversation-subject-banner">
              <strong>Subject:</strong> {conversation.metadata.subject}
            </div>
          )}

          {/* Product context banner */}
          {conversation.metadata?.productId && (
            <Link
              href={`/product/${conversation.metadata.productId}`}
              className="conversation-product-banner"
            >
              {conversation.metadata.productImage && (
                <img
                  src={conversation.metadata.productImage}
                  alt={conversation.metadata.productName}
                  className="conversation-product-image"
                />
              )}
              <div className="conversation-product-info">
                <span className="conversation-product-label">About product</span>
                <span className="conversation-product-name">{conversation.metadata.productName}</span>
              </div>
            </Link>
          )}

          <MessageThread
            conversationId={conversationId}
            participantDetails={conversation?.participantDetails}
          />
        </div>

        {/* Input */}
        <div className="conversation-input">
          <MessageInput conversationId={conversationId} />
        </div>
      </div>
    </main>
  );
}
