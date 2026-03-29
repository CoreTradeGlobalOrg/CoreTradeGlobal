/**
 * LegalConsultingSection
 *
 * Shows legal counsel info for the current user only.
 *
 * CRITICAL PRIVACY: Only displays the engagement where
 * engagement.clientId === currentUserUid. This is enforced at the data
 * layer (subscribeToEngagementForDeal filters by clientId) AND visually here.
 * Never show opposing party's lawyer information.
 */

'use client';

import { Scale, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function engagementStatusBadge(status) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-400">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#8899AA]">
          <CheckCircle2 size={10} /> Completed
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-400">
          <Clock size={10} /> Pending
        </span>
      );
    case 'declined':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400">
          <XCircle size={10} /> Declined
        </span>
      );
    default:
      return (
        <span className="text-[10px] text-[#8899AA] capitalize">{status || 'Unknown'}</span>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LegalConsultingSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   legalEngagement: import('@/domain/entities/LegalEngagement').LegalEngagement|null,
 *   currentUserUid: string,
 *   dealId: string,
 * }} props
 */
export function LegalConsultingSection({ legalEngagement, currentUserUid, dealId }) {
  // Privacy guard — only show engagement belonging to current user
  // (data layer already filters this, but we add UI-level guard for safety)
  const engagement = legalEngagement?.clientId === currentUserUid ? legalEngagement : null;

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Scale size={16} className="text-[#FFD700]" />
        <h3 className="text-sm font-semibold text-white">Legal Consulting</h3>
      </div>

      {!engagement ? (
        <div className="text-center py-4">
          <Scale size={24} className="text-[#2A3B52] mx-auto mb-2" />
          <p className="text-xs text-[#8899AA]">No legal counsel engaged for this deal.</p>
          {dealId && (
            <Link
              href={`/lawyers?dealId=${dealId}`}
              className="mt-2 inline-block text-xs font-semibold text-[#FFD700] hover:text-[#FFE44D] underline transition-colors"
            >
              Find a Lawyer
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Engagement status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8899AA]">Status</span>
            {engagementStatusBadge(engagement.status)}
          </div>

          {/* Lawyer info */}
          {engagement.lawyerId && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8899AA]">Lawyer</span>
              <Link
                href={`/lawyers/${engagement.lawyerId}`}
                className="text-xs font-medium text-white hover:text-[#FFD700] transition-colors"
              >
                View Profile
              </Link>
            </div>
          )}

          {/* Number of drafts */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8899AA]">Contract Drafts</span>
            <span className="text-xs font-medium text-white">
              {engagement.draftCount ?? 0}
            </span>
          </div>

          {/* Link to legal channel */}
          <div className="pt-2 border-t border-[#2A3B52]/50">
            <Link
              href={`/deals/${dealId}/legal`}
              className="text-xs font-semibold text-[#FFD700] hover:text-[#FFE44D] underline transition-colors"
            >
              Open Legal Channel &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalConsultingSection;
