/**
 * MessageInput Component
 *
 * Input field for composing and sending messages with file upload
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Paperclip, X, Image, FileText } from 'lucide-react';
import { useSendMessage } from '@/presentation/hooks/messaging/useSendMessage';
import toast from 'react-hot-toast';
import './MessageInput.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export function MessageInput({ conversationId }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const { sendMessage, sending, error } = useSendMessage();
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchParams = useSearchParams();
  const draftLoaded = useRef(false);

  // Load draft from URL if present
  useEffect(() => {
    if (draftLoaded.current) return;

    const draft = searchParams.get('draft');
    if (draft) {
      setMessage(decodeURIComponent(draft));
      draftLoaded.current = true;
      // Clean up URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('draft');
      window.history.replaceState({}, '', url.pathname);
      // Trigger resize after setting message
      setTimeout(() => autoResize(), 0);
    }
  }, [searchParams]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversationId]);

  // Auto-resize textarea
  const autoResize = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  };

  useEffect(() => {
    autoResize();
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if ((!message.trim() && attachments.length === 0) || sending) return;

    try {
      await sendMessage(conversationId, message, attachments);
      setMessage('');
      setAttachments([]);
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        continue;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }

      // Check max attachments
      if (attachments.length >= 5) {
        toast.error('Maximum 5 attachments allowed');
        break;
      }

      // Create preview for images
      const attachment = {
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        isImage: file.type.startsWith('image/'),
        preview: null,
      };

      if (attachment.isImage) {
        attachment.preview = URL.createObjectURL(file);
      }

      setAttachments((prev) => [...prev, attachment]);
    }

    // Reset file input
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      // Revoke preview URL to prevent memory leak
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="message-attachments-preview">
          {attachments.map((attachment, index) => (
            <div key={index} className="attachment-preview-item">
              {attachment.isImage ? (
                <img src={attachment.preview} alt={attachment.name} />
              ) : (
                <div className="attachment-file-icon">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="attachment-info">
                <span className="attachment-name">{attachment.name}</span>
                <span className="attachment-size">{formatFileSize(attachment.size)}</span>
              </div>
              <button
                type="button"
                className="attachment-remove"
                onClick={() => removeAttachment(index)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="message-input-wrapper">
        {/* File Upload Button */}
        <button
          type="button"
          className="message-attach-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={sending}
          className="message-input-field"
        />

        <button
          type="submit"
          className="message-send-button"
          disabled={(!message.trim() && attachments.length === 0) || sending}
        >
          {sending ? (
            <span className="message-send-spinner" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {error && <p className="message-input-error">{error}</p>}
    </form>
  );
}

export default MessageInput;
