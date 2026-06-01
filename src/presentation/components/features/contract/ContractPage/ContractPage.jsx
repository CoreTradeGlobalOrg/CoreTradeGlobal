/**
 * ContractPage Component
 *
 * Main layout for the contract review and approval flow.
 * Orchestrates: header, progress bar, clause accordions, sidebar, and submit button.
 *
 * Guards:
 *   - If contract is null (still generating): shows GeneratingContractOverlay
 *   - If contract is fully approved: shows completion banner
 *   - If current user has submitted: shows waiting banner + read-only view
 *
 * Layout: two-column (clauses + sticky sidebar) on lg+, single column on mobile.
 *
 * Progress: ClauseProgressBar rendered at top (above clause list) and in a sticky
 * bottom bar (below clause list, above the submit button).
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';

import { CLAUSE_SECTIONS } from '@/core/constants/contractConstants';
import { ContractHeader } from '../ContractHeader/ContractHeader';
import { ApprovalProgressBar } from '../ApprovalProgressBar/ApprovalProgressBar';
import { ClauseAccordion } from '../ClauseAccordion/ClauseAccordion';
import { ContractSidebar } from '../ContractSidebar/ContractSidebar';
import { GeneratingContractOverlay } from '../GeneratingContractOverlay/GeneratingContractOverlay';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';
import { LegalBanner } from '@/presentation/components/features/legal/LegalBanner/LegalBanner';
import { Tooltip } from '@/presentation/components/common/Tooltip/Tooltip';

// ─────────────────────────────────────────────────────────────────────────────
// ClauseProgressBar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shows "X of Y clauses accepted" with a gold progress bar fill.
 * @param {{ approved: number, total: number }} props
 */
