/**
 * useContractActions Hook
 *
 * Manages local clause approval state, debounced draft saves,
 * and the final approval submission flow.
 *
 * - localApprovedClauses: Set of clause IDs checked locally (synced to server via debounce)
 * - hasExpanded: Set of ALL section IDs (initialized on mount so all checkboxes are active)
 * - toggleClause: Checks/unchecks a clause; triggers debounced draft save
 * - submitApprovals: Calls submitContractApproval Cloud Function with toast feedback
 * - isClauseApproved: Returns true if clause ID is in local approved set
 *
 * Draft saves are silent (no toast) — only final submission shows feedback.
 * All clauses are immediately interactable — no expand-before-approve gating.
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

  // ── hasExpanded: initialized to ALL section IDs so all checkboxes are active ─
  // All clauses are immediately interactable — no expand-before-approve gating.
  const [hasExpanded, setHasExpanded] = useState(new Set());

  // ── Submit loading state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Debounce timer ref ────────────────────────────────────────────────────
  const saveTimerRef = useRef(null);

  // ── Guard: true while a debounced save is pending or in-flight ──────────
  const isSavingRef = useRef(false);

  // ── Initialize hasExpanded with ALL section IDs when contract loads ────────
  // This ensures all checkboxes are active immediately — no expand-before-approve gating.
  useEffect(() => {
    if (!contract || !contract.clauses) return;
    const allSections = new Set(contract.clauses.map((c) => c.section).filter(Boolean));
    setHasExpanded(allSections);
  }, [contract]);

  // ── Sync local state from Firestore contract on load/change ──────────────
  useEffect(() => {
    if (!contract || !currentUid || !deal) return;

    // Skip server sync while a local save is pending — prevents race condition
    // where the listener overwrites optimistic local state with stale server data
    if (isSavingRef.current) return;

    const myApproval = contract.getMyApproval(currentUid, deal);

    if (!myApproval.hasSubmitted) {
      // Restore approved clauses from server
      setLocalApprovedClauses(new Set(myApproval.approvedClauses));
    } else {
      // Read-only after submit — show final server state
      setLocalApprovedClauses(new Set(myApproval.approvedClauses));
    }
  }, [contract, currentUid, deal]);

  // ── Debounced save to Firestore ───────────────────────────────────────────
  const saveDraft = useCallback(async (approvedClauses) => {
    try {
      const fn = httpsCallable(functions, 'saveDraftApprovals');
      await fn({ dealId, approvedClauses: Array.from(approvedClauses) });
    } catch (err) {
      // Draft saves are silent — log but don't toast
      console.error('[useContractActions] saveDraftApprovals error:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [dealId]);

  function debouncedSave(clauses) {
    isSavingRef.current = true;
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
   * Returns true if the clause is in the local approved set.
   */
  const isClauseApproved = useCallback((clauseId) => {
    return localApprovedClauses.has(clauseId);
  }, [localApprovedClauses]);

  return {
    localApprovedClauses,
    hasExpanded,
    loading,
    toggleClause,
    submitApprovals,
    isClauseApproved,
  };
}

export default useContractActions;
