/**
 * LegalBanner Component
 *
 * Renders on DealPage at ALL deal stages for the current user.
 *
 * Two modes:
 *   1. No engagement + not dismissed: Shows promotional hire CTA card
 *   2. Active/pending/completed engagement: Shows compact status badge
 *
 * Privacy guarantee: subscribes using current user's UID as clientId only.
 * The opposing party's engagement (if any) is never queried — cross-party
 * detection is prevented by design.
 *
 * Dismiss state stored in localStorage (key: `${dealId}_legal_banner_dismissed`)
 * to prevent cross-party detection via Firestore reads.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale, Shield, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useLegalEngagement } from '@/presentation/hooks/legal/useLegalEngagement';
import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
    [ENGAGEMENT_STATUS.PENDING]: {
      label: 'Pending acceptance',
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
// Engagement Badge (active/pending/completed mode)
// ─────────────────────────────────────────────────────────────────────────────

function EngagementBadge({ engagement }) {
  const isActive = engagement.status === ENGAGEMENT_STATUS.ACTIVE;
  const isCompleted = engagement.status === ENGAGEMENT_STATUS.COMPLETED;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1A283B] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
            <Scale size={16} className="text-[#FFD700]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {engagement.lawyerDisplayName || 'Lawyer'}
            </p>
            <p className="text-xs text-[#8899AA]">Legal representation</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={engagement.status} />
          {(isActive || isCompleted) && (
            <Link
              href={`/deals/${engagement.dealId}/legal`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#FFD700] hover:text-[#FFE44D] transition-colors"
            >
              {isActive ? 'Open Channel' : 'View Channel'}
              <ExternalLink size={11} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Promotional Banner (no engagement + not dismissed)
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  'Private encrypted channel',
  'Contract drafts & review',
  'Risk analysis',
  'Expert legal guidance',
];

function PromotionalBanner({ dealId, onDismiss }) {
  return (
    <div className="rounded-xl border border-[#FFD700]/20 bg-gradient-to-r from-[#1A1800] to-[#1A283B] px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Icon + Content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Scale size={20} className="text-[#FFD700]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-white">Hire a Lawyer</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-xs font-medium">
                $200 per deal
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-1.5 text-xs text-[#8899AA]">
                  <CheckCircle size={11} className="text-[#FFD700]/70 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1.5 mt-2">
              <Shield size={12} className="text-green-400" />
              <p className="text-xs text-[#8899AA]">Verified legal professionals</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row sm:flex-col gap-2 sm:items-end flex-shrink-0">
          <Link
            href={`/lawyers?dealId=${dealId}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#FFD700] text-black text-sm font-semibold hover:bg-[#FFE44D] transition-colors"
          >
            Find a Lawyer
          </Link>
          <button
            onClick={onDismiss}
            className="text-xs text-[#8899AA] hover:text-white transition-colors py-1"
          >
            No thanks
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LegalBanner
// ─────────────────────────────────────────────────────────────────────────────

const DISMISS_KEY = (dealId) => `${dealId}_legal_banner_dismissed`;

/**
 * LegalBanner
 *
 * @param {Object} props
 * @param {string} props.dealId - Deal document ID
 * @param {string|null|undefined} props.currentUserUid - Current user's UID
 */
export function LegalBanner({ dealId, currentUserUid }) {
  const { engagement, loading } = useLegalEngagement(dealId, currentUserUid);
  const [dismissed, setDismissed] = useState(false);

  // Read dismissed state from localStorage on mount
  useEffect(() => {
    if (!dealId) return;
    const isDismissed = localStorage.getItem(DISMISS_KEY(dealId)) === 'true';
    setDismissed(isDismissed);
  }, [dealId]);

  const handleDismiss = () => {
    if (!dealId) return;
    localStorage.setItem(DISMISS_KEY(dealId), 'true');
    setDismissed(true);
  };

  // Don't render until we know the engagement state
  if (loading) return null;

  // If there's an active/pending/completed engagement, show badge
  if (engagement) {
    return <EngagementBadge engagement={engagement} />;
  }

  // If dismissed and no engagement, hide entirely
  if (dismissed) return null;

  // No engagement + not dismissed: show promotional banner
  return (
    <PromotionalBanner dealId={dealId} onDismiss={handleDismiss} />
  );
}

export default LegalBanner;
