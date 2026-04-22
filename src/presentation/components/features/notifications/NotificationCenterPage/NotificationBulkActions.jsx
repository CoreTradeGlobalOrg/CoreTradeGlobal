/**
 * NotificationBulkActions Component
 *
 * Sticky action bar with mark-all-read, delete-all, and batch selected operations.
 */

'use client';

import { Check, Trash2, CheckCheck } from 'lucide-react';

export function NotificationBulkActions({
  selectedCount,
  onMarkAllRead,
  onDeleteAll,
  onMarkSelectedRead,
  onDeleteSelected,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
      {/* Always-visible global actions */}
      <button
        onClick={onMarkAllRead}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#FFD700] bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] rounded-lg hover:bg-[rgba(255,215,0,0.15)] transition-colors"
      >
        <CheckCheck className="w-3.5 h-3.5" />
        Mark all as read
      </button>

      <button
        onClick={onDeleteAll}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#94a3b8] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(239,68,68,0.12)] hover:text-[#f87171] hover:border-[rgba(239,68,68,0.3)] transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete all
      </button>

      {/* Batch actions shown only when items selected */}
      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-[rgba(255,255,255,0.1)]" />

          <button
            onClick={onMarkSelectedRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] rounded-lg hover:bg-[rgba(255,255,255,0.12)] transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Mark selected as read ({selectedCount})
          </button>

          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#f87171] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg hover:bg-[rgba(239,68,68,0.15)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete selected ({selectedCount})
          </button>
        </>
      )}
    </div>
  );
}

export default NotificationBulkActions;
