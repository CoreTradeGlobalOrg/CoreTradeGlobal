/**
 * ProviderQuoteChatSidebar Component
 *
 * Chat sidebar shown on both the buyer's quote comparison page
 * (/deals/[dealId]/quotes) and the provider's quote detail page
 * (/provider/quotes/[requestId]).
 *
 * - Buyer view: lists all provider chat threads for the deal; switchable
 * - Provider view: shows their single conversation with the deal parties
 *
 * Conversations use the 'provider_quote' type with deterministic IDs:
 *   providerquote_${dealId}_${providerId}
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, ChevronLeft, Send, Loader2 } from 'lucide-react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { CreateConversationUseCase } from '@/domain/usecases/messaging/CreateConversationUseCase';
import { Conversation } from '@/domain/entities/Conversation';
import { Message } from '@/domain/entities/Message';
import { ConversationProfileCard } from '@/presentation/components/features/messaging/ConversationProfileCard/ConversationProfileCard';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Inline Message Thread (self-contained — does not use global MessagesContext
// to avoid interfering with the FAB widget state)
// ─────────────────────────────────────────────────────────────────────────────

function InlineMessageThread({ messages, participantDetails, currentUid }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-[#4A5B6E] text-center">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {messages.map((message) => {
        if (message.type === 'system') {
          return (
            <div key={message.id} className="flex justify-center">
              <span className="text-xs text-[#4A5B6E] bg-[#1A283B] px-3 py-1 rounded-full">
                {message.content}
              </span>
            </div>
          );
        }

        const isOwn = message.senderId === currentUid;
        const senderDetails = participantDetails?.[message.senderId] || {};
        const senderInitial = (message.senderName || senderDetails.displayName || '?').charAt(0).toUpperCase();

        return (
          <div
            key={message.id}
            className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {!isOwn && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1E2D3D] flex items-center justify-center overflow-hidden self-end">
                {senderDetails.photoURL ? (
                  <img src={senderDetails.photoURL} alt={message.senderName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-semibold">{senderInitial}</span>
                )}
              </div>
            )}
            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
              {!isOwn && (
                <span className="text-xs text-[#6B7A8D] ml-1">
                  {message.senderName || senderDetails.displayName || 'Unknown'}
                </span>
              )}
              <div
                className={`px-3 py-2 rounded-2xl text-sm break-words ${
                  isOwn
                    ? 'bg-[#FFD700] text-[#0F1C2E] rounded-br-sm'
                    : 'bg-[#1E2D3D] text-white rounded-bl-sm'
                }`}
              >
                {message.content}
              </div>
              <span className="text-[10px] text-[#4A5B6E] mx-1">
                {formatTime(message.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Message Input (self-contained — uses useSendMessage internally)
// ─────────────────────────────────────────────────────────────────────────────

function InlineMessageInput({ conversationId, onConversationCreated, dealId, buyerId, sellerId, providerId, providerType, currentUid }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      let targetConversationId = conversationId;

      // If no conversation exists yet, create it now (on first message)
      if (!targetConversationId) {
        const conversationRepository = container.getConversationRepository();
        const messageRepository = container.getMessageRepository();
        const notificationRepository = container.getNotificationRepository();
        const userRepository = container.getUserRepository();

        const createConversationUseCase = new CreateConversationUseCase(
          conversationRepository,
          messageRepository,
          notificationRepository,
          userRepository
        );

        const conversation = await createConversationUseCase.execute({
          type: 'provider_quote',
          participantIds: [buyerId, sellerId, providerId],
          creatorId: currentUid,
          metadata: { dealId, providerId, providerType },
        });

        targetConversationId = conversation.id;
        onConversationCreated?.(conversation);
      }

      // Send the message
      const messageRepository = container.getMessageRepository();
      const conversationRepository = container.getConversationRepository();
      const notificationRepository = container.getNotificationRepository();

      const { SendMessageUseCase } = await import('@/domain/usecases/messaging/SendMessageUseCase');
      const sendMessageUseCase = new SendMessageUseCase(messageRepository, conversationRepository, notificationRepository);

      const userDetails = container.getUserRepository();
      const senderUser = await userDetails.getById(currentUid);
      const senderName = senderUser?.displayName || senderUser?.email || 'Unknown';

      await sendMessageUseCase.execute({
        conversationId: targetConversationId,
        senderId: currentUid,
        senderName,
        content: text,
        type: 'text',
        attachments: [],
        metadata: {},
      });

      setMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t border-[#1E2D3D]">
      <textarea
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
        disabled={sending}
        className="flex-1 bg-[#1A283B] border border-[#2A3B52] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4A5B6E] resize-none focus:outline-none focus:border-[#FFD700]/50 disabled:opacity-50"
        style={{ maxHeight: 100 }}
      />
      <button
        onClick={handleSend}
        disabled={!message.trim() || sending}
        className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#FFD700] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFE44D] transition-colors"
      >
        {sending ? (
          <Loader2 className="w-4 h-4 text-[#0F1C2E] animate-spin" />
        ) : (
          <Send className="w-4 h-4 text-[#0F1C2E]" />
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Selector (buyer view — list of providers to choose from)
// ─────────────────────────────────────────────────────────────────────────────

function ProviderSelector({ providerConversations, selectedProviderId, onSelect }) {
  if (providerConversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-[#4A5B6E] text-center">
          No provider conversations yet. Provider chats will appear here when providers submit quotes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {providerConversations.map((conv) => {
        const providerId = conv.metadata?.providerId;
        const providerDetails = conv.participantDetails?.[providerId] || {};
        const displayName = providerDetails.displayName || 'Provider';
        const initial = displayName.charAt(0).toUpperCase();
        const isSelected = selectedProviderId === providerId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left border-b border-[rgba(255,255,255,0.05)] ${
              isSelected ? 'bg-[rgba(255,215,0,0.05)] border-l-2 border-l-[#FFD700]' : ''
            }`}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1E2D3D] flex items-center justify-center overflow-hidden">
              {providerDetails.photoURL ? (
                <img src={providerDetails.photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-semibold">{initial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              {providerDetails.companyName && (
                <p className="text-xs text-[#6B7A8D] truncate">{providerDetails.companyName}</p>
              )}
            </div>
            {isSelected && (
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ProviderQuoteChatSidebar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} props.dealId - The deal ID
 * @param {string} props.buyerId - The buyer's UID
 * @param {string} props.sellerId - The seller's UID
 * @param {string} props.providerId - The specific provider's UID (provider view) or null (buyer view)
 * @param {string} [props.providerType] - 'insurance' | 'logistics'
 * @param {string} props.currentUserId - Currently authenticated user's UID
 */
