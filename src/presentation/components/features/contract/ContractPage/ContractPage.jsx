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
 */

'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

import { CLAUSE_SECTIONS } from '@/core/constants/contractConstants';
import { ContractHeader } from '../ContractHeader/ContractHeader';
import { ApprovalProgressBar } from '../ApprovalProgressBar/ApprovalProgressBar';
import { ClauseAccordion } from '../ClauseAccordion/ClauseAccordion';
import { ContractSidebar } from '../ContractSidebar/ContractSidebar';
import { GeneratingContractOverlay } from '../GeneratingContractOverlay/GeneratingContractOverlay';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';

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

function CompletionBanner() {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 px-4 py-4">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle size={16} className="text-emerald-400" />
        <p className="text-sm font-semibold text-emerald-400">
          Contract Approved — Both parties have approved all clauses
        </p>
      </div>
      <p className="text-xs text-[#8899AA] mb-3">
        The contract is now fully executed. Insurance and logistics quotes are the next step.
      </p>
      <div className="flex items-center gap-1.5 text-xs text-[#8899AA]">
        <ArrowRight size={12} />
        <span>Insurance &amp; Logistics Quotes — Coming in Phase 4</span>
      </div>
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

  // Group clauses by section (ordered by CLAUSE_SECTIONS)
  const grouped = contract.getClausesBySection();

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[120px] pb-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Context header */}
        <ContractHeader deal={deal} contract={contract} />

        {/* Approval progress bars */}
        <ApprovalProgressBar
          contract={contract}
          currentUserUid={currentUserUid}
          deal={deal}
          isBuyer={isBuyer}
        />

        {/* Completion banner */}
        {isFullyApproved && <CompletionBanner />}

        {/* One-party waiting banner */}
        {!isFullyApproved && hasISubmitted && !hasOtherSubmitted && (
          <WaitingBanner otherPartyLabel={otherPartyLabel} />
        )}

        {/* Main content + sticky sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Main column — clause accordions */}
          <div className="flex-1 min-w-0 space-y-3">
            {CLAUSE_SECTIONS.map((section) => {
              const sectionClauses = grouped[section.id] || [];
              if (sectionClauses.length === 0) return null;

              const isExpanded = actions.expandedSections?.has(section.id) ?? false;
              const hasEverExpanded = actions.hasExpanded?.has(section.id) ?? false;

              return (
                <ClauseAccordion
                  key={section.id}
                  section={section}
                  clauses={sectionClauses}
                  myApproval={myApproval}
                  otherApproval={otherApproval}
                  otherPartyLabel={otherPartyLabel}
                  isReadOnly={hasISubmitted}
                  onClauseToggle={actions.toggleClause}
                  onSectionToggle={actions.toggleSection}
                  isExpanded={isExpanded}
                  hasEverExpanded={hasEverExpanded}
                  isClauseApproved={actions.isClauseApproved}
                  isBuyer={isBuyer}
                />
              );
            })}

            {/* Submit button — hidden after submission */}
            {!hasISubmitted && !isFullyApproved && (
              <SubmitApprovalsButton
                contract={contract}
                localApprovedClauses={actions.localApprovedClauses}
                onSubmit={actions.submitApprovals}
                loading={actions.loading}
              />
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
