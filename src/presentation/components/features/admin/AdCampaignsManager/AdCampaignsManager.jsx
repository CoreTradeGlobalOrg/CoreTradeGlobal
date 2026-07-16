/**
 * AdCampaignsManager
 *
 * Admin tab that lists ad placements — the paid slots that render on
 * the homepage Hero, ProductGrid, and Showcase carousel. Shows every
 * campaign the platform has run with filters (type / status) and a
 * search box, and gives one-click Pause / Resume / End Now / Duplicate
 * / Delete + inline Edit via the shared AdCampaignForm dialog.
 *
 * Impression + click counters live on each doc; the CF trackAd*
 * callables update them from the public side, we just display them
 * here.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Pause,
  Play,
  StopCircle,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
} from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import {
  AD_STATUSES,
  AD_STATUS_LABELS,
  AD_TYPES,
  AD_TYPE_LABELS,
} from '@/core/constants/adTypes';
import { AdCampaignForm } from './AdCampaignForm';

const STATUS_STYLE = {
  [AD_STATUSES.ACTIVE]: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  [AD_STATUSES.SCHEDULED]: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
  [AD_STATUSES.PAUSED]: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  [AD_STATUSES.EXPIRED]: 'bg-gray-500/15 border-gray-500/40 text-gray-300',
};

const TYPE_FILTERS = ['all', AD_TYPES.FEATURED, AD_TYPES.HERO, AD_TYPES.CAROUSEL];
const STATUS_FILTERS = [
  'all',
  AD_STATUSES.ACTIVE,
  AD_STATUSES.SCHEDULED,
  AD_STATUSES.PAUSED,
  AD_STATUSES.EXPIRED,
];

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdCampaignsManager() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('ads snapshot error:', err);
        toast.error('Failed to load ads.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return ads.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (statusFilter !== 'all' && (a.status || AD_STATUSES.SCHEDULED) !== statusFilter) return false;
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return (
        (a.companyName || '').toLowerCase().includes(s) ||
        (a.description || '').toLowerCase().includes(s) ||
        (a.linkUrl || '').toLowerCase().includes(s)
      );
    });
  }, [ads, typeFilter, statusFilter, search]);

  const counts = useMemo(() => ({
    all: ads.length,
    [AD_STATUSES.ACTIVE]: ads.filter((a) => a.status === AD_STATUSES.ACTIVE).length,
    [AD_STATUSES.SCHEDULED]: ads.filter((a) => a.status === AD_STATUSES.SCHEDULED).length,
    [AD_STATUSES.PAUSED]: ads.filter((a) => a.status === AD_STATUSES.PAUSED).length,
    [AD_STATUSES.EXPIRED]: ads.filter((a) => a.status === AD_STATUSES.EXPIRED).length,
  }), [ads]);

  const patch = async (id, next) => {
    setBusyId(id);
    try {
      await updateDoc(doc(db, 'ads', id), { ...next, updatedAt: serverTimestamp() });
      toast.success('Updated');
    } catch (err) {
      console.error('ad update failed:', err);
      toast.error('Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const pause = (id) => patch(id, { status: AD_STATUSES.PAUSED });
  const resume = (id, ad) => {
    // Coming out of pause: pick the correct status based on the current time.
    const now = Date.now();
    const startMs = ad.startDate?.toDate?.().getTime?.() ?? 0;
    const endMs = ad.endDate?.toDate?.().getTime?.() ?? 0;
    let next = AD_STATUSES.SCHEDULED;
    if (now >= startMs && now <= endMs) next = AD_STATUSES.ACTIVE;
    else if (now > endMs) next = AD_STATUSES.EXPIRED;
    return patch(id, { status: next });
  };
  const endNow = (id) => patch(id, {
    status: AD_STATUSES.EXPIRED,
    endDate: Timestamp.now(),
  });

  const duplicate = async (ad) => {
    setBusyId(ad.id);
    try {
      const { id, createdAt, updatedAt, impressions, clicks, ...rest } = ad;
      // eslint-disable-line @typescript-eslint/no-unused-vars
      void id; void createdAt; void updatedAt; void impressions; void clicks;
      await addDoc(collection(db, 'ads'), {
        ...rest,
        status: AD_STATUSES.SCHEDULED,
        impressions: 0,
        clicks: 0,
        createdAt: Timestamp.now(),
        createdBy: user?.uid || null,
      });
      toast.success('Ad duplicated as a scheduled draft');
    } catch (err) {
      console.error('ad duplicate failed:', err);
      toast.error('Duplicate failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this ad campaign? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await deleteDoc(doc(db, 'ads', id));
      toast.success('Ad deleted');
    } catch (err) {
      console.error('ad delete failed:', err);
      toast.error('Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const startEdit = (ad) => {
    setEditing(ad);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-8 text-center text-[#A0A0A0]">
        <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
        Loading campaigns…
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <button
          type="button"
          onClick={startCreate}
          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm hover:shadow-[0_6px_18px_rgba(255,215,0,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>

        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                typeFilter === t
                  ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.4)]'
              }`}
            >
              {t === 'all' ? 'All types' : AD_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.4)]'
              }`}
            >
              {s === 'all' ? `All (${counts.all})` : `${AD_STATUS_LABELS[s]} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, description, link…"
            className="w-full pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-10 text-center text-[#A0A0A0]">
          <p className="font-semibold text-white mb-1">No campaigns yet</p>
          <p className="text-sm">
            {typeFilter !== 'all' || statusFilter !== 'all' || search
              ? 'Try widening filters or clearing search.'
              : 'Create the first ad campaign to book a placement slot.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ad) => {
            const status = ad.status || AD_STATUSES.SCHEDULED;
            const statusClass = STATUS_STYLE[status] || STATUS_STYLE[AD_STATUSES.SCHEDULED];
            const isBusy = busyId === ad.id;
            return (
              <div
                key={ad.id}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.7)] to-[rgba(15,27,43,0.9)] p-4 md:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex items-center gap-3 md:min-w-[220px]">
                    {ad.companyLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ad.companyLogo}
                        alt={ad.companyName}
                        className="w-14 h-14 rounded-xl object-cover border border-[rgba(255,255,255,0.1)]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] flex items-center justify-center text-[#FFD700] font-bold text-lg">
                        {(ad.companyName || 'AD').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold text-base truncate">{ad.companyName || '—'}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusClass}`}>
                          {AD_STATUS_LABELS[status] || status}
                        </span>
                      </div>
                      <p className="text-xs text-[#A0A0A0]">{AD_TYPE_LABELS[ad.type] || ad.type}</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#c8d3e0] leading-snug line-clamp-2">{ad.description || '—'}</p>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <Stat label="Window" value={`${fmtDate(ad.startDate)} → ${fmtDate(ad.endDate)}`} />
                      <Stat label="Week" value={`${ad.campaignMonth || '—'} · ${ad.campaignWeek || '—'}`} />
                      <Stat label="Priority" value={String(ad.priority ?? 0)} />
                      <Stat label="Metrics" value={<span className="inline-flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> {ad.impressions ?? 0} <MousePointerClick className="w-3.5 h-3.5 ml-2" /> {ad.clicks ?? 0}</span>} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {ad.linkUrl && (
                      <a
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] transition-all no-underline"
                        style={{ color: '#ffffff' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(ad)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    {status === AD_STATUSES.PAUSED ? (
                      <button
                        type="button"
                        onClick={() => resume(ad.id, ad)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-60 transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Resume
                      </button>
                    ) : status !== AD_STATUSES.EXPIRED ? (
                      <button
                        type="button"
                        onClick={() => pause(ad.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/25 disabled:opacity-60 transition-all"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                      </button>
                    ) : null}
                    {status !== AD_STATUSES.EXPIRED && (
                      <button
                        type="button"
                        onClick={() => endNow(ad.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-500/15 border border-gray-500/40 text-gray-300 text-xs font-semibold hover:bg-gray-500/25 disabled:opacity-60 transition-all"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        End Now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => duplicate(ad)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(ad.id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/20 disabled:opacity-60 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <AdCampaignForm
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] font-semibold mb-0.5">{label}</p>
      <div className="text-xs text-white">{value}</div>
    </div>
  );
}

export default AdCampaignsManager;
