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

  const getConversationTitle = () => {
    if (!activeConversation || !user?.uid) return 'Conversation';

    if (activeConversation.type === 'contact') {
      return activeConversation.metadata?.contactName || 'Contact Inquiry';
    }

    return activeConversation.getDisplayName(user.uid);
  };

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
            {activeConversationId ? (
              <>
                <button
                  className="messages-widget-back"
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="messages-widget-title">
                  <h3>{getConversationTitle()}</h3>
                  {activeConversation?.type === 'contact' && (
                    <span className="messages-widget-subtitle">
                      {activeConversation.metadata?.contactEmail}
                    </span>
                  )}
                </div>
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
                <MessageThread
                  conversationId={activeConversationId}
                  participantDetails={activeConversation?.participantDetails}
                />
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
