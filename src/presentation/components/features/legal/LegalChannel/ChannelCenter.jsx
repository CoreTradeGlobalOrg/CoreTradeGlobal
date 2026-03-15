/**
 * ChannelCenter Component
 *
 * Center panel for the legal channel. Shows:
 *   - Scrollable message list with 4 message types (text, attachment, system, quick_action)
 *   - Date separators between different days
 *   - Message grouping (consecutive messages from same sender within 5 min)
 *   - Input area with textarea + send + attach file buttons
 *   - QuickActionToolbar above the input
 *
 * Props:
 *   messages                - LegalMessage[] array
 *   sendMessage             - Send a message function
 *   uploadAndSendAttachment - Upload and send attachment function
 *   currentUser             - Firebase auth user object
 *   isLawyer                - Whether current user is the lawyer
 *   isReadOnly              - Whether the channel is completed
 *   engagement              - LegalEngagement entity
 *   sending                 - Whether a message is being sent
 *   onUploadDraft           - Upload draft handler (for Quick Action toolbar)
 *   onAddRisk               - Add risk handler (for Quick Action toolbar)
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  FileText,
  Image,
  Download,
  Zap,
  Lock,
} from 'lucide-react';
import { format, isSameDay, differenceInMinutes } from 'date-fns';
import { LEGAL_MESSAGE_TYPE, ALLOWED_LEGAL_FILE_TYPES } from '@/core/constants/legalConstants';
import { QuickActionToolbar } from './QuickActionToolbar';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMessageDate(msg) {
  if (!msg.createdAt) return new Date();
  return msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Date separator
// ─────────────────────────────────────────────────────────────────────────────

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
      <span className="text-xs text-[#4A5B6E] font-medium">
        {format(date, 'MMMM d, yyyy')}
      </span>
      <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System message
// ─────────────────────────────────────────────────────────────────────────────

function SystemMessage({ message }) {
  return (
    <div className="flex justify-center py-1.5">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
        <Lock size={11} className="text-purple-400" />
        <span className="text-xs text-purple-300 italic">{message.content}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick action message
// ─────────────────────────────────────────────────────────────────────────────

function QuickActionMessage({ message }) {
  return (
    <div className="flex justify-center py-1.5">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]">
        <Zap size={11} className="text-[#FFD700]" />
        <span className="text-xs text-[#8899AA]">
          <span className="text-white font-medium">{message.senderName}</span>
          {' · '}
          {message.quickAction?.label || message.content}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment bubble
// ─────────────────────────────────────────────────────────────────────────────

function AttachmentBubble({ attachment }) {
  const isImage = attachment.type?.startsWith('image/');

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] transition-colors group max-w-[200px]"
    >
      {isImage ? (
        <Image size={16} className="text-blue-400 flex-shrink-0" />
      ) : (
        <FileText size={16} className="text-[#FFD700] flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate group-hover:text-[#FFD700] transition-colors">
          {attachment.name}
        </p>
        {attachment.size ? (
          <p className="text-xs text-[#4A5B6E]">{formatFileSize(attachment.size)}</p>
        ) : null}
      </div>
      <Download size={12} className="text-[#4A5B6E] group-hover:text-[#FFD700] flex-shrink-0" />
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat bubble (text or attachment)
// ─────────────────────────────────────────────────────────────────────────────

function ChatBubble({ message, isOwn, showSender }) {
  const date = getMessageDate(message);
  const isAttachment = message.type === LEGAL_MESSAGE_TYPE.ATTACHMENT;

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} gap-1 max-w-[75%]`}>
      {showSender && (
        <span className="text-xs text-[#4A5B6E] px-1">
          {message.senderName}
        </span>
      )}
      {isAttachment && message.attachments?.length > 0 ? (
        <div className="space-y-1">
          {message.attachments.map((att, i) => (
            <AttachmentBubble key={`${att.storagePath || i}`} attachment={att} />
          ))}
        </div>
      ) : (
        <div
          className={`
            inline-block px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${
              isOwn
                ? 'bg-purple-600 text-white rounded-tr-sm'
                : 'bg-[#1A283B] border border-[rgba(255,255,255,0.08)] text-white rounded-tl-sm'
            }
          `}
          style={{ overflowWrap: 'anywhere' }}
        >
          {message.content}
        </div>
      )}
      <span className={`block text-[10px] text-[#4A5B6E] px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
        {format(date, 'h:mm a')}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChannelCenter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/LegalMessage').LegalMessage[]} props.messages
 * @param {Function} props.sendMessage
 * @param {Function} props.uploadAndSendAttachment
 * @param {Object} props.currentUser
 * @param {boolean} props.isLawyer
 * @param {boolean} props.isReadOnly
 * @param {import('@/domain/entities/LegalEngagement').LegalEngagement} props.engagement
 * @param {boolean} props.sending
 * @param {Function} props.onUploadDraft
 * @param {Function} props.onAddRisk
 */
