/**
 * NotificationCenterPage Component
 *
 * Full-page notification center with filter tabs, infinite scroll, and bulk actions.
 * Uses real-time notifications from MessagesContext (page 1) and cursor-based
 * pagination for older notifications (historyNotifications).
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { NotificationFilterTabs } from './NotificationFilterTabs';
import { NotificationCenterItem } from './NotificationCenterItem';
import { NotificationBulkActions } from './NotificationBulkActions';

// Notification type-to-tab mapping
const TYPE_TO_TAB = {
  deal: 'deals',
  legal: 'legal',
  message: 'messages',
  new_message: 'messages',
  conversation_created: 'messages',
  quote: 'providers',
  quote_received: 'providers',
  quote_accepted: 'providers',
  quote_rejected: 'providers',
  system: 'system',
  admin: 'system',
  new_user_approval: 'system',
  announcement: 'system',
  rfq_created: 'system',
};

const HISTORY_PAGE_SIZE = 30;

export function NotificationCenterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { notifications: realtimeNotifications } = useMessages();
  const notificationRepository = container.getNotificationRepository();

  // Pagination state
  const [historyNotifications, setHistoryNotifications] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  // Filter + selection state
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState(new Set());

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);

  // Combine real-time + paginated history, deduplicating by ID
  const allNotifications = useCallback(() => {
    const combined = [...realtimeNotifications];
    const existingIds = new Set(realtimeNotifications.map((n) => n.id));

    for (const n of historyNotifications) {
      if (!existingIds.has(n.id)) {
        combined.push(n);
        existingIds.add(n.id);
      }
    }

    return combined;
  }, [realtimeNotifications, historyNotifications]);

  // Filter notifications by active tab
  const filteredNotifications = useCallback(() => {
    const all = allNotifications();
    if (activeTab === 'all') return all;
    return all.filter((n) => TYPE_TO_TAB[n.type] === activeTab);
  }, [allNotifications, activeTab]);

  // Load more older notifications via cursor pagination
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !user?.uid) return;

    setIsLoadingMore(true);
    try {
      // Use last doc snapshot as cursor, or null for first page
      const results = await notificationRepository.getByUserIdAfter(
        user.uid,
        lastDocRef.current,
        HISTORY_PAGE_SIZE
      );

      if (results.length < HISTORY_PAGE_SIZE) {
        setHasMore(false);
      }

      if (results.length > 0) {
        // Store the last document snapshot for next cursor
        const lastResult = results[results.length - 1];
        lastDocRef.current = lastResult._snapshot || null;

        setHistoryNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newOnes = results.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newOnes];
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more notifications:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, user?.uid, notificationRepository]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  // Handle notification click: mark as read, navigate
  const handleNotificationClick = useCallback(
    async (notification) => {
      if (!notification.isRead) {
        try {
          await notificationRepository.markAsRead(user.uid, notification.id);
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
        }
      }

      // Navigate based on notification type/link
      if (notification.link) {
        router.push(notification.link);
      } else if (notification.type === 'new_user_approval' && notification.data?.userId) {
        router.push('/admin?tab=users');
      } else if (notification.type === 'quote_received' && notification.data?.requestId) {
        router.push(`/request/${notification.data.requestId}#quotes`);
      } else if (
        (notification.type === 'quote_accepted' || notification.type === 'quote_rejected') &&
        notification.data?.requestId
      ) {
        router.push(`/request/${notification.data.requestId}`);
      } else if (notification.type === 'legal' && notification.dealId) {
        router.push(`/deals/${notification.dealId}/legal`);
      } else if (notification.type === 'deal' && notification.dealId) {
        router.push(`/deals/${notification.dealId}`);
      } else if (notification.data?.conversationId) {
        // If already on /messages, use query param to select conversation inline.
        // Otherwise, navigate to /messages and let the page handle selection.
        if (pathname?.startsWith('/messages')) {
          router.push(`/messages?conversation=${notification.data.conversationId}`);
        } else {
          router.push('/messages');
        }
      }
    },
    [user?.uid, notificationRepository, router, pathname]
  );

  // Toggle selection for a single notification
  const handleToggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Bulk actions
  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationRepository.markAllAsRead(user.uid);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  }, [user?.uid, notificationRepository]);

  const handleDeleteAll = useCallback(async () => {
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    try {
      await notificationRepository.deleteAllNotifications(user.uid);
      setHistoryNotifications([]);
      setSelected(new Set());
      setHasMore(false);
      toast.success('All notifications deleted');
    } catch (err) {
      toast.error('Failed to delete all notifications');
    }
  }, [user?.uid, notificationRepository]);

  const handleMarkSelectedRead = useCallback(async () => {
    if (selected.size === 0) return;
    try {
      await Promise.all(
        [...selected].map((id) => notificationRepository.markAsRead(user.uid, id))
      );
      setSelected(new Set());
      toast.success(`${selected.size} notification${selected.size > 1 ? 's' : ''} marked as read`);
    } catch (err) {
      toast.error('Failed to mark selected as read');
    }
  }, [selected, user?.uid, notificationRepository]);

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    try {
      await Promise.all(
        [...selected].map((id) => notificationRepository.deleteNotification(user.uid, id))
      );
      setHistoryNotifications((prev) => prev.filter((n) => !selected.has(n.id)));
      setSelected(new Set());
      toast.success(`${selected.size} notification${selected.size > 1 ? 's' : ''} deleted`);
    } catch (err) {
      toast.error('Failed to delete selected notifications');
    }
  }, [selected, user?.uid, notificationRepository]);

  const displayedNotifications = filteredNotifications();

  return (
    <div className="min-h-screen pt-[var(--navbar-height)] pb-20 px-6 bg-radial-navy">
      <div className="max-w-3xl mx-auto">
        {/* Page title */}
        <div className="mt-8 mb-10 text-center">
          <h1 className="text-4xl font-bold mb-3" style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Notifications</h1>
          <p className="text-[#A0A0A0]">Stay up to date with your deals, messages, and updates.</p>
        </div>

        {/* Glass card */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
          {/* Filter tabs */}
          <NotificationFilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Bulk actions */}
          <NotificationBulkActions
            selectedCount={selected.size}
            onMarkAllRead={handleMarkAllRead}
            onDeleteAll={handleDeleteAll}
            onMarkSelectedRead={handleMarkSelectedRead}
            onDeleteSelected={handleDeleteSelected}
          />

          {/* Notification list */}
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Bell className="w-12 h-12 text-[#64748b]" />
              <p className="text-[#64748b] text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {displayedNotifications.map((notification) => (
                <NotificationCenterItem
                  key={notification.id}
                  notification={notification}
                  isSelected={selected.has(notification.id)}
                  onToggleSelect={handleToggleSelect}
                  onNotificationClick={handleNotificationClick}
                />
              ))}

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="h-8 flex items-center justify-center">
                  {isLoadingMore && (
                    <div className="w-5 h-5 border-2 border-[rgba(255,215,0,0.3)] border-t-[#FFD700] rounded-full animate-spin" />
                  )}
                </div>
              )}

              {!hasMore && displayedNotifications.length > 0 && (
                <p className="text-center text-xs text-[#64748b] py-4">
                  You have seen all notifications
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationCenterPage;
