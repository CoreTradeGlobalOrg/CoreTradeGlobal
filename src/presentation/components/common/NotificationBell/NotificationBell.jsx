/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread notification count
 * Shows dropdown with recent conversations and quote notifications
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, FileText, X, Check, Trash2, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useMarkAsRead } from '@/presentation/hooks/messaging/useMarkAsRead';
import './NotificationBell.css';

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadNotificationCount, openConversation } = useMessages();
  const { markNotificationAsRead, markAllNotificationsAsRead, deleteAllNotifications } = useMarkAsRead();
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

    // Handle based on notification type
    if (notification.type === 'new_user_approval' && notification.data?.userId) {
      // Navigate to admin users page
      router.push('/admin?tab=users');
    } else if (notification.type === 'quote_received' && notification.data?.requestId) {
      // Navigate to RFQ detail page and scroll to quotes section
      router.push(`/request/${notification.data.requestId}#quotes`);
    } else if ((notification.type === 'quote_accepted' || notification.type === 'quote_rejected') && notification.data?.requestId) {
      // Navigate to RFQ detail page (for quote submitter to see status)
      router.push(`/request/${notification.data.requestId}`);
    } else if (notification.data?.conversationId) {
      // Open FAB with the conversation (don't navigate to messages page)
      openConversation(notification.data.conversationId);
    }

    setIsOpen(false);
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'quote_received':
        return <FileText className="w-4 h-4" />;
      case 'quote_accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'quote_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'new_user_approval':
        return <UserPlus className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Get notification icon class based on type
  const getIconClass = (type) => {
    switch (type) {
      case 'quote_received':
        return 'quote-icon';
      case 'quote_accepted':
        return 'accepted-icon';
      case 'quote_rejected':
        return 'rejected-icon';
      case 'new_user_approval':
        return 'approval-icon';
      default:
        return '';
    }
  };

  // Recent notifications
  const recentNotifications = notifications.slice(0, 5);

  const formatTime = (date) => {
    if (!date) return '';

    // Handle Firestore Timestamp objects
    let msgDate;
    if (date?.toDate && typeof date.toDate === 'function') {
      msgDate = date.toDate();
    } else if (date instanceof Date) {
      msgDate = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      msgDate = new Date(date);
    } else if (date?.seconds) {
      // Firestore Timestamp as plain object
      msgDate = new Date(date.seconds * 1000);
    } else {
      return '';
    }

    // Check if date is valid
    if (isNaN(msgDate.getTime())) return '';

    const now = new Date();
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
        {unreadNotificationCount > 0 && (
          <span className="notification-badge">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button
              className="notification-close"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="notification-content">
            {recentNotifications.length === 0 ? (
              <div className="notification-empty">
                <Bell className="w-8 h-8 text-[#64748b]" />
                <p>No new notifications</p>
              </div>
            ) : (
              <>
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''} ${notification.type}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`notification-item-icon ${getIconClass(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-item-content">
                      <p className="notification-item-title">{notification.title}</p>
                      <p className="notification-item-body">{notification.body}</p>
                      <span className="notification-item-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <span className={`notification-unread-dot ${notification.type === 'quote_accepted' ? 'accepted' : notification.type === 'quote_rejected' ? 'rejected' : notification.type === 'new_user_approval' ? 'approval' : ''}`} />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <div className="notification-footer-actions">
                <button
                  className="notification-footer-btn"
                  onClick={async () => {
                    await markAllNotificationsAsRead();
                  }}
                >
                  <Check className="w-4 h-4" />
                  Mark all as read
                </button>
                <button
                  className="notification-footer-btn delete"
                  onClick={async () => {
                    await deleteAllNotifications();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
