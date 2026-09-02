/**
 * Admin — Reports queue
 *
 * URL: /admin/reports
 * Access: admin role only.
 *
 * Cross-user moderation queue. Each card previews a single report
 * with reporter + subject, category chip, and reason. Admins can
 * jump to the reporter's profile, the subject's profile, or the
 * conversation the report was filed from. State transitions
 * (reviewed / action_taken / dismissed) run through the
 * updateReportStatus callable which also fires the "your report
 * was reviewed" ping back to the reporter.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  Loader2,
  MessageSquare,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, getFunctionsInstance } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { REPORT_CATEGORY_LABEL as CATEGORY_LABEL } from '@/core/constants/reportCategories';

const TABS = [
  { id: 'pending', label: 'Pending', icon: Clock, color: '#FFD700' },
  { id: 'reviewed', label: 'Reviewed', icon: CheckCircle2, color: '#3B82F6' },
  { id: 'action_taken', label: 'Action Taken', icon: ShieldAlert, color: '#EF4444' },
  { id: 'dismissed', label: 'Dismissed', icon: XCircle, color: '#6B7280' },
];

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading, profileLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(() => new Set());
  // Which report + action is the note modal collecting a note for?
  // null when the modal is closed.
  const [noteFor, setNoteFor] = useState(null);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!isAuthenticated) router.replace('/login?redirect=/admin/reports');
      else if (user?.role !== 'admin') router.replace('/');
    }
  }, [authLoading, profileLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (authLoading || profileLoading || user?.role !== 'admin') return;
    setLoading(true);
    const q = query(
      collection(db, 'reports'),
      where('status', '==', activeTab),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('reports snapshot error:', err);
        toast.error('Failed to load reports.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [activeTab, authLoading, profileLoading, user?.role]);

  const runStatus = useCallback(async (reportId, nextStatus, resolutionNote) => {
    setBusyIds((prev) => new Set(prev).add(reportId));
    try {
      const call = httpsCallable(getFunctionsInstance(), 'updateReportStatus');
      const res = await call({ reportId, status: nextStatus, resolutionNote });
      if (!res.data?.ok) throw new Error('server rejected');
      toast.success(
        nextStatus === 'reviewed'
          ? 'Marked as reviewed.'
          : nextStatus === 'action_taken'
            ? 'Marked as action taken.'
            : 'Dismissed.',
      );
    } catch (err) {
      console.error('updateReportStatus failed:', err);
      toast.error(err?.message || 'Action failed.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  }, []);

  const openNoteFor = useCallback((reportId, action) => {
    setNoteFor({ reportId, action });
  }, []);

  const closeNote = useCallback(() => {
    setNoteFor(null);
  }, []);

  const submitNote = useCallback(async (note) => {
    if (!noteFor) return;
    await runStatus(noteFor.reportId, noteFor.action, note);
    setNoteFor(null);
  }, [noteFor, runStatus]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1B2B]">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <main className="min-h-screen bg-[#0F1B2B] text-white pt-[calc(var(--navbar-height)+16px)]">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm no-underline mb-2"
            style={{ color: '#A0A0A0' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Admin dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-300" />
            <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
          </div>
          <p className="text-sm text-[#A0A0A0] mt-1">
            Member-submitted reports. Reporter is notified when you change the status.
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.06)] mb-5 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  active ? 'text-white' : 'text-[#A0A0A0] hover:text-white border-transparent',
                ].join(' ')}
                style={active ? { borderColor: tab.color } : {}}
              >
                <Icon className="w-4 h-4" style={{ color: active ? tab.color : '#A0A0A0' }} />
                {tab.label}
                {active && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: tab.color, background: `${tab.color}15` }}
                  >
                    {rows.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-12 text-center">
            <p className="text-[#A0A0A0]">Nothing in this bucket.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((row) => (
              <ReportCard
                key={row.id}
                row={row}
                busy={busyIds.has(row.id)}
                activeTab={activeTab}
                onReviewed={() => runStatus(row.id, 'reviewed', '')}
                onActionTaken={() => openNoteFor(row.id, 'action_taken')}
                onDismiss={() => openNoteFor(row.id, 'dismissed')}
              />
            ))}
          </div>
        )}
      </div>
      {noteFor && (
        <ResolutionNoteModal
          action={noteFor.action}
          onCancel={closeNote}
          onSubmit={submitNote}
        />
      )}
    </main>
  );
}

function ResolutionNoteModal({ action, onCancel, onSubmit }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, submitting]);

  const isAction = action === 'action_taken';
  const config = isAction
    ? {
        title: 'Mark as action taken',
        subtitle: 'Add a short note describing what you did — this stays in the audit trail.',
        placeholder: 'Example: Suspended the account and sent a warning email.',
        confirmLabel: 'Mark action taken',
        confirmClass: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-200',
        requireNote: true,
      }
    : {
        title: 'Dismiss report',
        subtitle: 'Optional note — why is this report being dismissed?',
        placeholder: 'Example: No violation found, member misunderstood the interaction.',
        confirmLabel: 'Dismiss',
        confirmClass: 'bg-white/10 hover:bg-white/15 border-white/20 text-white',
        requireNote: false,
      };

  const trimmed = note.trim();
  const canSubmit = !submitting && (!config.requireNote || trimmed.length > 0);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1B2B] shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-white font-semibold text-base">{config.title}</h2>
          <button
            type="button"
            onClick={() => !submitting && onCancel()}
            disabled={submitting}
            className="text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#A0A0A0] mb-4">{config.subtitle}</p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder={config.placeholder}
          rows={4}
          disabled={submitting}
          autoFocus
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/60 resize-none"
        />
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#606060]">
          <span>{config.requireNote ? 'Required' : 'Optional'}</span>
          <span className="tabular-nums">{note.length} / 500</span>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => !submitting && onCancel()}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.confirmClass}`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAction ? <ShieldAlert className="w-4 h-4" /> : <Check className="w-4 h-4" />)}
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ row, busy, activeTab, onReviewed, onActionTaken, onDismiss }) {
  const reporterName = row.reporterSnapshot?.displayName || row.reporterId;
  const subjectName = row.subjectSnapshot?.displayName || row.subjectUserId;
  const subjectCompany = row.subjectSnapshot?.companyName;
  const category = CATEGORY_LABEL[row.category] || row.category;

  const canReview = activeTab === 'pending';
  const canActionTake = activeTab !== 'action_taken';
  const canDismiss = activeTab !== 'dismissed';

  return (
    <div className="rounded-2xl border border-red-500/20 bg-[rgba(239,68,68,0.03)] p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-red-300 border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 rounded">
              {category}
            </span>
            <span className="text-[10px] text-[#606060] flex items-center gap-1">
              {row.source === 'messaging' ? (
                <>
                  <MessageSquare className="w-3 h-3" />
                  From conversation
                </>
              ) : (
                <>
                  <Flag className="w-3 h-3" />
                  From profile
                </>
              )}
            </span>
          </div>
          <p className="text-[11px] text-[#A0A0A0]">
            <Link
              href={`/profile/${row.reporterId}`}
              className="text-white hover:text-[#FFD700] underline-offset-2 hover:underline"
            >
              {reporterName}
            </Link>{' '}
            reported{' '}
            <Link
              href={`/profile/${row.subjectUserId}`}
              className="text-white hover:text-[#FFD700] underline-offset-2 hover:underline"
            >
              {subjectName}
            </Link>
            {subjectCompany ? ` (${subjectCompany})` : ''}
          </p>
        </div>
        <span className="text-[10px] text-[#606060] whitespace-nowrap">
          {formatDate(row.createdAt)}
        </span>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[#606060] mb-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Reason
        </p>
        <p className="text-sm text-[#c8d3e0] whitespace-pre-wrap">{row.reason}</p>
      </div>

      {row.resolutionNote && (
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#606060] mb-1">Admin note</p>
          <p className="text-xs text-[#c8d3e0] whitespace-pre-wrap">{row.resolutionNote}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/profile/${row.subjectUserId}`}
          className="inline-flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white"
        >
          Subject profile
          <ExternalLink className="w-3 h-3" />
        </Link>
        <Link
          href={`/profile/${row.reporterId}`}
          className="inline-flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white"
        >
          Reporter profile
          <ExternalLink className="w-3 h-3" />
        </Link>
        {row.source === 'messaging' && row.contextConversationId && (
          <Link
            href={`/messages/${row.contextConversationId}`}
            className="inline-flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-white"
          >
            Open conversation
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {canReview && (
            <button
              type="button"
              onClick={onReviewed}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Reviewed
            </button>
          )}
          {canActionTake && (
            <button
              type="button"
              onClick={onActionTaken}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
              Action taken
            </button>
          )}
          {canDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