export function ProviderQuoteChatSidebar({ dealId, buyerId, sellerId, providerId, providerType, currentUserId }) {
  const isProviderView = !!providerId && currentUserId === providerId;
  const isBuyerView = !isProviderView;

  // For buyer view: list of all provider conversations for this deal
  const [providerConversations, setProviderConversations] = useState([]);
  const [providerConvsLoading, setProviderConvsLoading] = useState(isBuyerView);

  // Active conversation being viewed
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeConversationLoading, setActiveConversationLoading] = useState(false);

  // Real-time messages for the active conversation
  const [messages, setMessages] = useState([]);

  // For buyer view: whether we're in the provider selector or thread view
  const [showProviderList, setShowProviderList] = useState(isBuyerView);

  const messageUnsubscribeRef = useRef(null);

  const conversationRepository = container.getConversationRepository();
  const messageRepository = container.getMessageRepository();

  // ── Provider view: load or auto-subscribe to the single conversation ──────
  useEffect(() => {
    if (!isProviderView || !dealId || !providerId) return;

    const deterministicId = `providerquote_${dealId}_${providerId}`;

    setActiveConversationLoading(true);
    conversationRepository.getById(deterministicId).then((conv) => {
      if (conv) {
        setActiveConversation(Conversation.fromFirestore ? Conversation.fromFirestore(conv) : conv);
      }
      setActiveConversationLoading(false);
    }).catch((err) => {
      console.error('Error loading provider conversation:', err);
      setActiveConversationLoading(false);
    });
  }, [isProviderView, dealId, providerId]);

  // ── Buyer view: load all provider conversations for this deal ─────────────
  useEffect(() => {
    if (!isBuyerView || !dealId) return;

    setProviderConvsLoading(true);
    conversationRepository.getProviderQuoteConversationsForDeal(dealId).then((convs) => {
      setProviderConversations(convs);
      setProviderConvsLoading(false);
    }).catch((err) => {
      console.error('Error loading provider conversations:', err);
      setProviderConvsLoading(false);
    });
  }, [isBuyerView, dealId]);

  // ── Subscribe to messages when active conversation changes ────────────────
  useEffect(() => {
    // Unsubscribe from previous
    if (messageUnsubscribeRef.current) {
      messageUnsubscribeRef.current();
      messageUnsubscribeRef.current = null;
    }

    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    const unsubscribe = messageRepository.subscribeToConversationMessages(
      activeConversation.id,
      (docs) => {
        const msgs = docs.map((doc) => (Message.fromFirestore ? Message.fromFirestore(doc) : doc));
        setMessages(msgs);
      },
      (err) => {
        console.error('Error subscribing to messages:', err);
      }
    );

    messageUnsubscribeRef.current = unsubscribe;

    return () => {
      if (messageUnsubscribeRef.current) {
        messageUnsubscribeRef.current();
        messageUnsubscribeRef.current = null;
      }
    };
  }, [activeConversation?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectProvider = useCallback((conv) => {
    setActiveConversation(conv);
    setShowProviderList(false);
  }, []);

  const handleBack = useCallback(() => {
    setActiveConversation(null);
    setShowProviderList(true);
  }, []);

  const handleConversationCreated = useCallback((conv) => {
    setActiveConversation(conv);
    // Add to provider conversations list if buyer view
    if (isBuyerView) {
      setProviderConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        if (exists) return prev;
        return [...prev, conv];
      });
    }
  }, [isBuyerView]);

  // ── Derive active provider ID (for profile card in buyer view) ────────────
  const activeProviderId = activeConversation?.metadata?.providerId || providerId;

  // ── Render header ─────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (isProviderView) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E2D3D]">
          <MessageSquare className="w-4 h-4 text-[#FFD700]" />
          <span className="text-sm font-semibold text-white">Chat with Deal Parties</span>
        </div>
      );
    }

    // Buyer view
    if (!showProviderList && activeConversation) {
      const providerDetails = activeConversation.participantDetails?.[activeConversation.metadata?.providerId] || {};
      const providerName = providerDetails.displayName || 'Provider';

      return (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E2D3D]">
          <button
            onClick={handleBack}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#8899AA]" />
          </button>
          <span className="text-sm font-semibold text-white truncate">{providerName}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E2D3D]">
        <MessageSquare className="w-4 h-4 text-[#FFD700]" />
        <span className="text-sm font-semibold text-white">Provider Chats</span>
        {providerConversations.length > 0 && (
          <span className="ml-auto text-xs text-[#4A5B6E]">{providerConversations.length}</span>
        )}
      </div>
    );
  };

  // ── Render body ───────────────────────────────────────────────────────────
  const renderBody = () => {
    // Provider view
    if (isProviderView) {
      if (activeConversationLoading) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#4A5B6E] animate-spin" />
          </div>
        );
      }

      const participantDetails = activeConversation?.participantDetails || {};

      // Show profile card for the buyer (first non-current-user participant)
      const otherUserId = activeConversation?.participants?.find(
        (id) => id !== currentUserId && id === buyerId
      ) || buyerId;

      return (
        <>
          {activeConversation && (
            <ConversationProfileCard
              otherUserId={otherUserId}
              participantDetails={participantDetails}
            />
          )}
          <InlineMessageThread
            messages={messages}
            participantDetails={participantDetails}
            currentUid={currentUserId}
          />
          <InlineMessageInput
            conversationId={activeConversation?.id || null}
            onConversationCreated={handleConversationCreated}
            dealId={dealId}
            buyerId={buyerId}
            sellerId={sellerId}
            providerId={providerId}
            providerType={providerType}
            currentUid={currentUserId}
          />
        </>
      );
    }

    // Buyer view — provider selector
    if (showProviderList || !activeConversation) {
      if (providerConvsLoading) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#4A5B6E] animate-spin" />
          </div>
        );
      }

      return (
        <ProviderSelector
          providerConversations={providerConversations}
          selectedProviderId={activeConversation?.metadata?.providerId}
          onSelect={handleSelectProvider}
        />
      );
    }

    // Buyer view — active thread
    const participantDetails = activeConversation?.participantDetails || {};

    return (
      <>
        {activeProviderId && (
          <ConversationProfileCard
            otherUserId={activeProviderId}
            participantDetails={participantDetails}
          />
        )}
        <InlineMessageThread
          messages={messages}
          participantDetails={participantDetails}
          currentUid={currentUserId}
        />
        <InlineMessageInput
          conversationId={activeConversation?.id || null}
          onConversationCreated={handleConversationCreated}
          dealId={dealId}
          buyerId={buyerId}
          sellerId={sellerId}
          providerId={activeProviderId}
          providerType={activeConversation?.metadata?.providerType || providerType}
          currentUid={currentUserId}
        />
      </>
    );
  };

  if (!dealId || !buyerId || !sellerId || !currentUserId) return null;

  return (
    <div className="flex flex-col h-full bg-[#0A1628] border-l border-[#1E2D3D] w-[380px] flex-shrink-0">
      {renderHeader()}
      <div className="flex flex-col flex-1 overflow-hidden">
        {renderBody()}
      </div>
    </div>
  );
}

export default ProviderQuoteChatSidebar;
