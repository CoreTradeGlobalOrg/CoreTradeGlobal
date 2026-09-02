/**
 * Report Modal — shared entry point used from both the messaging
 * widget and the profile card.
 *
 * Fires the `submitReport` Cloud Function, which server-side validates
 * (auth check, not-self, not-suspended, rate limit, dedup) and fans
 * out admin notifications. The client never writes to `reports`
 * directly — Firestore rules deny client writes.
 */

'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { AlertTriangle, Flag, Loader2, X } from 'lucide-react';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import { REPORT_CATEGORIES } from '@/core/constants/reportCategories';

// Re-export so existing consumers keep working after the categories
// list moved to a plain constants module (see reportCategories.js).
export { REPORT_CATEGORIES };

const REASON_MIN = 10;
const REASON_MAX = 1000;

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   subjectUserId: string,
 *   subjectDisplayName?: string,
 *   source: 'profile' | 'messaging',
 *   contextConversationId?: string,
 *   onSubmitted?: () => void,
 * }} props
 */
export function ReportModal({
  open,
  onClose,
  subjectUserId,
  subjectDisplayName,
  source,
  contextConversationId,
  onSubmitted,
}) {
  const [category, setCategory] = useState('other');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset every time the modal opens so a previous half-typed reason
  // doesn't bleed into a new report about a different user.
  useEffect(() => {
    if (open) {
      setCategory('other');
      setReason('');
      setSubmitting(false);
    }
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const trimmed = reason.trim();
  const reasonLength = trimmed.length;
  const valid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX && !!subjectUserId;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const call = httpsCallable(getFunctionsInstance(), 'submitReport');
      const res = await call({
        subjectUserId,
        source,
        contextConversationId: contextConversationId || null,
        category,
        reason: trimmed,
      });
      if (!res.data?.ok) throw new Error(res.data?.error || 'Report failed.');
      toast.success('Report submitted. Our team will review it shortly.');
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      const code = err?.code || err?.message || '';
      // Callable errors surface with a `code` prefix like
      // "functions/failed-precondition"; strip so the user sees the
      // friendly server message we set.
      const cleaned = String(code).replace(/^functions\/[a-z-]+:\s*/i, '');
      toast.error(cleaned || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-red-500/25 bg-[#0F1B2B] shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-300" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-white font-semibold text-base">
                Report member
              </h2>
              {subjectDisplayName && (
                <p className="text-[#A0A0A0] text-xs truncate max-w-[240px]">
                  {subjectDisplayName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose?.()}
            disabled={submitting}
            className="text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 mb-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-white/[0.03] p-2.5 text-xs text-[#A0A0A0]">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Reports are private. The member you report is not notified. Our team reviews every
            submission — misuse of the report system may lead to account restrictions.
          </span>
        </div>

        {/* Category */}
        <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
          Reason category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={submitting}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#FFD700]/60 mb-4"
        >
          {REPORT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-[#0F1B2B]">
              {c.label}
            </option>
          ))}
        </select>

        {/* Reason textarea */}
        <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
          What happened? <span className="text-red-400">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          placeholder="Describe the issue in your own words. Include any specifics (screenshots can be discussed with our team afterwards)."
          rows={5}
          disabled={submitting}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/60 resize-none"
        />
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#606060]">
          <span>{reasonLength < REASON_MIN ? `Min ${REASON_MIN} characters` : 'Ready'}</span>
          <span className="tabular-nums">
            {reasonLength} / {REASON_MAX}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => !submitting && onClose?.()}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            Submit report
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
