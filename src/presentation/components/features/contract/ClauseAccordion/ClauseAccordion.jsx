/**
 * ClauseAccordion Component
 *
 * Always-expanded section displaying contract clauses grouped by section.
 * All clauses are always visible — no accordion expand/collapse behavior.
 *
 * Visual states per clause row:
 *   - Unaccepted: yellow tint (bg-yellow-900/15) with instruction text
 *   - Accepted:   green tint (bg-green-900/10) with check icon and muted text
 *
 * Checkboxes remain active for toggling as long as:
 *   - The current user has not yet submitted final approvals
 *   - The contract is not fully approved by both parties
 *   (Both conditions are captured by the `isReadOnly` prop.)
 */

'use client';

import { Check } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Clause Row
// ─────────────────────────────────────────────────────────────────────────────

function ClauseRow({
  clause,
  isMyApproved,
  isOtherApproved,
  isCheckboxActive,
  isReadOnly,
  onToggle,
  otherPartyLabel,
}) {
  const canToggle = isCheckboxActive && !isReadOnly;

  return (
    <div
      className={[
        'flex items-start gap-3 py-3 px-3 rounded-lg border-l-2 transition-all mb-2 last:mb-0',
        isMyApproved
          ? 'bg-green-900/10 border-green-500/40'
          : 'bg-yellow-900/15 border-yellow-500/50',
      ].join(' ')}
    >
      {/* Clause info */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-sm font-medium',
            isMyApproved ? 'text-[#8899AA]' : 'text-white',
          ].join(' ')}
        >
          {isMyApproved && (
            <Check
              size={14}
              className="text-green-400 inline mr-1.5 flex-shrink-0"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          )}
          {clause.title}
        </p>
        <p
          className={[
            'text-sm mt-0.5 break-words',
            isMyApproved ? 'text-[#8899AA]' : 'text-[#8899AA]',
          ].join(' ')}
        >
          {clause.value}
        </p>
        {clause.sourceLabel && (
          <p className="text-[11px] text-[#4A5B6E] mt-1 italic">{clause.sourceLabel}</p>
        )}
        {!isMyApproved && !isReadOnly && (
          <p className="text-xs text-yellow-500/80 mt-1">
            Please review and accept this clause
          </p>
        )}
      </div>

      {/* Approval columns */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* "You" column */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-[#8899AA]">You</span>
          <button
            type="button"
            onClick={canToggle ? () => onToggle(clause.id) : undefined}
            disabled={!canToggle}
            className={[
              'w-5 h-5 rounded border transition-all flex items-center justify-center',
              isMyApproved
                ? 'bg-[#FFD700] border-[#FFD700]'
                : 'bg-transparent border-[#4A5B6E]',
              canToggle
                ? 'cursor-pointer hover:border-[#FFD700]'
                : 'cursor-not-allowed opacity-40',
            ].join(' ')}
            title={
              isReadOnly
                ? 'Approvals already submitted'
                : isMyApproved
                  ? 'Click to un-approve'
                  : 'Click to approve'
            }
          >
            {isMyApproved && (
              <Check size={12} className="text-[#0F1C2E]" strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Other party column */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-[#8899AA]">{otherPartyLabel}</span>
          <div
            className={[
              'w-5 h-5 rounded border flex items-center justify-center',
              isOtherApproved
                ? 'bg-[#FFD700] border-[#FFD700]'
                : 'bg-transparent border-[#2A3B52]',
            ].join(' ')}
          >
            {isOtherApproved && (
              <Check size={12} className="text-[#0F1C2E]" strokeWidth={3} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ClauseAccordion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {{ id: string, title: string }} props.section - Section metadata
 * @param {Object[]} props.clauses - Clauses in this section
 * @param {{ approvedClauses: string[], hasSubmitted: boolean }} props.myApproval
 * @param {{ approvedClauses: string[], hasSubmitted: boolean }} props.otherApproval
 * @param {string} props.otherPartyLabel - 'Buyer' or 'Seller'
 * @param {boolean} props.isReadOnly - True if current user has already submitted or contract is fully approved
 * @param {Function} props.onClauseToggle - (clauseId) => void
 * @param {boolean} props.hasEverExpanded - Always true (initialized to all sections on mount)
 * @param {Function} props.isClauseApproved - (clauseId) => boolean
 * @param {boolean} props.isBuyer
 */
export function ClauseAccordion({
  section,
  clauses,
  myApproval,
  otherApproval,
  otherPartyLabel,
  isReadOnly,
  onClauseToggle,
  hasEverExpanded,
  isClauseApproved,
}) {
  // Count approved clauses in this section
  const approvedInSection = clauses.filter((c) => isClauseApproved(c.id)).length;
  const totalInSection = clauses.length;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden clause-section">
      {/* Section header — always visible, no toggle behavior */}
      <div className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{section.title}</span>
          <span className="text-xs text-[#8899AA]">
            {approvedInSection}/{totalInSection} approved
          </span>
        </div>
      </div>

      {/* Always-visible clause content */}
      <div>
        {/* Column headers */}
        <div className="flex items-center px-4 pb-1">
          <div className="flex-1" />
          <div className="flex gap-4 text-[10px] text-[#8899AA] uppercase tracking-wide">
            <span className="w-5 text-center">You</span>
            <span className="w-5 text-center">{otherPartyLabel}</span>
          </div>
        </div>

        {/* Clause rows */}
        <div className="px-4 pb-3">
          {clauses.map((clause) => (
            <ClauseRow
              key={clause.id}
              clause={clause}
              isMyApproved={isClauseApproved(clause.id)}
              isOtherApproved={(otherApproval?.approvedClauses || []).includes(clause.id)}
              isCheckboxActive={hasEverExpanded}
              isReadOnly={isReadOnly}
              onToggle={onClauseToggle}
              otherPartyLabel={otherPartyLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ClauseAccordion;
