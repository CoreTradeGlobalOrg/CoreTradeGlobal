/**
 * MessagesWidget Component
 *
 * Floating chat widget in the bottom-right corner
 * Shows chat button with unread badge when minimized
 * Expands to show full conversation interface
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ArrowLeft, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
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
    </>
  );
}

export default MessagesWidget;
