/**
 * MessagesWidget Component
 *
 * Floating chat widget in the bottom-right corner
 * Shows chat button with unread badge when minimized
 * Expands to show full conversation interface
 * Supports product and RFQ context banners
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ArrowLeft, Minimize2, FileText, Package, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import ConversationList from '@/presentation/components/features/messaging/ConversationList/ConversationList';
import MessageThread from '@/presentation/components/features/messaging/MessageThread/MessageThread';
import MessageInput from '@/presentation/components/features/messaging/MessageInput/MessageInput';
import './MessagesWidget.css';

export function MessagesWidget() {
  const { user, isAuthenticated } = useAuth();
  const {
    isWidgetOpen,
    setIsWidgetOpen,
    toggleWidget,
    activeConversationId,
    closeConversation,
    getActiveConversation,
    totalUnreadCount,
  } = useMessages();

  const [isMobile, setIsMobile] = useState(false);
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const widgetRef = useRef(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render for non-authenticated users
  if (!isAuthenticated) {
    return null;
  }

  const activeConversation = getActiveConversation();

  const handleBack = () => {
    closeConversation();
  };

  const getConversationInfo = () => {
    if (!activeConversation || !user?.uid) {
      return { name: 'Conversation', companyName: null, photoURL: null, userId: null };
    }

    if (activeConversation.type === 'contact') {
      return {
        name: activeConversation.metadata?.contactName || 'Contact Inquiry',
        companyName: null,
        photoURL: null,
        userId: null,
        isContact: true,
        email: activeConversation.metadata?.contactEmail,
      };
    }

    const otherUserId = activeConversation.participants.find((id) => id !== user.uid);
    const otherUser = otherUserId ? activeConversation.participantDetails?.[otherUserId] : null;

    return {
      name: otherUser?.displayName || otherUser?.email || 'Unknown',
      companyName: otherUser?.companyName || null,
      photoURL: otherUser?.photoURL || null,
      userId: otherUserId,
      isContact: false,
    };
  };

  const conversationInfo = activeConversationId ? getConversationInfo() : null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isWidgetOpen && (
        <button
          className="messages-widget-button"
          onClick={toggleWidget}
          aria-label="Open messages"
        >
          <MessageCircle className="w-6 h-6" />
          {totalUnreadCount > 0 && (
            <span className="messages-widget-badge">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isWidgetOpen && (
        <div
          ref={widgetRef}
          className={`messages-widget-panel ${isMobile ? 'mobile' : ''}`}
        >
          {/* Header */}
          <div className="messages-widget-header">
            {activeConversationId && conversationInfo ? (
              <>
                <button
                  className="messages-widget-back"
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {conversationInfo.userId ? (
                  <Link
                    href={`/profile/${conversationInfo.userId}`}
                    className="messages-widget-profile-link"
                    onClick={() => setIsWidgetOpen(false)}
                  >
                    <div className="messages-widget-avatar">
                      {conversationInfo.photoURL ? (
                        <img src={conversationInfo.photoURL} alt={conversationInfo.name} />
                      ) : (
                        <span>{conversationInfo.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="messages-widget-title">
                      {conversationInfo.companyName && (
                        <h3>{conversationInfo.companyName}</h3>
                      )}
                      <span className={`messages-widget-name ${conversationInfo.companyName ? 'secondary' : 'primary'}`}>
                        {conversationInfo.name}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="messages-widget-title">
                    <h3>{conversationInfo.name}</h3>
                    {conversationInfo.isContact && conversationInfo.email && (
                      <span className="messages-widget-subtitle">{conversationInfo.email}</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="messages-widget-title">
                <h3>Messages</h3>
              </div>
            )}
            <button
              className="messages-widget-close"
              onClick={() => setIsWidgetOpen(false)}
            >
              {isMobile ? <X className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Content */}
          <div className="messages-widget-content">
            {activeConversationId ? (
              <>
                {/* Product Banner */}
                {activeConversation?.metadata?.productId && (
                  <Link
                    href={`/product/${activeConversation.metadata.productId}`}
                    className="messages-widget-product-banner"
                    onClick={() => setIsWidgetOpen(false)}
                  >
                    {activeConversation.metadata.productImage && (
                      <img
                        src={activeConversation.metadata.productImage}
                        alt={activeConversation.metadata.productName}
                        className="messages-widget-product-image"
                      />
                    )}
                    <div className="messages-widget-product-info">
                      <span className="messages-widget-product-label">About product</span>
                      <span className="messages-widget-product-name">{activeConversation.metadata.productName}</span>
                    </div>
                  </Link>
                )}

                {/* RFQ Banner */}
                {activeConversation?.metadata?.requestId && (
                  <button
                    className="messages-widget-rfq-banner"
                    onClick={() => setRfqDialogOpen(true)}
                  >
                    <div className="messages-widget-rfq-icon">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="messages-widget-rfq-info">
                      <span className="messages-widget-rfq-label">About RFQ</span>
                      <span className="messages-widget-rfq-name">{activeConversation.metadata.requestName || 'View RFQ Details'}</span>
                    </div>
                  </button>
                )}

                <div className="messages-widget-messages">
                  <MessageThread
                    conversationId={activeConversationId}
                    participantDetails={activeConversation?.participantDetails}
                  />
                </div>
                <MessageInput conversationId={activeConversationId} />
              </>
            ) : (
              <ConversationList />
            )}
          </div>
        </div>
      )}

      {/* RFQ Detail Dialog */}
      {activeConversation?.metadata?.requestId && (
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
                  {activeConversation.metadata.requestName || 'Request for Quote'}
                </h3>
              </div>
            </div>

            {/* RFQ Details */}
            <div className="grid grid-cols-2 gap-3">
              {activeConversation.metadata.requestQuantity && (
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-xs mb-1">
                    <Package size={12} />
                    <span>Quantity</span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {activeConversation.metadata.requestQuantity} {activeConversation.metadata.requestUnit || ''}
                  </span>
                </div>
              )}
              {activeConversation.metadata.requestBudget && (
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-xs mb-1">
                    <DollarSign size={12} />
                    <span>Budget</span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {activeConversation.metadata.requestBudget}
                  </span>
                </div>
              )}
              {activeConversation.metadata.requestCountry && (
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-xs mb-1">
                    <MapPin size={12} />
                    <span>Destination</span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {activeConversation.metadata.requestCountry}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {activeConversation.metadata.requestDescription && (
              <div>
                <span className="text-[#94a3b8] text-xs block mb-2">Description</span>
                <p className="text-white/80 text-sm bg-[rgba(255,255,255,0.03)] p-3 rounded-lg border border-[rgba(255,255,255,0.05)] whitespace-pre-line">
                  {activeConversation.metadata.requestDescription}
                </p>
              </div>
            )}

            {/* View Full RFQ Button */}
            <Link
              href={`/request/${activeConversation.metadata.requestId}`}
              className="block w-full py-3 bg-[#3b82f6] !text-white font-bold text-center rounded-xl hover:bg-[#2563eb] transition-colors"
              onClick={() => {
                setRfqDialogOpen(false);
                setIsWidgetOpen(false);
              }}
            >
              View Full RFQ Details
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}

export default MessagesWidget;
