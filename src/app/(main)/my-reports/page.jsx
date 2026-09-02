/**
 * My Reports — reporter-facing view of their own submitted reports.
 *
 * URL: /my-reports
 * Access: any authenticated user.
 *
 * Firestore rules already permit the reporter to read their own
 * reports, so this page can subscribe directly. Admin-only fields
 * (resolutionNote, reviewedBy) are deliberately not rendered — they
 * live in the audit trail and can leak internal moderation calls.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { REPORT_CATEGORY_LABEL as CATEGORY_LABEL } from '@/core/constants/reportCategories';

const STATUS_META = {
  pending: {
    label: 'Under review',
    color: '#FFD700',
    icon: Clock,
    description: 'Our team will look at your report as soon as possible.',
  },
  reviewed: {
    label: 'Reviewed',
    color: '#3B82F6',
    icon: CheckCircle2,
    description: 'A moderator reviewed your report. No further action was needed.',
  },
  action_taken: {
    label: 'Action taken',
    color: '#10B981',
    icon: ShieldAlert,
    description: 'A moderator reviewed your report and took action on the reported member.',
  },
  dismissed: {
    label: 'Dismissed',
    color: '#6B7280',
    icon: XCircle,
    description: 'A moderator reviewed your report and determined no policy was violated.',
  },
};

function formatDate(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/my-reports');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(
      collection(db, 'reports'),
      where('reporterId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('my-reports snapshot error:', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.uid]);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-radial-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+16px)] pb-20 text-white">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm no-underline mb-3"
          style={{ color: '#A0A0A0' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-1">My Reports</h1>
        <p className="text-sm text-[#A0A0A0] mb-6">
          Reports you have submitted about other members. Our team notifies you when a moderator
          finishes reviewing each one.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-10 text-center">
            <Flag className="w-6 h-6 text-[#606060] mx-auto mb-2" />
            <p className="text-[#A0A0A0]">You have not submitted any reports yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <ReportRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ReportRow({ row }) {
  const meta = STATUS_META[row.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const categoryLabel = CATEGORY_LABEL[row.category] || row.category;
  const subjectName =
    row.subjectSnapshot?.companyName
    || row.subjectSnapshot?.displayName
    || 'a member';
  const submittedAt = formatDate(row.createdAt);
  const reviewedAt = formatDate(row.reviewedAt);

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                color: meta.color,
                borderColor: `${meta.color}55`,
                background: `${meta.color}12`,
              }}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] border border-white/10 bg-white/5 px-1.5 py-0.5 rounded">
              {categoryLabel}
            </span>
          </div>
          <p className="text-sm text-white">
            Report about <span className="font-semibold">{subjectName}</span>
          </p>
        </div>
        <span className="text-[10px] text-[#606060] whitespace-nowrap">
          {submittedAt}
        </span>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[#606060] mb-1">Your reason</p>
        <p className="text-sm text-[#c8d3e0] whitespace-pre-wrap">{row.reason}</p>
      </div>

      <p className="text-xs text-[#A0A0A0]">
        {meta.description}
        {reviewedAt && row.status !== 'pending' && (
          <>
            <br />
            <span className="text-[#606060]">Reviewed on {reviewedAt}.</span>
          </>
        )}
      </p>
    </div>
  );
}
