/**
 * NotificationCenterItem Component
 *
 * Single notification row in the notification center.
 * Shows checkbox, type icon, title, body snippet, timestamp, unread dot.
 */

'use client';

import {
  Bell,
  MessageSquare,
  FileText,
  CheckCircle,
  XCircle,
  UserPlus,
  Handshake,
  Scale,
  Megaphone,
  Package,
} from 'lucide-react';

// Type-specific icon mapping (mirrors NotificationBell)
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
    case 'announcement':
      return <Megaphone className="w-4 h-4" />;
    case 'rfq_created':
      return <Package className="w-4 h-4" />;
    case 'message':
    case 'new_message':
    case 'conversation_created':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

// Type-specific icon colors
const getIconStyle = (type) => {
  switch (type) {
    case 'quote_received':
      return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
    case 'quote_accepted':
      return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' };
    case 'quote_rejected':
      return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    case 'new_user_approval':
      return { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' };
    case 'deal':
    case 'legal':
      return { bg: 'rgba(255,215,0,0.15)', color: '#FFD700' };
    default:
      return { bg: 'rgba(255,215,0,0.1)', color: '#FFD700' };
  }
};

// Unread dot color
const getDotColor = (type) => {
  switch (type) {
    case 'quote_accepted':
      return '#10b981';
    case 'quote_rejected':
      return '#ef4444';
    case 'new_user_approval':
      return '#a855f7';
    default:
      return '#FFD700';
  }
};

const formatTime = (date) => {
  if (!date) return '';

  let msgDate;
  if (date?.toDate && typeof date.toDate === 'function') {
    msgDate = date.toDate();
  } else if (date instanceof Date) {
    msgDate = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    msgDate = new Date(date);
  } else if (date?.seconds) {
    msgDate = new Date(date.seconds * 1000);
  } else {
    return '';
  }

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

export function NotificationCenterItem({
  notification,
  isSelected,
  onToggleSelect,
  onNotificationClick,
}) {
  const iconStyle = getIconStyle(notification.type);
  const isUnread = !notification.isRead;

  const handleRowClick = (e) => {
    // Don't trigger row click when clicking checkbox
    if (e.target.type === 'checkbox') return;
    onNotificationClick(notification);
  };

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[rgba(255,255,255,0.04)]',
        isUnread
          ? 'bg-[rgba(255,215,0,0.04)] hover:bg-[rgba(255,215,0,0.07)]'
          : 'hover:bg-[rgba(255,255,255,0.03)]',
        isSelected ? 'bg-[rgba(255,215,0,0.08)]' : '',
      ].join(' ')}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 pt-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(notification.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-[#FFD700] cursor-pointer"
        />
      </div>

      {/* Icon */}
      <div
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-[10px]"
        style={{ background: iconStyle.bg, color: iconStyle.color }}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-sm mb-0.5 truncate',
            isUnread ? 'font-semibold text-white' : 'font-normal text-[rgba(255,255,255,0.6)]',
          ].join(' ')}
        >
          {notification.title}
        </p>
        <p
          className={[
            'text-xs line-clamp-2',
            isUnread ? 'text-[#a0a0a0]' : 'text-[rgba(160,160,160,0.5)]',
          ].join(' ')}
        >
          {notification.body}
        </p>
        <span className="text-xs text-[#64748b] mt-0.5 block">
          {formatTime(notification.createdAt)}
        </span>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div
          className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
          style={{ background: getDotColor(notification.type) }}
        />
      )}
    </div>
  );
}

export default NotificationCenterItem;
