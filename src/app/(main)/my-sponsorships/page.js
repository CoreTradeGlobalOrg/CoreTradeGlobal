/**
 * My Sponsorships
 *
 * Rendered at /my-sponsorships. Lists every ad inquiry owned by the
 * signed-in user with its payment status so they can pick up a pending
 * payment later, or check whether a wire has been confirmed. Login is
 * required; anonymous visitors are bounced to /login with a returnTo.
 *
 * Each row links back to /pricing/inquire/pay/{inquiryId} — that page
 * owns the actual "I've sent the wire" action and shows the bank
 * details.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { ArrowRight, Calendar, Loader2, PlusCircle, ChevronLeft } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '@/core/constants/wireTransfer';
import { AD_PACKAGES, AD_TYPES } from '@/core/constants/adTypes';

const SPONSORED_PACKAGE = AD_PACKAGES.find((p) => p.type === AD_TYPES.SPONSORED) || AD_PACKAGES[0];

function tsToDate(ts) {
  if (!ts) return null;
  return ts?.toDate ? ts.toDate() : new Date(ts);
}

function formatMonth(startTs) {
  const start = tsToDate(startTs);
  if (!start) return '';
  return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MySponsorshipsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.replace('/login?returnTo=/my-sponsorships');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        // Single equality filter → no composite index needed. Order
        // client-side so we don't pin a `createdAt desc` composite for
        // a tiny list. Users typically have < 12 sponsorships (one per
        // month max), so client sort is trivial.
        const snap = await getDocs(
          query(collection(db, 'adInquiries'), where('userId', '==', user.uid)),
        );
        if (cancelled) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const aCreated = tsToDate(a.createdAt)?.getTime() || 0;
          const bCreated = tsToDate(b.createdAt)?.getTime() || 0;
          return bCreated - aCreated;
        });
        setRows(items);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[my-sponsorships] fetch failed:', err);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (authLoading || !user?.uid) {
    return (
      <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
          <p className="text-[#A0A0A0] text-sm">Checking session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-4xl mx-auto px-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm mb-6 no-underline"
          style={{ color: '#A0A0A0' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Home
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">My Sponsorships</h1>
            <p className="text-[#c8d3e0] text-sm">Track your Sponsored Package reservations and payments.</p>
          </div>
          <Link
            href="/pricing/inquire?type=sponsored"
            style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm no-underline hover:shadow-[0_10px_25px_rgba(255,215,0,0.35)] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New sponsorship
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-8 flex items-center justify-center gap-2 text-[#A0A0A0]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your sponsorships…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <SponsorshipRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SponsorshipRow({ row }) {
  const status = row.paymentStatus || PAYMENT_STATUSES.AWAITING;
  const monthLabel = formatMonth(row.startDate);
  const reservedUntil = tsToDate(row.monthReservedUntil);
  const daysLeft = reservedUntil ? Math.max(0, Math.ceil((reservedUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  return (
    <Link
      href={`/pricing/inquire/pay/${row.id}`}
      className="block rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.6)] to-[rgba(15,27,43,0.85)] p-4 md:p-5 hover:border-[rgba(255,215,0,0.35)] transition-colors no-underline"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-[#A0A0A0] mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{monthLabel || '—'}</span>
          </div>
          <p className="text-white font-bold text-base mb-1">Sponsored Package</p>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />
            {row.paymentReference && (
              <span className="text-[10px] font-mono text-[#A0A0A0]">
                Ref: <span className="text-white">{row.paymentReference}</span>
              </span>
            )}
            {status === PAYMENT_STATUSES.AWAITING && daysLeft !== null && (
              <span className="text-[10px] text-[#A0A0A0]">
                {daysLeft} day{daysLeft === 1 ? '' : 's'} left
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
            ${SPONSORED_PACKAGE.monthly}
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-[#FFD700] font-semibold mt-1">
            View details
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }) {
  const palette = {
    [PAYMENT_STATUSES.AWAITING]: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    [PAYMENT_STATUSES.REPORTED]: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    [PAYMENT_STATUSES.PAID]: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    [PAYMENT_STATUSES.EXPIRED]: 'bg-red-500/15 text-red-300 border-red-500/40',
  }[status] || 'bg-neutral-500/15 text-neutral-300 border-neutral-500/40';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${palette}`}>
      {PAYMENT_STATUS_LABELS[status] || status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.03)] p-10 text-center">
      <p className="text-white font-bold mb-2">No sponsorships yet</p>
      <p className="text-[#c8d3e0] text-sm mb-5">Reserve a month and your Sponsored Package will show up here with its payment status.</p>
      <Link
        href="/pricing/inquire?type=sponsored"
        style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm no-underline"
      >
        Book Sponsored Package
      </Link>
    </div>
  );
}
