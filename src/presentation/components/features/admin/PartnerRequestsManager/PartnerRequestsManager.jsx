/**
 * PartnerRequestsManager
 *
 * Admin tab for requests sent from /partnership (`partnerRequests`),
 * newest first. Status pipeline: New → In Review → Approved / Rejected,
 * plus Archived. Filters by status and partnership type, searches, and
 * keeps a short internal note per request. Admin access comes from the
 * global admin rule in firestore.rules. Layout follows AdInquiriesManager.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Mail, ExternalLink, RefreshCw, Trash2, Check, X, Archive, Search, Copy, MessageSquare, Eye, Handshake, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';
import { COUNTRIES } from '@/core/constants/countries';
import {
  PARTNER_TYPES,
  PARTNER_TYPE_LABELS,
  PARTNER_REQUEST_STATUSES as S,
  PARTNER_REQUEST_STATUS_LABELS,
} from '@/core/constants/partnerRequests';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';

const STATUS_STYLE = {
  [S.NEW]: 'bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]',
  [S.IN_REVIEW]: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
  [S.APPROVED]: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  [S.REJECTED]: 'bg-red-500/15 border-red-500/40 text-red-300',
  [S.ARCHIVED]: 'bg-gray-500/15 border-gray-500/40 text-gray-300',
};

const STATUS_FILTERS = ['all', S.NEW, S.IN_REVIEW, S.APPROVED, S.REJECTED, S.ARCHIVED];

// Buttons shown in the details panel; each hides when the request is
// already in that status.
const STATUS_ACTIONS = [
  { status: S.IN_REVIEW, label: 'Mark In Review', icon: Eye, className: 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25' },
  { status: S.APPROVED, label: 'Approve', icon: Check, className: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25' },
  { status: S.REJECTED, label: 'Reject', icon: X, className: 'bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20' },
  { status: S.ARCHIVED, label: 'Archive', icon: Archive, className: 'bg-gray-500/15 border-gray-500/40 text-gray-300 hover:bg-gray-500/25' },
  { status: S.NEW, label: 'Reopen', icon: RefreshCw, className: 'bg-[rgba(255,215,0,0.1)] border-[rgba(255,215,0,0.4)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.2)]' },
];

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function countryLabel(code) {
  return COUNTRIES.find((c) => c.value === code)?.label || code || '—';
}

export function PartnerRequestsManager() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.PARTNER_REQUESTS), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('partnerRequests snapshot error:', err);
        toast.error('Failed to load partner requests');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const statusOf = (r) => r.status || S.NEW;

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'all' && statusOf(r) !== statusFilter) return false;
    if (typeFilter !== 'all' && r.partnerType !== typeFilter) return false;
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      (r.company || '').toLowerCase().includes(s) ||
      (r.fullName || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      countryLabel(r.country).toLowerCase().includes(s)
    );
  });

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? requests.length : requests.filter((r) => statusOf(r) === s).length;
    return acc;
  }, {});

  // Saves the typed note together with the status change, or on its own
  // when `next` is null.
  const save = async (r, next) => {
    setSavingId(r.id);
    try {
      const patch = { updatedAt: serverTimestamp(), updatedBy: user?.uid || null };
      if (next) patch.status = next;
      const note = notes[r.id];
      if (typeof note === 'string') patch.adminNote = note.trim().slice(0, 1000);
      await updateDoc(doc(db, COLLECTIONS.PARTNER_REQUESTS, r.id), patch);
      toast.success(next ? `Marked as ${PARTNER_REQUEST_STATUS_LABELS[next]}` : 'Note saved');
    } catch (err) {
      console.error('update partner request failed:', err);
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this partner request? This cannot be undone.')) return;
    setSavingId(id);
    try {
      await deleteDoc(doc(db, COLLECTIONS.PARTNER_REQUESTS, id));
      toast.success('Partner request deleted');
    } catch (err) {
      console.error('delete partner request failed:', err);
      toast.error('Delete failed');
    } finally {
      setSavingId(null);
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-8 text-center text-[#A0A0A0]">
        <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
        Loading partner requests…
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all ${
                statusFilter === s
                  ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.4)]'
              }`}
            >
              {s === 'all' ? 'All' : PARTNER_REQUEST_STATUS_LABELS[s]} <span className="opacity-60 ml-1">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, name, email, country…"
            className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]"
          />
        </div>
      </div>

      {/* Partnership type filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] font-semibold mr-1">Type</span>
        {[{ value: 'all', label: 'All' }, ...PARTNER_TYPES].map((t) => {
          const count = t.value === 'all' ? requests.length : requests.filter((r) => r.partnerType === t.value).length;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                typeFilter === t.value
                  ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.4)]'
              }`}
            >
              {t.label} <span className="opacity-60 ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-10 text-center text-[#A0A0A0]">
          <Handshake className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white mb-1">No partner requests</p>
          <p className="text-sm">
            {statusFilter !== 'all' || typeFilter !== 'all' || search
              ? 'Try widening filters or clearing search.'
              : 'When someone sends the form at /partnership, it lands here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const status = statusOf(r);
            const isOpen = expandedId === r.id;
            const isSaving = savingId === r.id;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.7)] to-[rgba(15,27,43,0.9)] p-4 md:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-white font-bold text-base truncate">{r.company || '—'}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_STYLE[status] || STATUS_STYLE[S.NEW]}`}>
                        {PARTNER_REQUEST_STATUS_LABELS[status] || status}
                      </span>
                    </div>
                    <p className="text-sm text-[#c8d3e0] mb-1">{PARTNER_TYPE_LABELS[r.partnerType] || r.partnerType || '—'}</p>
                    <p className="text-xs text-[#A0A0A0] flex items-center gap-1.5 flex-wrap">
                      <span>{r.fullName || '—'}</span>
                      <span>·</span>
                      {r.country && <CountryFlag countryCode={r.country} size={12} />}
                      <span>{countryLabel(r.country)}</span>
                      <span>·</span>
                      <span>{fmtDate(r.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${r.email}`}
                      style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-xs font-bold hover:shadow-[0_6px_16px_rgba(255,215,0,0.3)] transition-all no-underline"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Reply
                    </a>
                    {r.website && (
                      <a
                        href={r.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] transition-all no-underline"
                        style={{ color: '#ffffff' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Site
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isOpen ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <Row label="Contact">
                        <span className="text-white">{r.fullName || '—'}</span>
                      </Row>
                      <Row label="Email">
                        <button type="button" onClick={() => copy(r.email)} className="inline-flex items-center gap-1.5 text-[#FFD700] hover:underline">
                          {r.email || '—'}
                          <Copy className="w-3 h-3" />
                        </button>
                      </Row>
                      <Row label="Phone">
                        {r.phone ? (
                          <a href={`tel:${r.phone}`} className="text-[#FFD700] hover:underline">{r.phone}</a>
                        ) : (
                          <span className="text-[#A0A0A0]">—</span>
                        )}
                      </Row>
                      <Row label="Website">
                        {r.website ? (
                          <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline break-all">
                            {r.website}
                          </a>
                        ) : (
                          <span className="text-[#A0A0A0]">—</span>
                        )}
                      </Row>
                      <Row label="Partnership Type">
                        <span className="text-white">{PARTNER_TYPE_LABELS[r.partnerType] || r.partnerType || '—'}</span>
                      </Row>
                      <Row label="Country">
                        <span className="text-white">{countryLabel(r.country)}</span>
                      </Row>
                      <Row label="Submitted">
                        <span className="text-white">{fmtDate(r.createdAt)}</span>
                      </Row>
                      {r.updatedAt && (
                        <Row label="Last Updated">
                          <span className="text-white">{fmtDate(r.updatedAt)}</span>
                        </Row>
                      )}
                      {r.userId && (
                        <Row label="Member">
                          <a href={`/profile/${r.userId}`} target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                            View profile
                          </a>
                        </Row>
                      )}
                    </div>

                    {r.message && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">Proposal</p>
                        <div className="rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-3 text-sm text-[#c8d3e0] whitespace-pre-wrap break-words">
                          {r.message}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">Admin note</p>
                      <textarea
                        rows={2}
                        maxLength={1000}
                        placeholder="Internal note (up to 1000 chars)"
                        value={notes[r.id] ?? r.adminNote ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700] resize-y"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {STATUS_ACTIONS.filter((a) => a.status !== status).map(({ status: next, label, icon: Icon, className }) => (
                        <button
                          key={next}
                          type="button"
                          onClick={() => save(r, next)}
                          disabled={isSaving}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold disabled:opacity-60 transition-all ${className}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => save(r, null)}
                        disabled={isSaving || typeof notes[r.id] !== 'string'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-40 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Note
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/20 disabled:opacity-60 transition-all ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-0.5">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default PartnerRequestsManager;
