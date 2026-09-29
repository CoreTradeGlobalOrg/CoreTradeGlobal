/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread notification count
 * Shows dropdown with recent conversations and quote notifications
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, MessageSquare, FileText, X, Check, Trash2, CheckCircle, XCircle, UserPlus, Handshake, Scale, Mail, DollarSign } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useMarkAsRead } from '@/presentation/hooks/messaging/useMarkAsRead';
import { PAYMENT_STATUSES } from '@/core/constants/wireTransfer';
import './NotificationBell.css';

// Virtual notifications for pending payments — synthesized client-side
// from a live listener on the user's own adInquiries. They never hit
// Firestore's notifications collection because they can't be "read":
// they hang around until the payment status leaves awaiting_payment /
// reported, at which point the listener returns fewer rows and the
// entries drop from the bell automatically. `isVirtual: true` marks
// them so the click handler skips markNotificationAsRead (which would
// error on an id that doesn't correspond to a real doc).
function usePaymentReminders() {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (loading || !user?.uid) {
      setPending([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, 'adInquiries'),
        where('userId', '==', user.uid),
        where('paymentStatus', 'in', [PAYMENT_STATUSES.AWAITING, PAYMENT_STATUSES.REPORTED]),
      ),
      (snap) => {
        setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[bell] payment reminders listen failed:', err);
      },
    );
    return () => unsub();
  }, [loading, user?.uid]);

  return pending;
}

function formatMonthShort(startTs) {
  if (!startTs) return '';
  const d = startTs?.toDate ? startTs.toDate() : new Date(startTs);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, unreadNotificationCount, openConversation } = useMessages();
  const { markNotificationAsRead, markAllNotificationsAsRead, deleteAllNotifications } = useMarkAsRead();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Persistent payment reminders — synthesized from live Firestore
  // state so they stay pinned to the top of the bell for as long as the
  // inquiry sits in awaiting_payment / reported. Once admin confirms
  // the wire (paymentStatus → paid), the row leaves the query result
  // and the reminder disappears automatically.
  const pendingPayments = usePaymentReminders();
  const virtualPaymentNotifications = useMemo(
    () => pendingPayments.map((inq) => ({
      id: `virt-payment-${inq.id}`,
      isVirtual: true,
      type: 'payment_required',
      title: 'Complete your Sponsored Package payment',
      body: inq.paymentStatus === PAYMENT_STATUSES.REPORTED
        ? `${formatMonthShort(inq.startDate)} · payment reported — waiting for confirmation`
        : `${formatMonthShort(inq.startDate)} · reference ${inq.paymentReference || 'CTG'}`,
      createdAt: inq.createdAt,
      isRead: false,
      link: `/pricing/inquire/pay/${inq.id}`,
    })),
    [pendingPayments],
  );

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
    // Virtual (payment) notifications aren't backed by a real Firestore
    // doc — they'd throw if we called markNotificationAsRead. Just
    // navigate; the entry disappears on its own once the linked inquiry
    // leaves the awaiting/reported states.
    if (notification.isVirtual) {
      if (notification.link) router.push(notification.link);
      setIsOpen(false);
      return;
    }
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
    } else if (notification.type === 'legal' && (notification.link || notification.dealId)) {
      // Navigate to legal channel
      router.push(notification.link || `/deals/${notification.dealId}/legal`);
    } else if (notification.type === 'deal' && (notification.dealId || notification.link)) {
      // Navigate to deal detail page
      router.push(notification.link || `/deals/${notification.dealId}`);
    } else if (notification.type === 'report_reviewed') {
      // Report resolution — reporter clicks through to their own
      // report history. Newer CF writes ship this via `notification.link`
      // already; the type-based fallback covers older notifications
      // that predate that fix.
      router.push(notification.link || '/my-reports');
    } else if (notification.type === 'member_report') {
      // Admin notification for a new member report.
      router.push(notification.link || '/admin/reports');
    } else if (notification.link) {
      // Navigate using the notification's link field (e.g., product_upload_request)
      router.push(notification.link);
    } else if (notification.data?.conversationId) {
      if (pathname?.startsWith('/messages')) {
        // Already on /messages — select conversation inline via query param
        router.push(`/messages?conversation=${notification.data.conversationId}`);
      } else {
        // On another page — open the FAB widget with this conversation
        openConversation(notification.data.conversationId);
      }
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
      case 'deal':
        return <Handshake className="w-4 h-4" />;
      case 'legal':
        return <Scale className="w-4 h-4" />;
      case 'verify_email':
        return <Mail className="w-4 h-4" />;
      case 'payment_required':
        return <DollarSign className="w-4 h-4" />;
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
      case 'deal':
        return 'deal-icon';
      case 'legal':
        return 'deal-icon';
      case 'verify_email':
        return 'quote-icon';
      default:
        return '';
    }
  };

  // Recent notifications — pin every payment reminder to the top so
  // it never slides off the fold once the inbox grows. Real Firestore
  // notifications fill the remaining slots.
  const recentNotifications = [
    ...virtualPaymentNotifications,
    ...notifications.slice(0, Math.max(0, 10 - virtualPaymentNotifications.length)),
  ];
  const totalUnreadCount = unreadNotificationCount + virtualPaymentNotifications.length;

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
        {totalUnreadCount > 0 && (
          <span className="notification-badge">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
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
                      <span className={`notification-unread-dot ${notification.type === 'quote_accepted' ? 'accepted' : notification.type === 'quote_rejected' ? 'rejected' : notification.type === 'new_user_approval' ? 'approval' : notification.type === 'deal' ? 'deal' : ''}`} />
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
              <Link
                href="/notifications"
                className="notification-view-all"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
          {notifications.length === 0 && (
            <div className="notification-footer">
              <Link
                href="/notifications"
                className="notification-view-all"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
