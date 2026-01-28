/**
 * MessageThread Component
 *
 * Displays messages in a conversation with real-time updates
 */

'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMarkAsRead } from '@/presentation/hooks/messaging/useMarkAsRead';
import './MessageThread.css';

export function MessageThread({ conversationId, participantDetails = {} }) {
  const { user } = useAuth();
  const { activeMessages } = useMessages();
  const { markConversationAsRead } = useMarkAsRead();
  const messagesEndRef = useRef(null);
  const hasMarkedAsRead = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && user?.uid && !hasMarkedAsRead.current) {
      markConversationAsRead(conversationId);
      hasMarkedAsRead.current = true;
    }
  }, [conversationId, user?.uid, markConversationAsRead]);

  // Reset the read flag when conversation changes
  useEffect(() => {
    hasMarkedAsRead.current = false;
  }, [conversationId]);

  const formatTime = (date) => {
    if (!date) return '';
    const msgDate = new Date(date);
    return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = activeMessages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (activeMessages.length === 0) {
    return (
      <div className="message-thread-empty">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="message-thread">
      {Object.entries(groupedMessages).map(([date, messages]) => (
        <div key={date} className="message-date-group">
          <div className="message-date-divider">
            <span>{date}</span>
          </div>

          {messages.map((message, index) => {
            const isOwn = message.senderId === user?.uid;
            const showAvatar =
              !isOwn &&
              (index === 0 || messages[index - 1]?.senderId !== message.senderId);
            const senderDetails = participantDetails[message.senderId] || {};
            const senderPhoto = senderDetails.photoURL;
            const senderInitial = (message.senderName || senderDetails.displayName || '?').charAt(0).toUpperCase();

            return (
              <div
                key={message.id}
                className={`message-bubble-wrapper ${isOwn ? 'own' : 'other'}`}
              >
                {!isOwn && (
                  <div className="message-row">
                    {showAvatar ? (
                      <div className="message-avatar">
                        {senderPhoto ? (
                          <img src={senderPhoto} alt={message.senderName} />
                        ) : (
                          <span>{senderInitial}</span>
                        )}
                      </div>
                    ) : (
                      <div className="message-avatar-spacer" />
                    )}
                    <div className="message-content-wrapper">
                      {showAvatar && (
                        <div className="message-sender-name">{message.senderName}</div>
                      )}
                      <div className={`message-bubble other`}>
                        {message.type === 'contact_inquiry' && message.metadata?.subject && (
                          <div className="message-subject">
                            Re: {message.metadata.subject}
                          </div>
                        )}
                        <p className="message-content">{message.content}</p>
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {isOwn && (
                  <div className={`message-bubble own`}>
                    {message.type === 'contact_inquiry' && message.metadata?.subject && (
                      <div className="message-subject">
                        Re: {message.metadata.subject}
                      </div>
                    )}
                    <p className="message-content">{message.content}</p>
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageThread;
