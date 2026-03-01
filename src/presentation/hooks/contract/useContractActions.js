/**
 * useContractActions Hook
 *
 * Manages local clause approval state, debounced draft saves,
 * and the final approval submission flow.
 *
 * - localApprovedClauses: Set of clause IDs checked locally (synced to server via debounce)
 * - expandedSections: Set of currently expanded accordion section IDs
 * - hasExpanded: Set of section IDs ever expanded (persists across collapse — enables checkbox)
 * - toggleSection: Opens/closes a section; marks it as ever-opened
 * - toggleClause: Checks/unchecks a clause; triggers debounced draft save
 * - submitApprovals: Calls submitContractApproval Cloud Function with toast feedback
 * - isCheckboxActive: Returns true if section was ever expanded and user hasn't submitted yet
 * - isClauseApproved: Returns true if clause ID is in local approved set
 *
 * Draft saves are silent (no toast) — only final submission shows feedback.
 * Must-expand-before-approve pattern is enforced via hasExpanded Set.
 *
 * Usage:
 * const actions = useContractActions(dealId, contract, currentUid, deal);
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

/**
 * @param {string} dealId
 * @param {import('@/domain/entities/Contract').Contract|null} contract
 * @param {string} currentUid
 * @param {Object} deal
 */
export function useContractActions(dealId, contract, currentUid, deal) {
  // ── Local clause approval state ───────────────────────────────────────────
  const [localApprovedClauses, setLocalApprovedClauses] = useState(new Set());

  // ── Accordion expand state ────────────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState(new Set());

  // ── Sections that have ever been expanded (enables checkboxes permanently) ─
  const [hasExpanded, setHasExpanded] = useState(new Set());

  // ── Submit loading state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Debounce timer ref ────────────────────────────────────────────────────
  const saveTimerRef = useRef(null);

  // ── Sync local state from Firestore contract on load/change ──────────────
  useEffect(() => {
    if (!contract || !currentUid || !deal) return;

    const myApproval = contract.getMyApproval(currentUid, deal);

    // Restore approved clauses from server (only if not yet submitted)
    if (!myApproval.hasSubmitted) {
      setLocalApprovedClauses(new Set(myApproval.approvedClauses));

      // Restore hasExpanded from approved clauses (Pitfall 6 fix):
      // Any section that has approved clauses is treated as "ever expanded"
      // so checkboxes remain active after page refresh.
      if (myApproval.approvedClauses.length > 0) {
        const sectionsWithApprovals = new Set();
        myApproval.approvedClauses.forEach((clauseId) => {
          const clause = contract.clauses.find((c) => c.id === clauseId);
          if (clause) sectionsWithApprovals.add(clause.section);
        });
        setHasExpanded((prev) => {
          const next = new Set([...prev, ...sectionsWithApprovals]);
          return next;
        });
      }
    } else {
      // Read-only after submit — show final server state
      setLocalApprovedClauses(new Set(myApproval.approvedClauses));
    }
  }, [contract, currentUid, deal]);

  // ── Toggle accordion section ──────────────────────────────────────────────
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
    // Mark as ever-expanded (permanently enables checkboxes in this section)
    setHasExpanded((prev) => new Set([...prev, sectionId]));
  }, []);

  // ── Debounced save to Firestore ───────────────────────────────────────────
  const saveDraft = useCallback(async (approvedClauses) => {
    try {
      const fn = httpsCallable(functions, 'saveDraftApprovals');
      await fn({ dealId, approvedClauses: Array.from(approvedClauses) });
    } catch (err) {
      // Draft saves are silent — log but don't toast
      console.error('[useContractActions] saveDraftApprovals error:', err);
    }
  }, [dealId]);

  function debouncedSave(clauses) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDraft(clauses), 500);
  }

  // ── Toggle individual clause ──────────────────────────────────────────────
  const toggleClause = useCallback((clauseId) => {
    setLocalApprovedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      debouncedSave(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, saveDraft]);

  // ── Submit final approvals ────────────────────────────────────────────────
  const submitApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'submitContractApproval');
      await fn({ dealId });
      toast.success('Approvals submitted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to submit approvals');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  // ── Derived helpers ───────────────────────────────────────────────────────

  /**
   * Returns true if the checkbox for this clause should be active (clickable).
   * Requires: section was ever expanded AND user has not yet submitted.
   */
  const isCheckboxActive = useCallback((clause) => {
    if (!contract || !currentUid || !deal) return false;
    const myApproval = contract.getMyApproval(currentUid, deal);
    return hasExpanded.has(clause.section) && !myApproval.hasSubmitted;
  }, [contract, currentUid, deal, hasExpanded]);

  /**
   * Returns true if the clause is in the local approved set.
   */
  const isClauseApproved = useCallback((clauseId) => {
    return localApprovedClauses.has(clauseId);
  }, [localApprovedClauses]);

  return {
    localApprovedClauses,
    expandedSections,
    hasExpanded,
    loading,
    toggleSection,
    toggleClause,
    submitApprovals,
    isCheckboxActive,
    isClauseApproved,
  };
}

export default useContractActions;
