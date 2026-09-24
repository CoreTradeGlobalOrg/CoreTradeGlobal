/**
 * Sponsored Package — Payment Instructions
 *
 * Rendered at /pricing/inquire/pay/{inquiryId}. Owner + admin gated.
 *
 * The user lands here right after submitting /pricing/inquire, or comes
 * back to it later via /my-sponsorships, the persistent nudge banner,
 * the wf7.1 confirmation email, or the wf7.x reminder emails.
 *
 * Page shows:
 *   - Reserved month + total ($499)
 *   - Enpara wire transfer details with copy-to-clipboard on each row
 *   - Countdown to reservation expiry
 *   - "I've sent the wire" — flips paymentStatus awaiting → reported,
 *     records paymentReportedAt, and pings the admin via CF (wf7.2).
 *   - "Copy Payment Link" — puts the current URL on the clipboard so
 *     the buyer can save it for later if they can't pay right now.
 *
 * Firestore rules only let the owner flip status from awaiting_payment
 * to reported — everything else on this doc is admin-only, so the
 * client can't fabricate a "paid" state.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, Copy, Loader2, ChevronLeft, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { AD_PACKAGES, AD_TYPES } from '@/core/constants/adTypes';
import {
  WIRE_TRANSFER_DETAILS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
} from '@/core/constants/wireTransfer';

const SPONSORED_PACKAGE = AD_PACKAGES.find((p) => p.type === AD_TYPES.SPONSORED) || AD_PACKAGES[0];

function tsToDate(ts) {
  if (!ts) return null;
  return ts?.toDate ? ts.toDate() : new Date(ts);
}

function daysBetween(a, b) {
  const ms = a.getTime() - b.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// Human-friendly month label for the campaign window. Sponsored ads are
// always locked to a single calendar month so we display the month-year
// tag, not a raw date range.
function formatMonth(startTs) {
  const start = tsToDate(startTs);
  if (!start) return '';
  return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function CopyableField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Copy failed — long-press to copy manually.');
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-b-0">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] font-semibold mb-0.5">{label}</p>
        <p className="text-sm text-white font-mono break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          copied
            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
            : 'bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.2)]'
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function PayPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const inquiryId = params?.inquiryId;

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.replace(`/login?returnTo=/pricing/inquire/pay/${inquiryId || ''}`);
    }
  }, [authLoading, user, router, inquiryId]);

  useEffect(() => {
    if (!inquiryId || !user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'adInquiries', inquiryId));
        if (cancelled) return;
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setInquiry({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[pay] inquiry fetch failed:', err);
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inquiryId, user?.uid]);

  const reservedUntil = useMemo(() => tsToDate(inquiry?.monthReservedUntil), [inquiry]);
  const now = useMemo(() => new Date(), []);
  const daysLeft = reservedUntil ? daysBetween(reservedUntil, now) : null;
  const reservationExpired = reservedUntil ? reservedUntil.getTime() < now.getTime() : false;

  const handleReported = async () => {
    if (reporting || !inquiry) return;
    setReporting(true);
    try {
      await updateDoc(doc(db, 'adInquiries', inquiry.id), {
        paymentStatus: PAYMENT_STATUSES.REPORTED,
        paymentReportedAt: serverTimestamp(),
      });
      toast.success("Thanks! We'll email you as soon as the wire lands.");
      setInquiry((prev) => (prev ? { ...prev, paymentStatus: PAYMENT_STATUSES.REPORTED } : prev));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[pay] mark reported failed:', err);
      toast.error("Couldn't mark your payment. Please try again.");
    } finally {
      setReporting(false);
    }
  };

  const handleCopyLink = async () => {
    // Always share the canonical production URL — pasting a localhost
    // link into an email or Slack message on the user's phone is
    // useless. The route (/pricing/inquire/pay/{id}) is identical
    // across environments so hard-coding the domain is safe.
    const link = `https://www.coretradeglobal.com/pricing/inquire/pay/${inquiry.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Payment link copied. You can come back to it later.');
    } catch {
      toast.error('Copy failed — long-press the URL bar to copy.');
    }
  };

  if (authLoading || loading || !user?.uid) {
    return (
      <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
          <p className="text-[#A0A0A0] text-sm">Loading your reservation…</p>
        </div>
      </main>
    );
  }

  if (notFound || !inquiry) {
    return (
      <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
        <div className="max-w-lg mx-auto px-5 text-center">
          <h1 className="text-2xl font-extrabold mb-2">Reservation not found</h1>
          <p className="text-[#c8d3e0] mb-6">
            This payment link doesn&apos;t match any inquiry on your account. Double-check the URL or start a new inquiry.
          </p>
          <Link
            href="/pricing/inquire?type=sponsored"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-sm"
            style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
          >
            Start an inquiry
          </Link>
        </div>
      </main>
    );
  }

  // Ownership belt-and-braces: rules already gate reads to owner/admin,
  // but if the doc were fetched via admin session (custom claim) we
  // still don't want to let a non-owner mark it reported. The button is
  // hidden below when the user isn't the owner.
  const isOwner = inquiry.userId === user.uid;
  const status = inquiry.paymentStatus || PAYMENT_STATUSES.AWAITING;
  const alreadyReported = status === PAYMENT_STATUSES.REPORTED || status === PAYMENT_STATUSES.PAID;
  const isExpired = status === PAYMENT_STATUSES.EXPIRED || (reservationExpired && status === PAYMENT_STATUSES.AWAITING);

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-3xl mx-auto px-5">
        <Link
          href="/my-sponsorships"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm mb-6 no-underline"
          style={{ color: '#A0A0A0' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to My Sponsorships
        </Link>

        {/* Reservation banner */}
        <div className="rounded-2xl border border-[rgba(255,215,0,0.3)] bg-gradient-to-br from-[rgba(255,215,0,0.08)] to-[rgba(253,185,49,0.03)] p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-1">Reserved</p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">
                {formatMonth(inquiry.startDate)}
              </h1>
              <p className="text-sm text-[#c8d3e0]">Sponsored Package · full calendar month</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1">Amount due</p>
              <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
                ${SPONSORED_PACKAGE.monthly}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(255,215,0,0.15)] flex flex-wrap items-center gap-3 text-xs">
            <StatusBadge status={status} />
            {!isExpired && !alreadyReported && daysLeft !== null && (
              <span className="text-[#c8d3e0]">
                <strong className="text-[#FFD700]">{daysLeft}</strong>{' '}
                day{daysLeft === 1 ? '' : 's'} left to complete payment
              </span>
            )}
            {isExpired && !alreadyReported && (
              <span className="text-red-300">
                Reservation expired — start a new inquiry to reserve another month.
              </span>
            )}
          </div>
        </div>

        {/* Payment reference — the sender MUST include this in the wire memo
            so the admin can match the transfer back to this inquiry. */}
        <div className="rounded-2xl border border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.06)] p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-2">
            Include this in the wire memo
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl md:text-3xl font-mono font-extrabold text-white tracking-wide">
              {inquiry.paymentReference || '—'}
            </p>
            {inquiry.paymentReference && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inquiry.paymentReference);
                    toast.success('Reference copied.');
                  } catch {
                    toast.error('Copy failed — long-press to copy manually.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-xs"
                style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Reference
              </button>
            )}
          </div>
          <p className="text-xs text-[#c8d3e0] mt-2 leading-relaxed">
            Without this reference we can&apos;t match the wire to your reservation. Paste it into your bank&apos;s payment description / memo field.
          </p>
        </div>

        {/* Wire details */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] p-5 md:p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Bank transfer details</h2>

          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            <CopyableField label="Beneficiary name" value={WIRE_TRANSFER_DETAILS.beneficiaryName} />
            <CopyableField label="IBAN" value={WIRE_TRANSFER_DETAILS.iban} />
            <CopyableField label="Account number" value={WIRE_TRANSFER_DETAILS.accountNumber} />
            <CopyableField label="Branch code" value={WIRE_TRANSFER_DETAILS.branchCode} />
            <CopyableField label="Beneficiary address" value={WIRE_TRANSFER_DETAILS.beneficiaryAddress} />
            <CopyableField label="Bank name" value={WIRE_TRANSFER_DETAILS.bankName} />
            <CopyableField label="SWIFT / BIC" value={WIRE_TRANSFER_DETAILS.swiftBic} />
            <CopyableField label="Bank country" value={WIRE_TRANSFER_DETAILS.bankCountry} />
            <CopyableField label="Payment reference (label)" value={WIRE_TRANSFER_DETAILS.paymentReferenceLabel} />
          </div>
        </div>

        {/* CTAs */}
        {isOwner && !alreadyReported && !isExpired && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleReported}
              disabled={reporting}
              style={{ color: reporting ? undefined : '#0F1B2B', WebkitTextFillColor: reporting ? undefined : '#0F1B2B' }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_10px_25px_rgba(255,215,0,0.35)] transition-all"
            >
              {reporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Marking as sent…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  I&apos;ve Sent the Wire
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] text-white font-semibold text-sm hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Copy payment link for later
            </button>
          </div>
        )}

        {alreadyReported && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
            <p className="font-semibold mb-1 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {status === PAYMENT_STATUSES.PAID ? 'Payment confirmed' : 'Payment reported'}
            </p>
            <p className="text-emerald-200/90 text-xs leading-relaxed">
              {status === PAYMENT_STATUSES.PAID
                ? 'Your sponsored placement is live — thanks for choosing CoreTradeGlobal.'
                : "We'll email you the moment the wire clears our account. This usually takes 1–3 business days for international transfers."}
            </p>
          </div>
        )}

        {isExpired && !alreadyReported && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100 mt-3">
            <p className="font-semibold mb-1">Reservation expired</p>
            <p className="text-red-200/90 text-xs leading-relaxed">
              This month has been released back to the pool. Start a new inquiry to reserve another month.
            </p>
          </div>
        )}
      </div>
    </main>
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${palette}`}>
      {PAYMENT_STATUS_LABELS[status] || status}
    </span>
  );
}
