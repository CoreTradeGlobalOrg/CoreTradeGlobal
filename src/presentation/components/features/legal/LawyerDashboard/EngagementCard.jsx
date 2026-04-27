/**
 * EngagementCard Component
 *
 * Displays a single legal engagement in the lawyer dashboard.
 * Shows client name, deal product, status badge, and time since creation.
 * Actions vary by status:
 *   - Pending: Accept + Decline buttons
 *   - Active: "Open Channel" link
 *   - Completed: "View Channel" link (grayed)
 */

'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { User, Package, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
    [ENGAGEMENT_STATUS.PENDING]: {
      label: 'Pending',
      className: 'bg-amber-500/20 border border-amber-500/40 text-amber-400',
    },
    [ENGAGEMENT_STATUS.ACTIVE]: {
      label: 'Active',
      className: 'bg-green-500/20 border border-green-500/40 text-green-400',
    },
    [ENGAGEMENT_STATUS.COMPLETED]: {
      label: 'Completed',
      className: 'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-[#8899AA]',
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EngagementCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EngagementCard
 *
 * @param {Object} props
 * @param {import('@/domain/entities/LegalEngagement').LegalEngagement} props.engagement
 * @param {(engagementId: string) => Promise<void>} [props.onAccept] - Called when Accept is clicked (pending only)
 * @param {(engagementId: string) => Promise<void>} [props.onDecline] - Called when Decline is clicked (pending only)
 * @param {boolean} [props.actionLoading] - Whether an action is in progress
 */
export function EngagementCard({ engagement, onAccept, onDecline, actionLoading }) {
  const isPending = engagement.status === ENGAGEMENT_STATUS.PENDING;
  const isActive = engagement.status === ENGAGEMENT_STATUS.ACTIVE;
  const isCompleted = engagement.status === ENGAGEMENT_STATUS.COMPLETED;

  const createdAt = engagement.createdAt
    ? formatDistanceToNow(new Date(engagement.createdAt), { addSuffix: true })
    : null;

  return (
    <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3">

      {/* Header: client + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-[#8899AA]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {engagement.clientDisplayName || 'Client'}
            </p>
            {createdAt && (
              <p className="text-xs text-[#8899AA]">{createdAt}</p>
            )}
          </div>
        </div>
        <StatusBadge status={engagement.status} />
      </div>

      {/* Deal product */}
      {engagement.dealProductName && (
        <div className="flex items-center gap-2 text-xs text-[#8899AA]">
          <Package size={12} className="flex-shrink-0" />
          <span className="truncate">{engagement.dealProductName}</span>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onAccept?.(engagement.id)}
            disabled={actionLoading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          >
            <CheckCircle size={13} />
            Accept
          </button>
          <button
            onClick={() => onDecline?.(engagement.id)}
            disabled={actionLoading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          >
            <XCircle size={13} />
            Decline
          </button>
        </div>
      )}

      {isActive && (
        <Link
          href={`/deals/${engagement.dealId}/legal`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20 text-xs font-semibold transition-colors"
        >
          <ExternalLink size={13} />
          Open Channel
        </Link>
      )}

      {isCompleted && (
        <Link
          href={`/deals/${engagement.dealId}/legal`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#8899AA] hover:text-white text-xs font-semibold transition-colors"
        >
          <ExternalLink size={13} />
          View Channel
        </Link>
      )}

    </div>
  );
}

export default EngagementCard;
