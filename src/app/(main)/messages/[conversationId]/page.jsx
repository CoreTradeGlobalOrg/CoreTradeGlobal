/**
 * Conversation Detail Page
 *
 * Full-page view of a specific conversation
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Mail, FileText, Package, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import MessageThread from '@/presentation/components/features/messaging/MessageThread/MessageThread';
import MessageInput from '@/presentation/components/features/messaging/MessageInput/MessageInput';
import { Modal } from '@/components/ui/Modal';
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
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);

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
      <main className="conversation-page bg-radial-navy">
        <div className="conversation-container">
          <div className="conversation-card">
            <div className="conversation-loading">
              <div className="loading-spinner" />
              <p>Loading conversation...</p>
            </div>
          </div>
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
        name: otherUser.companyName || otherUser.displayName || otherUser.email || 'Unknown',
        companyName: otherUser.companyName || null,
        subtitle: otherUser.companyName ? (otherUser.displayName || otherUser.email) : otherUser.email,
        photoURL: otherUser.photoURL,
        isContact: false,
        userId: otherUserId,
      };
    }

    return { name: 'Conversation', subtitle: null };
  };

  const displayInfo = getDisplayInfo();

  return (
    <main className="conversation-page bg-radial-navy">
      <div className="conversation-container">
        <div className="conversation-card">
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
                  <h1>{displayInfo.name}</h1>
                  {displayInfo.subtitle && displayInfo.companyName && (
                    <span className="conversation-header-name secondary">
                      {displayInfo.subtitle}
                    </span>
                  )}
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

            {/* RFQ context banner */}
            {conversation.metadata?.requestId && (
              <button
                className="conversation-rfq-banner"
                onClick={() => setRfqDialogOpen(true)}
              >
                <div className="conversation-rfq-icon">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="conversation-rfq-info">
                  <span className="conversation-rfq-label">About RFQ</span>
                  <span className="conversation-rfq-name">{conversation.metadata.requestName || 'View RFQ Details'}</span>
                </div>
              </button>
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
      </div>

      {/* RFQ Detail Dialog */}
      {conversation.metadata?.requestId && (
        <Modal
          isOpen={rfqDialogOpen}
          onClose={() => setRfqDialogOpen(false)}
          title="RFQ Details"
          className="max-w-lg"
        >
          <div className="space-y-4">
            {/* RFQ Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(59,130,246,0.15)] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#3b82f6]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block bg-[rgba(59,130,246,0.15)] text-[#60a5fa] px-2 py-0.5 rounded text-xs font-bold mb-1 border border-[#3b82f6]/30">
                  RFQ
                </span>
                <h3 className="text-lg font-bold text-white break-words">
                  {conversation.metadata.requestName || 'Request for Quote'}
                </h3>
              </div>
            </div>

            {/* RFQ Details */}
            <div className="grid grid-cols-2 gap-3">
              {conversation.metadata.requestQuantity && (
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-xs mb-1">
                    <Package size={12} />
                    <span>Quantity</span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {conversation.metadata.requestQuantity} {conversation.metadata.requestUnit || ''}
                  </span>
                </div>
              )}
              {conversation.metadata.requestBudget && (
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-xs mb-1">
                    <DollarSign size={12} />
                    <span>Budget</span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {conversation.metadata.requestBudget}
                  </span>
                </div>
              )}
              {conversation.metadata.requestCountry && (
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-xs mb-1">
                    <MapPin size={12} />
                    <span>Destination</span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {conversation.metadata.requestCountry}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {conversation.metadata.requestDescription && (
              <div>
                <span className="text-[#94a3b8] text-xs block mb-2">Description</span>
                <p className="text-white/80 text-sm bg-[rgba(255,255,255,0.03)] p-3 rounded-lg border border-[rgba(255,255,255,0.05)] whitespace-pre-line">
                  {conversation.metadata.requestDescription}
                </p>
              </div>
            )}

            {/* View Full RFQ Button */}
            <Link
              href={`/request/${conversation.metadata.requestId}`}
              className="block w-full py-3 bg-[#3b82f6] !text-white font-bold text-center rounded-xl hover:bg-[#2563eb] transition-colors"
              onClick={() => setRfqDialogOpen(false)}
            >
              View Full RFQ Details
            </Link>
          </div>
        </Modal>
      )}
    </main>
  );
}
