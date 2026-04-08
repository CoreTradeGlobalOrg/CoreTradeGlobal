/**
 * ClauseAccordion Component
 *
 * Expandable section displaying contract clauses grouped by section.
 * Implements the "must expand before approve" pattern:
 *   - Checkboxes are disabled (greyed, cursor-not-allowed) until section has
 *     been opened at least once (tracked via hasEverExpanded prop).
 *   - After first expansion, checkboxes remain active even when collapsed.
 *
 * Each clause row shows:
 *   - Left: clause title + value + source label
 *   - Right: "You" checkbox + "[Buyer/Seller]" read-only approval indicator
 */

'use client';

import { ChevronDown, ChevronUp, Check } from 'lucide-react';

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
    <div className="flex items-start gap-3 py-3 border-t border-white/5 first:border-t-0">
      {/* Clause info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{clause.title}</p>
        <p className="text-sm text-[#8899AA] mt-0.5 break-words">{clause.value}</p>
        {clause.sourceLabel && (
          <p className="text-[11px] text-[#4A5B6E] mt-1 italic">{clause.sourceLabel}</p>
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
              !isCheckboxActive
                ? 'Expand this section to enable approval'
                : isReadOnly
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
 * @param {boolean} props.isReadOnly - True if current user has already submitted
 * @param {Function} props.onClauseToggle - (clauseId) => void
 * @param {Function} props.onSectionToggle - (sectionId) => void
 * @param {boolean} props.isExpanded - Whether section is currently open
 * @param {boolean} props.hasEverExpanded - Whether section has ever been opened
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
  onSectionToggle,
  isExpanded,
  hasEverExpanded,
  isClauseApproved,
}) {
  // Count approved clauses in this section
  const approvedInSection = clauses.filter((c) => isClauseApproved(c.id)).length;
  const totalInSection = clauses.length;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden clause-section">
      {/* Section header — always visible */}
      <button
        type="button"
        onClick={() => onSectionToggle(section.id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{section.title}</span>
          <span className="text-xs text-[#8899AA]">
            {approvedInSection}/{totalInSection} approved
          </span>
          {!hasEverExpanded && (
            <span className="text-[10px] text-[#FFD700]/70 italic">
              Expand to enable approval
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-[#8899AA] flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[#8899AA] flex-shrink-0" />
        )}
      </button>

      {/* Expandable content */}
      <div
        className="accordion-content overflow-hidden transition-all duration-200"
        style={{ maxHeight: isExpanded ? `${clauses.length * 120}px` : '0px' }}
      >
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