export function ChannelCenter({
  messages,
  sendMessage,
  uploadAndSendAttachment,
  currentUser,
  isLawyer,
  isReadOnly,
  engagement,
  sending,
  onUploadDraft,
  onAddRisk,
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const isNearBottomRef = useRef(false);
  const prevMessageCountRef = useRef(0);

  // Track scroll position to determine if user is near bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    isNearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Auto-scroll only when a NEW message arrives and user is near bottom
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [inputText]);

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || sending) return;
    setInputText('');
    await sendMessage(content, LEGAL_MESSAGE_TYPE.TEXT);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await uploadAndSendAttachment(file);
  };

  const handleQuickAction = useCallback(
    async (action) => {
      await sendMessage(action.label, LEGAL_MESSAGE_TYPE.QUICK_ACTION, {
        action: action.id,
        label: action.label,
      });
    },
    [sendMessage]
  );

  // Build rendered message list with date separators and grouping
  const renderedMessages = [];
  let prevDate = null;
  let prevSenderId = null;
  let prevMsgTime = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = getMessageDate(msg);

    // Date separator
    if (!prevDate || !isSameDay(prevDate, msgDate)) {
      renderedMessages.push({ type: 'date', date: msgDate, key: `date-${i}` });
      prevDate = msgDate;
      prevSenderId = null;
      prevMsgTime = null;
    }

    // Determine if sender name should be shown
    // Show sender name if: different sender, or more than 5 minutes since last message
    const isSystem =
      msg.type === LEGAL_MESSAGE_TYPE.SYSTEM || msg.type === LEGAL_MESSAGE_TYPE.QUICK_ACTION;
    const isSameSender = prevSenderId === msg.senderId;
    const withinFiveMin =
      prevMsgTime && differenceInMinutes(msgDate, prevMsgTime) < 5;
    const showSender = !isSystem && (!isSameSender || !withinFiveMin);

    renderedMessages.push({
      type: 'message',
      message: msg,
      isOwn: msg.senderId === currentUser?.uid,
      showSender,
      key: msg.id,
    });

    if (!isSystem) {
      prevSenderId = msg.senderId;
      prevMsgTime = msgDate;
    }
  }

  const acceptTypes = ALLOWED_LEGAL_FILE_TYPES.join(',');

  return (
    <div className="flex flex-col h-full bg-[#0F1C2E]">
      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Lock size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Encrypted Legal Channel</p>
              <p className="text-xs text-[#8899AA] mt-1">
                Messages are private between you and your{' '}
                {isLawyer ? 'client' : 'lawyer'}.
              </p>
            </div>
          </div>
        ) : (
          renderedMessages.map((item) => {
            if (item.type === 'date') {
              return <DateSeparator key={item.key} date={item.date} />;
            }

            const { message, isOwn, showSender } = item;

            if (message.type === LEGAL_MESSAGE_TYPE.SYSTEM) {
              return <SystemMessage key={item.key} message={message} />;
            }

            if (message.type === LEGAL_MESSAGE_TYPE.QUICK_ACTION) {
              return <QuickActionMessage key={item.key} message={message} />;
            }

            return (
              <div key={item.key} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <ChatBubble message={message} isOwn={isOwn} showSender={showSender} />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      {!isReadOnly && (
        <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.08)] bg-[#0D1927]">
          {/* Quick action toolbar */}
          <QuickActionToolbar
            isLawyer={isLawyer}
            onAction={handleQuickAction}
            onAttachFile={() => fileInputRef.current?.click()}
            onUploadDraft={onUploadDraft}
            onAddRisk={onAddRisk}
            isReadOnly={isReadOnly}
          />

          {/* Text input + send */}
          <div className="flex items-end gap-2 px-3 py-2">
            {/* Hidden file input for attachments */}
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              className="hidden"
              onChange={handleFileSelected}
            />

            {/* Attach file button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="p-2 rounded-lg text-[#4A5B6E] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors flex-shrink-0 disabled:opacity-50"
              title="Attach file"
            >
              <Paperclip size={18} />
            </button>

            {/* Text area */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={2}
              disabled={sending}
              className="flex-1 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-purple-500/60 resize-none transition-colors disabled:opacity-50"
              style={{ minHeight: '52px', maxHeight: '150px' }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.08)] bg-[#0D1927] px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <Lock size={14} className="text-[#4A5B6E]" />
            <span className="text-xs text-[#8899AA]">This engagement is completed. Read-only.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChannelCenter;
