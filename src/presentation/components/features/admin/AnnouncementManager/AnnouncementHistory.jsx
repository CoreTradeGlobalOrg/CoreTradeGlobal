'use client';

/**
 * AnnouncementHistory
 *
 * Shows a list of all announcements from the admin's `announcements` Firestore collection,
 * ordered by createdAt descending. Displays title, audience, channels, status, and timestamps.
 */

import { Bell, Smartphone, Mail } from 'lucide-react';

const AUDIENCE_LABELS = {
  all: 'All Users',
  member: 'Members',
  logistics_provider: 'Logistics Providers',
  insurance_provider: 'Insurance Providers',
  lawyer: 'Lawyers',
};

const STATUS_STYLES = {
  sent: 'bg-green-900/30 text-green-400 border-green-700/30',
  pending: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
  sending: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
  failed: 'bg-red-900/30 text-red-400 border-red-700/30',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnnouncementHistory({ announcements, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-[rgba(255,255,255,0.04)] rounded-xl animate-pulse border border-[rgba(255,255,255,0.06)]"
          />
        ))}
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-10 h-10 text-[#333] mx-auto mb-3" />
        <p className="text-[#5a5a5a] text-sm">No announcements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((item) => {
        const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
        const displayTime =
          item.status === 'sent' ? item.sentAt : item.scheduledFor || item.createdAt;
        const timeLabel = item.status === 'sent' ? 'Sent' : item.scheduledFor ? 'Scheduled' : 'Created';

        return (
          <div
            key={item.id}
            className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            {/* Left: content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1.5">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${statusStyle}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-[#A0A0A0] line-clamp-2 mb-2">{item.body}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a5a5a]">
                {/* Audience */}
                <span className="bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-md">
                  {AUDIENCE_LABELS[item.audience] || item.audience}
                </span>

                {/* Channel icons */}
                <span className="flex items-center gap-1.5">
                  {item.channels?.inApp && (
                    <Bell className="w-3.5 h-3.5 text-[#FFD700]" title="In-app" />
                  )}
                  {item.channels?.push && (
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" title="Push" />
                  )}
                  {item.channels?.email && (
                    <Mail className="w-3.5 h-3.5 text-green-400" title="Email" />
                  )}
                </span>

                {/* Recipient count */}
                {item.recipientCount != null && (
                  <span>{item.recipientCount} recipient{item.recipientCount !== 1 ? 's' : ''}</span>
                )}

                {/* Timestamp */}
                <span className="ml-auto sm:ml-0">
                  {timeLabel}: {formatTimestamp(displayTime)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
