/**
 * MessageThread Component
 *
 * Displays messages in a conversation with real-time updates
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMarkAsRead } from '@/presentation/hooks/messaging/useMarkAsRead';
import { FileText, Download, X, Handshake, Trash2 } from 'lucide-react';
import { useDeleteMessage } from '@/presentation/hooks/messaging/useDeleteMessage';
import toast from 'react-hot-toast';
import './MessageThread.css';

// Lightbox for viewing images
function ImageLightbox({ src, alt, onClose, onDownload }) {
  return (
    <div className="image-lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <X className="w-6 h-6" />
      </button>
      {onDownload && (
        <button className="lightbox-download" onClick={onDownload} title="Download" aria-label="Download image">
          <Download className="w-6 h-6" />
        </button>
      )}
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

  // Force a real download. Cross-origin Firebase Storage URLs ignore the <a download>
  // attribute, so fetch the file as a blob and trigger a same-origin object-URL
  // download. Falls back to opening in a new tab if the fetch is blocked (e.g. CORS).
  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(attachment.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = attachment.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Attachment download failed, opening in new tab:', err);
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Browsers can only render some types inline (images, PDFs, plain text). For
  // anything else (CSV, xlsx, docx…), "opening" the URL just triggers a download
  // using the raw storage filename — inconsistent with the download button's clean
  // name. So for non-previewable types we route preview through the same download.
  const canPreviewInline =
    attachment.type?.startsWith('image/') ||
    attachment.type === 'application/pdf' ||
    attachment.type === 'text/plain';

  const handlePreview = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canPreviewInline) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    } else {
      handleDownload(e);
    }
  };

  if (isImage) {
    return (
      <>
        <div className={`message-attachment-image ${imageLoading ? 'loading' : 'loaded'}`}>
          {imageLoading && (
            <div className="attachment-image-loader">
              <span className="attachment-spinner" />
            </div>
          )}
          <img
            src={attachment.url}
            alt={attachment.name}
            onClick={() => !imageLoading && setLightboxOpen(true)}
            onLoad={() => {
              setImageLoading(false);
              // Small delay to ensure DOM updates with new image size before scrolling
              setTimeout(() => onImageLoad?.(), 50);
            }}
            className={imageLoading ? 'hidden' : 'visible'}
          />
          {!imageLoading && (
            <button
              type="button"
              className="attachment-image-download"
              onClick={handleDownload}
              title="Download"
              aria-label="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
        {lightboxOpen && (
          <ImageLightbox
            src={attachment.url}
            alt={attachment.name}
            onClose={() => setLightboxOpen(false)}
            onDownload={handleDownload}
          />
        )}
      </>
    );
  }

  return (
    <div className={`message-attachment-file ${isOwn ? 'own' : 'other'}`}>
      <button
        type="button"
        className="attachment-preview-btn"
        onClick={handlePreview}
        title="Preview"
      >
        <div className="attachment-file-icon">
          <FileText className="w-5 h-5" />
        </div>
        <div className="attachment-file-info">
          <span className="attachment-file-name">{attachment.name}</span>
          <span className="attachment-file-size">{formatFileSize(attachment.size)}</span>
        </div>
      </button>
      <button
        type="button"
        className="attachment-download-btn"
        onClick={handleDownload}
        title="Download"
        aria-label="Download file"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

export function MessageThread({ conversationId, participantDetails = {} }) {
  const { user } = useAuth();
  const { activeMessages } = useMessages();
  const { markConversationAsRead } = useMarkAsRead();
  const { deleteMessage, deleting } = useDeleteMessage();
  const messagesEndRef = useRef(null);
  const hasMarkedAsRead = useRef(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(conversationId, messageId);
      setDeleteConfirm(null);
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  // Scroll to bottom — scrolls the direct parent container, not the whole page
  const scrollToBottom = () => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
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
            // ── System Message (deal initiated, counter-offer, etc.) ──
            if (message.type === 'system') {
              return (
                <div key={message.id} className="system-message-wrapper">
                  <div className="system-message-bubble">
                    <p className="system-message-text">{message.content}</p>
                    {message.dealLink && (
                      <Link href={message.dealLink} className="system-message-deal-btn">
                        <Handshake className="w-4 h-4" />
                        View Deal
                      </Link>
                    )}
                    <span className="system-message-time">{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              );
            }

            // ── Regular messages ──
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
                      {/* Attachments */}
                      {message.attachments?.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map((attachment, idx) => (
                            <AttachmentDisplay key={idx} attachment={attachment} isOwn={false} onImageLoad={scrollToBottom} />
                          ))}
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
                    {/* Delete button */}
                    <div className="message-actions">
                      {deleteConfirm === message.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            disabled={deleting}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-900/30 border border-red-800/30"
                          >
                            {deleting ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-400 hover:text-white text-xs px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(message.id)}
                          className="message-delete-btn"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                    {/* Attachments */}
                    {message.attachments?.length > 0 && (
                      <div className="message-attachments own">
                        {message.attachments.map((attachment, idx) => (
                          <AttachmentDisplay key={idx} attachment={attachment} isOwn={true} onImageLoad={scrollToBottom} />
                        ))}
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
