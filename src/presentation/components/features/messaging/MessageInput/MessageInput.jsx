/**
 * MessageInput Component
 *
 * Input field for composing and sending messages
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { useSendMessage } from '@/presentation/hooks/messaging/useSendMessage';
import './MessageInput.css';

export function MessageInput({ conversationId }) {
  const [message, setMessage] = useState('');
  const { sendMessage, sending, error } = useSendMessage();
  const inputRef = useRef(null);
  const searchParams = useSearchParams();
  const router = useRouter();
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
    }
  }, [searchParams]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || sending) return;

    try {
      await sendMessage(conversationId, message);
      setMessage('');
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="message-input-wrapper">
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
          disabled={!message.trim() || sending}
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
