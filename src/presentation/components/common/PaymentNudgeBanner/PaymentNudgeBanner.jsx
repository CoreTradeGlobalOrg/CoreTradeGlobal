/**
 * PaymentNudgeBanner
 *
 * Slim gold bar rendered at the top of every page (mounted in the root
 * layout) whenever the signed-in user has a Sponsored Package inquiry
 * still in `awaiting_payment`. Tapping the bar routes to the payment
 * instructions page; the ✕ icon dismisses the bar for 24 hours (kept
 * in localStorage). Once the reservation expires or the payment is
 * reported / confirmed / released, the bar drops itself so we never
 * nudge for a resolved item.
 *
 * A soft subscription — one Firestore listen per session, sorted by
 * earliest expiry so the most urgent reservation surfaces first.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { PAYMENT_STATUSES } from '@/core/constants/wireTransfer';

const DISMISS_KEY = 'payment_nudge_dismissed_until';
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000;

function tsToDate(ts) {
  if (!ts) return null;
  return ts?.toDate ? ts.toDate() : new Date(ts);
}

function formatMonth(startTs) {
  const start = tsToDate(startTs);
  if (!start) return '';
  return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function daysLeftUntil(dateOrTs) {
  const d = tsToDate(dateOrTs);
  if (!d) return null;
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function PaymentNudgeBanner() {
  const { user, loading: authLoading } = useAuth();
  const [pending, setPending] = useState([]);
  const [dismissedUntil, setDismissedUntil] = useState(0);

  // Hydrate the dismiss cooldown once so re-mounts on client-side nav
  // don't re-show the bar within the 24h window.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) setDismissedUntil(parsed);
      }
    } catch {
      // localStorage disabled — treat as never dismissed.
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user?.uid) {
      setPending([]);
      return;
    }
    // Subscribe live so a payment reported on another tab drops the bar
    // instantly here, and a fresh inquiry on this tab lights it up
    // without a hard refresh.
    const unsub = onSnapshot(
      query(
        collection(db, 'adInquiries'),
        where('userId', '==', user.uid),
        where('paymentStatus', '==', PAYMENT_STATUSES.AWAITING),
      ),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((inq) => {
            const reservedUntil = tsToDate(inq.monthReservedUntil);
            // Don't nudge on expired reservations — a separate CF flips
            // those to `expired` on the daily sweep, but until it runs
            // we bail out here so we don't harass the user over a
            // window they've already lost.
            return reservedUntil ? reservedUntil.getTime() > Date.now() : true;
          });
        items.sort((a, b) => {
          const ax = tsToDate(a.monthReservedUntil)?.getTime() || Infinity;
          const bx = tsToDate(b.monthReservedUntil)?.getTime() || Infinity;
          return ax - bx;
        });
        setPending(items);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[nudge] listen failed:', err);
      },
    );
    return () => unsub();
  }, [authLoading, user?.uid]);

  const topPending = pending[0];
  const dismissed = Date.now() < dismissedUntil;

  const daysLeft = useMemo(
    () => (topPending ? daysLeftUntil(topPending.monthReservedUntil) : null),
    [topPending],
  );

  if (!topPending || dismissed) return null;

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const until = Date.now() + DISMISS_WINDOW_MS;
    try {
      window.localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      // ignore
    }
    setDismissedUntil(until);
  };

  return (
    <div
      className="w-full bg-gradient-to-r from-[#FFD700] via-[#FFC940] to-[#FDB931] text-[#0F1B2B] shadow-[0_2px_10px_rgba(255,215,0,0.35)] relative z-40"
      role="alert"
    >
      <Link
        href={`/pricing/inquire/pay/${topPending.id}`}
        className="flex items-center gap-2 md:gap-3 px-4 py-2 md:py-2.5 max-w-6xl mx-auto no-underline text-[#0F1B2B]"
        style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2.5} />
        <span className="text-xs md:text-sm font-semibold leading-tight flex-1 min-w-0">
          <span className="hidden md:inline">Your Sponsored Package for </span>
          <span className="font-extrabold">{formatMonth(topPending.startDate) || 'the reserved month'}</span>
          <span> is awaiting payment</span>
          {daysLeft !== null && (
            <span className="hidden sm:inline">
              {' · '}
              <span className="font-extrabold">{daysLeft} day{daysLeft === 1 ? '' : 's'}</span> left
            </span>
          )}
        </span>
        <span className="hidden md:inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider shrink-0">
          Complete now
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 ml-1 md:ml-2 p-1 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Dismiss for 24 hours"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </Link>
    </div>
  );
}

export default PaymentNudgeBanner;
