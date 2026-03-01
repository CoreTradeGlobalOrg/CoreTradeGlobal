/**
 * ApprovalProgressBar Component
 *
 * Displays approval progress for both parties side-by-side.
 * Each bar shows: party label, X/Y count, yellow fill proportional to progress,
 * and a "Submitted" badge when the party has submitted final approvals.
 *
 * Uses contract.getMyProgress() and contract.getOtherProgress() for counts.
 */

'use client';

import { CheckCircle } from 'lucide-react';

/**
 * Single progress bar for one party.
 */
function PartyProgressBar({ label, approved, total, hasSubmitted }) {
  const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="flex-1 min-w-0">
      {/* Label + count row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{label}</span>
          {hasSubmitted && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FFD700]/15 border border-[#FFD700]/30 rounded text-[10px] font-semibold text-[#FFD700]">
              <CheckCircle size={9} />
              Submitted
            </span>
          )}
        </div>
        <span className="text-xs text-[#8899AA]">
          {approved} / {total} clauses
        </span>
      </div>

      {/* Progress bar track */}
      <div className="h-2 bg-[#1A283B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: '#FFD700',
          }}
        />
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {import('@/domain/entities/Contract').Contract} props.contract
 * @param {string} props.currentUserUid
 * @param {Object} props.deal
 * @param {boolean} props.isBuyer
 */
export function ApprovalProgressBar({ contract, currentUserUid, deal, isBuyer }) {
  if (!contract) return null;

  const myProgress = contract.getMyProgress(currentUserUid, deal);
  const otherProgress = contract.getOtherProgress(currentUserUid, deal);
  const myApproval = contract.getMyApproval(currentUserUid, deal);
  const otherApproval = contract.getOtherApproval(currentUserUid, deal);
  const otherLabel = isBuyer ? 'Seller' : 'Buyer';

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <p className="text-xs font-semibold text-[#8899AA] mb-3 uppercase tracking-wide">
        Approval Progress
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <PartyProgressBar
          label="You"
          approved={myProgress.approved}
          total={myProgress.total}
          hasSubmitted={myApproval.hasSubmitted}
        />
        <div className="hidden sm:block w-px bg-white/5 self-stretch" />
        <PartyProgressBar
          label={otherLabel}
          approved={otherProgress.approved}
          total={otherProgress.total}
          hasSubmitted={otherApproval.hasSubmitted}
        />
      </div>
    </div>
  );
}

export default ApprovalProgressBar;
