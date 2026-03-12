/**
 * LawyerDeals Component
 *
 * Displays engaged deals from the lawyer's perspective — deal-centric rather than channel-centric.
 * Shows active and completed engagements only (pending are not yet confirmed).
 * Each card shows deal product, client name, engagement status, and time.
 * Active engagements show "Open Channel" link, completed show grayed "View Channel" link.
 */

'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Package, User, ExternalLink, Briefcase } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLegalEngagements } from '@/presentation/hooks/legal/useLegalEngagements';
import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
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

function DealsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)]" />
              <div className="space-y-1">
                <div className="h-3 w-36 bg-[rgba(255,255,255,0.06)] rounded" />
                <div className="h-2 w-24 bg-[rgba(255,255,255,0.04)] rounded" />
              </div>
            </div>
            <div className="h-5 w-16 bg-[rgba(255,255,255,0.06)] rounded-full" />
          </div>
          <div className="h-2 w-32 bg-[rgba(255,255,255,0.04)] rounded" />
          <div className="h-7 w-28 bg-[rgba(255,255,255,0.06)] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Card
// ─────────────────────────────────────────────────────────────────────────────

function DealCard({ engagement }) {
  const isActive = engagement.status === ENGAGEMENT_STATUS.ACTIVE;

  const engagedAgo = formatDistanceToNow(
    new Date(engagement.createdAt),
    { addSuffix: true }
  );

  return (
    <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3">

      {/* Header: deal product + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center flex-shrink-0">
            <Package size={14} className="text-[#8899AA]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {engagement.dealProductName || 'Deal'}
            </p>
            <p className="text-xs text-[#8899AA]">Engaged {engagedAgo}</p>
          </div>
        </div>
        <StatusBadge status={engagement.status} />
      </div>

      {/* Client name */}
      <div className="flex items-center gap-2 text-xs text-[#8899AA]">
        <User size={12} className="flex-shrink-0" />
        <span className="truncate">{engagement.clientDisplayName || 'Client'}</span>
      </div>

      {/* Action */}
      <Link
        href={`/deals/${engagement.dealId}/legal`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          isActive
            ? 'bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20'
            : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#8899AA] hover:text-white'
        }`}
      >
        <ExternalLink size={13} />
        {isActive ? 'Open Channel' : 'View Channel'}
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LawyerDeals
// ─────────────────────────────────────────────────────────────────────────────

export function LawyerDeals() {
  const { user } = useAuth();
  const { activeEngagements, completedEngagements, loading } = useLegalEngagements(user?.uid);

  // Combine active and completed (exclude pending — not yet confirmed)
  const confirmedEngagements = [...activeEngagements, ...completedEngagements].sort((a, b) => {
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
            <Briefcase size={20} className="text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Deal Review</h1>
            <p className="text-sm text-[#8899AA]">Review deals you are consulting on</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <DealsSkeleton />
        ) : confirmedEngagements.length === 0 ? (
          <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-8 text-center">
            <Briefcase size={32} className="text-[#8899AA] mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No deals to review</p>
            <p className="text-sm text-[#8899AA]">
              Deals appear here once you accept a client engagement.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {confirmedEngagements.map((engagement) => (
              <DealCard key={engagement.id} engagement={engagement} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LawyerDeals;
