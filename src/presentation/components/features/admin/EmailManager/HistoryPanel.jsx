'use client';

/**
 * HistoryPanel
 *
 * Admin sends, newest first, with live progress. Pause / Resume / Cancel go
 * through updateEmailCampaign. Each send lists its failed, bounced,
 * complained and skipped recipients on demand. Below the sends is the
 * suppression list fed by the ZeptoMail webhook, where a wrongly suppressed
 * address can be removed.
 */

import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Ban, ChevronDown, History, Pause, Play, XCircle } from 'lucide-react';
import { db, getFunctionsInstance } from '@/core/config/firebase.config';

const STATUS_STYLES = {
  queued: ['Queued', 'bg-blue-500/10 text-blue-400 border-blue-500/20'],
  sending: ['Sending', 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30'],
  paused: ['Paused', 'bg-orange-500/10 text-orange-400 border-orange-500/20'],
  cancelled: ['Cancelled', 'bg-gray-500/10 text-gray-400 border-gray-500/20'],
  completed: ['Completed', 'bg-green-500/10 text-green-400 border-green-500/20'],
};

const DETAIL_FILTERS = [
  { id: 'failed', label: 'Failed', constraint: () => where('status', '==', 'failed') },
  { id: 'bounced', label: 'Bounced', constraint: () => where('bouncedAt', '!=', null) },
  { id: 'complaints', label: 'Marked as spam', constraint: () => where('complainedAt', '!=', null) },
  { id: 'skipped', label: 'Skipped', constraint: () => where('status', 'in', ['skipped', 'excluded']) },
];

const REASON_LABELS = {
  unsubscribed: 'Unsubscribed',
  bounced: 'Bounced or marked as spam before',
  admin: 'Admin account',
  banned: 'Banned account',
  deleted: 'Deleted account',
  suspended: 'Suspended account',
  hard_bounce: 'Hard bounce',
  complaint: 'Marked as spam',
};

// Above this share of sent emails bouncing, the list needs cleaning before more goes out.
const BOUNCE_WARNING_RATE = 0.05;

function formatDateTime(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function percent(part, total) {
  return total > 0 ? `${((part / total) * 100).toFixed(part / total < 0.1 ? 1 : 0)}%` : '0%';
}

function RecipientDetails({ campaignId }) {
  const [filter, setFilter] = useState('failed');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const { constraint } = DETAIL_FILTERS.find((f) => f.id === filter);
    getDocs(query(collection(db, 'emailCampaigns', campaignId, 'recipients'), constraint(), limit(100)))
      .then((snap) => !cancelled && setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((err) => {
        console.error('HistoryPanel: recipients error:', err);
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, filter]);

  return (
    <div className="space-y-2 pt-3 border-t border-[rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap gap-1.5">
        {DETAIL_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setRows(null);
              setFilter(f.id);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs border ${
              filter === f.id ? 'border-[#FFD700]/50 text-[#FFD700]' : 'border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {rows === null ? (
        <p className="text-xs text-[#5a6a7a]">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-[#5a6a7a]">None.</p>
      ) : (
        <ul className="max-h-60 overflow-y-auto space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="text-xs flex flex-col sm:flex-row sm:gap-3">
              <span className="text-white break-all sm:w-64 sm:flex-shrink-0">{r.email}</span>
              <span className="text-[#A0A0A0] break-words">
                {r.error || r.bounceDetail || REASON_LABELS[r.reason] || r.reason || ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows?.length === 100 && <p className="text-xs text-[#5a6a7a]">Showing the first 100.</p>}
    </div>
  );
}

function CampaignCard({ campaign }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const { counts = {}, status } = campaign;
  const total = counts.recipients || 0;
  const sent = counts.sent || 0;
  const failed = counts.failed || 0;
  const skipped = counts.skipped || 0;
  const notSent = Math.max(0, total - sent - failed - skipped);
  const bounced = counts.bounced || 0;
  const complaints = counts.complaints || 0;
  const [statusLabel, statusClass] = STATUS_STYLES[status] || [status, STATUS_STYLES.queued[1]];
  const excludedTotal = Object.values(campaign.excluded || {}).reduce((a, b) => a + b, 0);

  async function act(action) {
    const prompts = {
      pause: 'Pause this send? Emails already sent stay sent.',
      cancel: 'Cancel this send? Emails not sent yet will not go out, and it cannot be resumed.',
    };
    if (prompts[action] && !window.confirm(prompts[action])) return;
    setBusy(true);
    try {
      const updateEmailCampaign = httpsCallable(getFunctionsInstance(), 'updateEmailCampaign');
      await updateEmailCampaign({ campaignId: campaign.id, action });
    } catch (err) {
      console.error('HistoryPanel: update error:', err);
      toast.error(err?.message || 'Could not update the send.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{campaign.name}</p>
          <p className="text-xs text-[#A0A0A0] truncate">
            {formatDateTime(campaign.createdAt)} · {campaign.sender?.address}
            {campaign.createdBy?.email && ` · by ${campaign.createdBy.email}`}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden flex" aria-hidden="true">
        <div className="bg-green-500" style={{ width: `${total ? (sent / total) * 100 : 0}%` }} />
        <div className="bg-red-500" style={{ width: `${total ? (failed / total) * 100 : 0}%` }} />
        <div className="bg-gray-500" style={{ width: `${total ? (skipped / total) * 100 : 0}%` }} />
      </div>

      <p className="text-xs text-[#A0A0A0]">
        <span className="text-green-400 font-semibold">{sent}</span> of {total} sent
        {failed > 0 && <span className="text-red-400"> · {failed} failed</span>}
        {skipped > 0 && <span> · {skipped} skipped at send time</span>}
        {notSent > 0 && <span> · {notSent} not sent yet</span>}
        {excludedTotal > 0 && <span> · {excludedTotal} skipped before sending</span>}
      </p>

      {(bounced > 0 || complaints > 0) && (
        <p className={`text-xs ${bounced / Math.max(sent, 1) >= BOUNCE_WARNING_RATE || complaints > 0 ? 'text-red-400' : 'text-[#A0A0A0]'}`}>
          {bounced > 0 && `${bounced} bounced (${percent(bounced, sent)})`}
          {bounced > 0 && complaints > 0 && ' · '}
          {complaints > 0 && `${complaints} marked as spam`}
          {bounced / Math.max(sent, 1) >= BOUNCE_WARNING_RATE &&
            '. A high bounce rate can get the ZeptoMail account blocked; clean the list before sending to it again.'}
        </p>
      )}

      {campaign.lastError && <p className="text-xs text-orange-400">{campaign.lastError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {['queued', 'sending'].includes(status) && (
          <button
            type="button"
            onClick={() => act('pause')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[rgba(255,255,255,0.15)] text-white hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </button>
        )}
        {status === 'paused' && (
          <button
            type="button"
            onClick={() => act('resume')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Resume
          </button>
        )}
        {['queued', 'sending', 'paused'].includes(status) && (
          <button
            type="button"
            onClick={() => act('cancel')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[rgba(255,255,255,0.15)] text-[#A0A0A0] hover:text-red-400 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto inline-flex items-center gap-1 text-xs text-[#A0A0A0] hover:text-white"
        >
          Recipients
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && <RecipientDetails campaignId={campaign.id} />}
    </div>
  );
}

function SuppressionList() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const q = query(collection(db, 'emailSuppressions'), orderBy('lastEventAt', 'desc'), limit(200));
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.error('HistoryPanel: suppressions error:', err);
        setRows([]);
      }
    );
  }, [open]);

  async function remove(row) {
    if (!window.confirm(`Allow emails to ${row.email} again? Only do this if the address works now.`)) return;
    try {
      await deleteDoc(doc(db, 'emailSuppressions', row.id));
    } catch (err) {
      console.error('HistoryPanel: remove suppression error:', err);
      toast.error(err?.message || 'Could not remove the address.');
    }
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left"
      >
        <Ban className="w-4 h-4 text-[#A0A0A0]" />
        <span className="text-sm font-semibold text-white flex-1">Bounced and spam-reported addresses</span>
        <ChevronDown className={`w-4 h-4 text-[#A0A0A0] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <p className="text-xs text-[#5a6a7a]">
            Added automatically by ZeptoMail when an address hard-bounces or the recipient marks an email as spam. Admin
            email skips them.
          </p>
          {rows === null ? (
            <p className="text-xs text-[#5a6a7a]">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-[#5a6a7a]">None yet.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-[rgba(255,255,255,0.05)]">
              {rows.map((r) => (
                <li key={r.id} className="py-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white break-all">{r.email}</p>
                    <p className="text-xs text-[#A0A0A0] break-words">
                      {REASON_LABELS[r.reason] || r.reason}
                      {r.detail && ` · ${r.detail}`}
                      {r.lastEventAt && ` · ${formatDateTime(r.lastEventAt)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className="text-xs text-[#A0A0A0] hover:text-white flex-shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function HistoryPanel() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'emailCampaigns'), orderBy('createdAt', 'desc'), limit(30));
    return onSnapshot(
      q,
      (snap) => {
        setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('HistoryPanel: snapshot error:', err);
        setLoading(false);
      }
    );
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-32 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.15)] p-8 text-center text-sm text-[#A0A0A0]">
          <History className="w-5 h-5 mx-auto mb-2" />
          Nothing sent yet.
        </div>
      ) : (
        campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)
      )}
      <SuppressionList />
    </div>
  );
}
