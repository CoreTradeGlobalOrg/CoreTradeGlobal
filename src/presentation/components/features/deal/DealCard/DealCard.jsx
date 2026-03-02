/**
 * DealCard Component
 *
 * Shows summary information for a single deal on the My Deals list page.
 * Clicking navigates to /deals/[dealId].
 *
 * Props:
 *   deal    {Deal}   - Deal entity from DealRepository
 *   currentUserId {string} - UID of the authenticated user (to show turn indicator)
 */

'use client';

import { useRouter } from 'next/navigation';
import { Package, Clock, ArrowRight } from 'lucide-react';
import { DEAL_STATUS } from '@/core/constants/dealConstants';

// Status badge config
const STATUS_CONFIG = {
  [DEAL_STATUS.NEGOTIATING]: {
    label: 'Negotiating',
    className: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.3)]',
  },
  [DEAL_STATUS.ACCEPTED]: {
    label: 'Accepted',
    className: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border-[rgba(59,130,246,0.3)]',
  },
  [DEAL_STATUS.REJECTED]: {
    label: 'Rejected',
    className: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]',
  },
  [DEAL_STATUS.EXPIRED]: {
    label: 'Expired',
    className: 'bg-[rgba(100,116,139,0.15)] text-[#64748b] border-[rgba(100,116,139,0.3)]',
  },
  [DEAL_STATUS.WITHDRAWN]: {
    label: 'Withdrawn',
    className: 'bg-[rgba(100,116,139,0.15)] text-[#64748b] border-[rgba(100,116,139,0.3)]',
  },
  [DEAL_STATUS.CONTRACT_APPROVED]: {
    label: 'Contract Approved',
    className: 'bg-[rgba(255,215,0,0.15)] text-[#FFD700] border-[rgba(255,215,0,0.3)]',
  },
  [DEAL_STATUS.PROVIDERS_SELECTED]: {
    label: 'Providers Selected',
    className: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border-[rgba(59,130,246,0.3)]',
  },
};

function formatRelativeTime(date) {
  if (!date) return '';
  const now = Date.now();
  const diff = now - (date instanceof Date ? date.getTime() : date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function DealCard({ deal, currentUserId }) {
  const router = useRouter();

  const statusConfig = STATUS_CONFIG[deal.status] || STATUS_CONFIG[DEAL_STATUS.EXPIRED];
  const isMyTurn = deal.isCurrentTurn?.(currentUserId) ?? false;
  const snapshot = deal.latestOfferSnapshot;

  // Determine the other party label
  const isBuyer = deal.isBuyer?.(currentUserId);
  const otherRole = isBuyer ? 'Seller' : 'Buyer';

  const handleClick = () => {
    router.push(`/deals/${deal.id}`);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`Deal for ${deal.productName}`}
      className="
        group cursor-pointer
        bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]
        border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,215,0,0.2)]
        rounded-2xl p-4 transition-all duration-200
        flex flex-col gap-3
      "
    >
      {/* ── Top Row: Product + Status ── */}
      <div className="flex items-start gap-3">
        {/* Product image / icon */}
        {deal.productImage ? (
          <img
            src={deal.productImage}
            alt={deal.productName}
            className="w-12 h-12 rounded-xl object-cover border border-[rgba(255,255,255,0.1)] flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.15)] flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-[#FFD700]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{deal.productName}</p>
          <p className="text-[#64748b] text-xs mt-0.5">
            {isBuyer ? 'Buying from' : 'Selling to'}{' '}
            <span className="text-[#94a3b8]">{otherRole}</span>
            {' · '}
            Round {deal.round}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* ── Offer Summary ── */}
      {snapshot && (
        <div className="px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">
              {snapshot.currency}{' '}
              {(snapshot.price * snapshot.quantity).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[#64748b] text-xs">
              {snapshot.price} × {snapshot.quantity} {snapshot.unit || ''}
              {snapshot.incoterm && (
                <span className="ml-2 text-[#94a3b8]">{snapshot.incoterm}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ── Bottom Row: Turn indicator + Timestamp ── */}
      <div className="flex items-center justify-between">
        {/* Turn indicator */}
        {deal.status === DEAL_STATUS.NEGOTIATING ? (
          isMyTurn ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Your turn
            </span>
          ) : (
            <span className="text-xs text-[#64748b]">
              Waiting for {otherRole}...
            </span>
          )
        ) : (
          <span className="text-xs text-[#64748b]">
            {statusConfig.label}
          </span>
        )}

        <div className="flex items-center gap-2 text-[#64748b]">
          <span className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(deal.updatedAt)}
          </span>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#FFD700]" />
        </div>
      </div>
    </div>
  );
}

export default DealCard;