function ClauseProgressBar({ approved, total }) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[#8899AA]">
          {approved} of {total} clauses accepted
        </span>
        <span className="text-xs font-semibold text-[#FFD700]">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#2A3B52] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#FFD700] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit Approvals Button
// ─────────────────────────────────────────────────────────────────────────────

function SubmitApprovalsButton({ contract, localApprovedClauses, onSubmit, loading }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const totalClauses = contract?.clauses?.length ?? 0;
  const approvedCount = localApprovedClauses?.size ?? 0;
  const allApproved = approvedCount === totalClauses && totalClauses > 0;
  const remaining = totalClauses - approvedCount;

  return (
    <div className="print-hide">
      <button
        type="button"
        disabled={!allApproved || loading}
        onClick={() => setConfirmOpen(true)}
        className={[
          'w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all',
          allApproved && !loading
            ? 'bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] cursor-pointer'
            : 'bg-white/5 text-[#8899AA] cursor-not-allowed border border-white/10',
        ].join(' ')}
      >
        {allApproved
          ? 'Submit All Approvals'
          : `Approve ${remaining} more clause${remaining !== 1 ? 's' : ''} to submit`}
      </button>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await onSubmit();
        }}
        title="Submit Contract Approvals"
        message={`You are about to submit your approval for all ${totalClauses} contract clauses. This action cannot be undone.`}
        confirmText="Submit All Approvals"
        cancelText="Cancel"
        variant="success"
        loading={loading}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Waiting Banner
// ─────────────────────────────────────────────────────────────────────────────

function WaitingBanner({ otherPartyLabel }) {
  return (
    <div className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3">
      <p className="text-sm font-semibold text-[#FFD700]">Your approvals submitted</p>
      <p className="text-xs text-[#8899AA] mt-0.5">
        Waiting for {otherPartyLabel} to review and approve all clauses.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion Banner
// ─────────────────────────────────────────────────────────────────────────────

function CompletionBanner({ dealId }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Navigate when countdown reaches 0 (outside of setState to avoid React warning)
  useEffect(() => {
    if (countdown <= 0) {
      router.push(`/deals/${dealId}/quotes`);
    }
  }, [countdown, dealId, router]);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 px-4 py-4">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle size={16} className="text-emerald-400" />
        <p className="text-sm font-semibold text-emerald-400">
          Contract Approved — Both parties have approved all clauses
        </p>
      </div>
      <p className="text-xs text-[#8899AA] mb-3">
        The contract is now fully executed. Redirecting to quotes in {countdown}s...
      </p>
      <Link
        href={`/deals/${dealId}/quotes`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline transition-colors"
      >
        <ArrowRight size={12} />
        Compare Insurance &amp; Logistics Quotes
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContractPage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Contract').Contract|null} props.contract
 * @param {string} props.currentUserUid
 * @param {Object} props.actions - From useContractActions hook
 */
export function ContractPage({ deal, contract, currentUserUid, actions }) {
  if (!deal) return null;

  // Determine role
  const isBuyer = deal.buyerId === currentUserUid;
  const otherPartyLabel = isBuyer ? 'Seller' : 'Buyer';

  // Contract still generating
  if (!contract) {
    return <GeneratingContractOverlay />;
  }

  // Approval state
  const myApproval = contract.getMyApproval(currentUserUid, deal);
  const otherApproval = contract.getOtherApproval(currentUserUid, deal);
  const hasISubmitted = myApproval?.hasSubmitted ?? false;
  const hasOtherSubmitted = otherApproval?.hasSubmitted ?? false;
  const isFullyApproved = contract.isFullyApproved();

  // Progress data for ClauseProgressBar
  const approvedCount = actions.localApprovedClauses?.size ?? 0;
  const totalClauses = contract?.clauses?.length ?? 0;

  // Group clauses by section (ordered by CLAUSE_SECTIONS)
  const grouped = contract.getClausesBySection();

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[calc(var(--navbar-height)+24px)] pb-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Context header */}
        <ContractHeader deal={deal} contract={contract} />

        {/* Approval progress bars (per-party submission progress) */}
        <ApprovalProgressBar
          contract={contract}
          currentUserUid={currentUserUid}
          deal={deal}
          isBuyer={isBuyer}
        />

        {/* Completion banner */}
        {isFullyApproved && <CompletionBanner dealId={deal.id} />}

        {/* One-party waiting banner */}
        {!isFullyApproved && hasISubmitted && !hasOtherSubmitted && (
          <WaitingBanner otherPartyLabel={otherPartyLabel} />
        )}

        {/* Legal banner */}
        <LegalBanner dealId={deal.id} currentUserUid={currentUserUid} />

        {/* Main content + sticky sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Main column — clause sections (always expanded) */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Contract Clauses header */}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Contract Clauses</h2>
              <Tooltip content="Each clause must be reviewed and accepted individually by both parties. The deal cannot advance until all clauses are approved." />
            </div>

            {/* Top clause progress bar */}
            {!isFullyApproved && (
              <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl px-4 py-3">
                <ClauseProgressBar approved={approvedCount} total={totalClauses} />
              </div>
            )}

            {CLAUSE_SECTIONS.map((section) => {
              const sectionClauses = grouped[section.id] || [];
              if (sectionClauses.length === 0) return null;

              // hasEverExpanded is always true — all sections are initialized on mount
              const hasEverExpanded = actions.hasExpanded?.has(section.id) ?? true;

              return (
                <ClauseAccordion
                  key={section.id}
                  section={section}
                  clauses={sectionClauses}
                  myApproval={myApproval}
                  otherApproval={otherApproval}
                  otherPartyLabel={otherPartyLabel}
                  isReadOnly={hasISubmitted || isFullyApproved}
                  onClauseToggle={actions.toggleClause}
                  hasEverExpanded={hasEverExpanded}
                  isClauseApproved={actions.isClauseApproved}
                  isBuyer={isBuyer}
                />
              );
            })}

            {/* Sticky bottom bar: progress + submit button */}
            {!hasISubmitted && !isFullyApproved && (
              <div className="sticky bottom-4 z-10">
                <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-3 shadow-lg shadow-black/40">
                  <div className="mb-3">
                    <ClauseProgressBar approved={approvedCount} total={totalClauses} />
                  </div>
                  <SubmitApprovalsButton
                    contract={contract}
                    localApprovedClauses={actions.localApprovedClauses}
                    onSubmit={actions.submitApprovals}
                    loading={actions.loading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky sidebar */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <ContractSidebar
              deal={deal}
              contract={contract}
              isBuyer={isBuyer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractPage;
