/**
 * LawyerChannels Component
 *
 * Displays all legal engagements for the logged-in lawyer as a channel-centric list.
 * Each card shows client name, deal product, status badge, and time since last update.
 * Active/completed engagements link directly to /deals/{dealId}/legal.
 * Pending engagements indicate "Awaiting response" with a link to the dashboard to accept/decline.
 */

'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, User, Package, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLegalEngagements } from '@/presentation/hooks/legal/useLegalEngagements';
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
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function ChannelSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)]" />
              <div className="space-y-1">
                <div className="h-3 w-32 bg-[rgba(255,255,255,0.06)] rounded" />
                <div className="h-2 w-20 bg-[rgba(255,255,255,0.04)] rounded" />
              </div>
            </div>
            <div className="h-5 w-16 bg-[rgba(255,255,255,0.06)] rounded-full" />
          </div>
          <div className="h-2 w-40 bg-[rgba(255,255,255,0.04)] rounded" />
          <div className="h-7 w-28 bg-[rgba(255,255,255,0.06)] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Card
// ─────────────────────────────────────────────────────────────────────────────

function ChannelCard({ engagement }) {
  const isPending = engagement.status === ENGAGEMENT_STATUS.PENDING;
  const isActive = engagement.status === ENGAGEMENT_STATUS.ACTIVE;

  const timeAgo = formatDistanceToNow(
    new Date(engagement.updatedAt || engagement.createdAt),
    { addSuffix: true }
  );

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
            <div className="flex items-center gap-1 text-xs text-[#8899AA]">
              <Clock size={10} />
              <span>{timeAgo}</span>
            </div>
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

      {/* Action */}
      {isPending ? (
        <div className="flex items-center gap-2">
          <p className="text-xs text-amber-400">Awaiting your response</p>
          <Link
            href="/lawyer/dashboard"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <Link
          href={`/deals/${engagement.dealId}/legal`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isActive
              ? 'bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20'
              : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#8899AA] hover:text-white'
          }`}
        >
          <MessageCircle size={13} />
          {isActive ? 'Open Channel' : 'View Channel'}
          <ExternalLink size={11} />
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LawyerChannels
// ─────────────────────────────────────────────────────────────────────────────

export function LawyerChannels() {
  const { user } = useAuth();
  const { engagements, loading } = useLegalEngagements(user?.uid);

  // Sort by updatedAt desc, fallback to createdAt
  const sortedEngagements = [...engagements].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[100px] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={20} className="text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Client Channels</h1>
            <p className="text-sm text-[#8899AA]">Manage your legal consulting channels</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <ChannelSkeleton />
        ) : sortedEngagements.length === 0 ? (
          <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-8 text-center">
            <MessageCircle size={32} className="text-[#8899AA] mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No channels yet</p>
            <p className="text-sm text-[#8899AA]">
              Channels appear here once clients engage you for legal consulting.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEngagements.map((engagement) => (
              <ChannelCard key={engagement.id} engagement={engagement} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LawyerChannels;
