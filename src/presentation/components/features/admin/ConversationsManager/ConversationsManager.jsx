/**
 * Conversations Manager Component
 *
 * Admin panel component for viewing and managing all conversations
 * Displays conversations as "User1 - User2" format with last message preview
 */

'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, User, Clock, ChevronRight, RefreshCw, Search, Filter } from 'lucide-react';
import { container } from '@/core/di/container';
import { Conversation } from '@/domain/entities/Conversation';
import './ConversationsManager.css';

export function ConversationsManager() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Fetch all conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const conversationRepo = container.getConversationRepository();
        const data = await conversationRepo.getAllConversations(100);
        const convos = data.map((doc) => Conversation.fromFirestore(doc));
        setConversations(convos);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);
        const messageRepo = container.getMessageRepository();
        const data = await messageRepo.getByConversationId(selectedConversation.id, 100);
        setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const conversationRepo = container.getConversationRepository();
      const data = await conversationRepo.getAllConversations(100);
      const convos = data.map((doc) => Conversation.fromFirestore(doc));
      setConversations(convos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getParticipantNames = (conversation) => {
    if (conversation.type === 'contact' || conversation.type === 'advertising') {
      const contactName = conversation.metadata?.contactName || 'Anonymous';
      const contactEmail = conversation.metadata?.contactEmail || '';
      const typeLabel = conversation.type === 'advertising' ? 'Advertising' : 'Contact';
      return `${contactName} (${typeLabel})${contactEmail ? ` - ${contactEmail}` : ''}`;
    }

    const names = Object.values(conversation.participantDetails || {})
      .map((p) => p.displayName || p.email || 'Unknown')
      .join(' - ');

    return names || 'Unknown Participants';
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatFullDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // Type filter
    if (filterType !== 'all' && conv.type !== filterType) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const names = getParticipantNames(conv).toLowerCase();
      const subject = conv.metadata?.subject?.toLowerCase() || '';
      const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      return names.includes(query) || subject.includes(query) || lastMsg.includes(query);
    }

    return true;
  });

  if (loading) {
    return (
      <div className="conversations-manager-loading">
        <div className="loading-spinner-admin" />
        <p>Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversations-manager-error">
        <p>Error: {error}</p>
        <button onClick={handleRefresh} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="conversations-manager">
      {/* Header */}
      <div className="conversations-manager-header">
        <div className="header-left">
          <h3>All Conversations</h3>
          <span className="conversation-count">{conversations.length} total</span>
        </div>
        <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="conversations-filters">
        <div className="search-box">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filterType === 'direct' ? 'active' : ''}`}
            onClick={() => setFilterType('direct')}
          >
            Direct
          </button>
          <button
            className={`filter-btn ${filterType === 'contact' ? 'active' : ''}`}
            onClick={() => setFilterType('contact')}
          >
            Contact
          </button>
          <button
            className={`filter-btn ${filterType === 'advertising' ? 'active' : ''}`}
            onClick={() => setFilterType('advertising')}
          >
            Advertising
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="conversations-content">
        {/* Conversation List */}
        <div className={`conversations-list ${selectedConversation ? 'collapsed' : ''}`}>
          {filteredConversations.length === 0 ? (
            <div className="no-conversations">
              <MessageCircle className="w-12 h-12 opacity-30" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'selected' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-icon">
                  {(conv.type === 'contact' || conv.type === 'advertising') ? (
                    <MessageCircle className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="conversation-participants">
                      {getParticipantNames(conv)}
                    </span>
                    <span className="conversation-time">
                      {formatDate(conv.updatedAt)}
                    </span>
                  </div>
                  {(conv.type === 'contact' || conv.type === 'advertising') && conv.metadata?.subject && (
                    <div className="conversation-subject">
                      Subject: {conv.metadata.subject}
                    </div>
                  )}
                  {conv.lastMessage && (
                    <div className="conversation-preview">
                      <span className="sender">{conv.lastMessage.senderName}:</span>
                      {conv.lastMessage.content?.substring(0, 50)}
                      {conv.lastMessage.content?.length > 50 ? '...' : ''}
                    </div>
                  )}
                  <div className="conversation-meta">
                    <span className={`type-badge ${conv.type}`}>{conv.type}</span>
                    <span className="message-count">
                      {conv.participants?.length || 0} participants
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 chevron" />
              </div>
            ))
          )}
        </div>

        {/* Message Detail View */}
        {selectedConversation && (
          <div className="conversation-detail">
            <div className="detail-header">
              <button
                className="back-button"
                onClick={() => setSelectedConversation(null)}
              >
                &larr; Back
              </button>
              <div className="detail-title">
                <h4>{getParticipantNames(selectedConversation)}</h4>
                <span className="detail-type">{selectedConversation.type}</span>
              </div>
            </div>

            {/* Conversation Info */}
            <div className="detail-info">
              <div className="info-row">
                <span className="label">Created:</span>
                <span className="value">{formatFullDate(selectedConversation.createdAt)}</span>
              </div>
              <div className="info-row">
                <span className="label">Last Activity:</span>
                <span className="value">{formatFullDate(selectedConversation.updatedAt)}</span>
              </div>
              {selectedConversation.metadata?.subject && (
                <div className="info-row">
                  <span className="label">Subject:</span>
                  <span className="value">{selectedConversation.metadata.subject}</span>
                </div>
              )}
              {selectedConversation.metadata?.contactEmail && (
                <div className="info-row">
                  <span className="label">Contact Email:</span>
                  <span className="value">{selectedConversation.metadata.contactEmail}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="detail-messages">
              <h5>Messages ({messages.length})</h5>
              {messagesLoading ? (
                <div className="messages-loading">
                  <div className="loading-spinner-small" />
                </div>
              ) : messages.length === 0 ? (
                <div className="no-messages">No messages yet</div>
              ) : (
                <div className="messages-list-admin">
                  {messages.map((msg) => (
                    <div key={msg.id} className="message-item-admin">
                      <div className="message-header-admin">
                        <span className="sender-name">{msg.senderName}</span>
                        <span className="message-time-admin">
                          {formatFullDate(msg.createdAt)}
                        </span>
                      </div>
                      <div className="message-content-admin">{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationsManager;
