/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread notification count
 * Shows dropdown with recent conversations
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, X } from 'lucide-react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useMarkAsRead } from '@/presentation/hooks/messaging/useMarkAsRead';
import { useAuth } from '@/presentation/contexts/AuthContext';
import './NotificationBell.css';

export function NotificationBell() {
  const { user } = useAuth();
  const {
    conversations,
    totalUnreadCount,
    notifications,
    unreadNotificationCount,
    openConversation,
    setIsWidgetOpen,
  } = useMessages();
  const { markNotificationAsRead } = useMarkAsRead();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }

    // Open the conversation
    if (notification.data?.conversationId) {
      openConversation(notification.data.conversationId);
      setIsWidgetOpen(true);
    }

    setIsOpen(false);
  };

  const handleViewAllClick = () => {
    setIsWidgetOpen(true);
    setIsOpen(false);
  };

  // Get recent unread conversations for quick access
  const recentConversations = conversations
    .filter((conv) => (conv.unreadCount[user?.uid] || 0) > 0)
    .slice(0, 5);

  // Recent notifications
  const recentNotifications = notifications.slice(0, 5);

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return msgDate.toLocaleDateString();
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalUnreadCount > 0 && (
          <span className="notification-badge">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Messages</h3>
            <button
              className="notification-close"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="notification-content">
            {recentNotifications.length === 0 && recentConversations.length === 0 ? (
              <div className="notification-empty">
                <MessageSquare className="w-8 h-8 text-[#64748b]" />
                <p>No new messages</p>
              </div>
            ) : (
              <>
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-item-icon">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="notification-item-content">
                      <p className="notification-item-title">{notification.title}</p>
                      <p className="notification-item-body">{notification.body}</p>
                      <span className="notification-item-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <span className="notification-unread-dot" />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="notification-footer">
            <button onClick={handleViewAllClick}>
              View All Messages
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
