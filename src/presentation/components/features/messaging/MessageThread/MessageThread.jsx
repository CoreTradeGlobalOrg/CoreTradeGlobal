/**
 * MessageThread Component
 *
 * Displays messages in a conversation with real-time updates
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMarkAsRead } from '@/presentation/hooks/messaging/useMarkAsRead';
import { FileText, Download, X } from 'lucide-react';
import './MessageThread.css';

// Lightbox for viewing images
function ImageLightbox({ src, alt, onClose }) {
  return (
    <div className="image-lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// Attachment display component
function AttachmentDisplay({ attachment, isOwn, onImageLoad }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const isImage = attachment.type?.startsWith('image/');

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isImage) {
    return (
      <>
        <div
          className={`message-attachment-image ${imageLoading ? 'loading' : 'loaded'}`}
          onClick={() => !imageLoading && setLightboxOpen(true)}
        >
          {imageLoading && (
            <div className="attachment-image-loader">
              <span className="attachment-spinner" />
            </div>
          )}
          <img
            src={attachment.url}
            alt={attachment.name}
            onLoad={() => {
              setImageLoading(false);
              // Small delay to ensure DOM updates with new image size before scrolling
              setTimeout(() => onImageLoad?.(), 50);
            }}
            className={imageLoading ? 'hidden' : 'visible'}
          />
        </div>
        {lightboxOpen && (
          <ImageLightbox
            src={attachment.url}
            alt={attachment.name}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`message-attachment-file ${isOwn ? 'own' : 'other'}`}
    >
      <div className="attachment-file-icon">
        <FileText className="w-5 h-5" />
      </div>
      <div className="attachment-file-info">
        <span className="attachment-file-name">{attachment.name}</span>
        <span className="attachment-file-size">{formatFileSize(attachment.size)}</span>
      </div>
      <Download className="w-4 h-4 attachment-download-icon" />
    </a>
  );
}

export function MessageThread({ conversationId, participantDetails = {} }) {
  const { user } = useAuth();
  const { activeMessages } = useMessages();
  const { markConversationAsRead } = useMarkAsRead();
  const messagesEndRef = useRef(null);
  const hasMarkedAsRead = useRef(false);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
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
                      {/* Attachments */}
                      {message.attachments?.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map((attachment, idx) => (
                            <AttachmentDisplay key={idx} attachment={attachment} isOwn={false} onImageLoad={scrollToBottom} />
                          ))}
                        </div>
                      )}
                      {/* Text content */}
                      {message.content && (
                        <div className={`message-bubble other`}>
                          {message.type === 'contact_inquiry' && message.metadata?.subject && (
                            <div className="message-subject">
                              Re: {message.metadata.subject}
                            </div>
                          )}
                          <p className="message-content">{message.content}</p>
                          <span className="message-time">{formatTime(message.createdAt)}</span>
                        </div>
                      )}
                      {/* Time for attachment-only messages */}
                      {!message.content && message.attachments?.length > 0 && (
                        <span className="message-time-standalone">{formatTime(message.createdAt)}</span>
                      )}
                    </div>
                  </div>
                )}

                {isOwn && (
                  <div className="message-own-wrapper">
                    {/* Attachments */}
                    {message.attachments?.length > 0 && (
                      <div className="message-attachments own">
                        {message.attachments.map((attachment, idx) => (
                          <AttachmentDisplay key={idx} attachment={attachment} isOwn={true} onImageLoad={scrollToBottom} />
                        ))}
                      </div>
                    )}
                    {/* Text content */}
                    {message.content && (
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
                    {/* Time for attachment-only messages */}
                    {!message.content && message.attachments?.length > 0 && (
                      <span className="message-time-standalone own">{formatTime(message.createdAt)}</span>
                    )}
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
