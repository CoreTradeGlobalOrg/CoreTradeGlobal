/**
 * AdInquiriesManager
 *
 * Admin tab that lists rows from the `adInquiries` collection ordered
 * newest first. Provides status filtering (new / handled / archived),
 * a search box, and inline actions to change status + record a short
 * admin note. Deletion is available for GDPR / spam cleanup.
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
import { Mail, ExternalLink, RefreshCw, Trash2, Check, Archive, Search, Copy, MessageSquare, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { AD_PACKAGES } from '@/core/constants/adTypes';
import { AdCampaignForm } from '../AdCampaignsManager/AdCampaignForm';

const STATUS_META = {
  new: { label: 'New', bg: 'bg-[#FFD700]/15', border: 'border-[#FFD700]/40', text: 'text-[#FFD700]' },
  handled: { label: 'Handled', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  converted: { label: 'Converted', bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-300' },
  archived: { label: 'Archived', bg: 'bg-gray-500/15', border: 'border-gray-500/40', text: 'text-gray-300' },
};

const STATUS_FILTERS = ['all', 'new', 'converted', 'handled', 'archived'];

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdInquiriesManager() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [notes, setNotes] = useState({});
  const [convertingInquiry, setConvertingInquiry] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'adInquiries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setInquiries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('adInquiries snapshot error:', err);
        toast.error('Failed to load inquiries');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = inquiries.filter((i) => {
    if (statusFilter !== 'all' && (i.status || 'new') !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      (i.company || '').toLowerCase().includes(s) ||
      (i.email || '').toLowerCase().includes(s) ||
      (i.contactName || '').toLowerCase().includes(s) ||
      (i.package || '').toLowerCase().includes(s)
    );
  });

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? inquiries.length : inquiries.filter((i) => (i.status || 'new') === s).length;
    return acc;
  }, {});

  const setStatus = async (id, next) => {
    setSavingId(id);
    try {
      const patch = { status: next };
      if (next === 'handled') {
        patch.handledAt = serverTimestamp();
        patch.handledBy = user?.uid || null;
      }
      const adminNote = notes[id];
      if (typeof adminNote === 'string' && adminNote.trim().length > 0) {
        patch.adminNote = adminNote.trim().slice(0, 500);
      }
      await updateDoc(doc(db, 'adInquiries', id), patch);
      toast.success(`Marked as ${next}`);
    } catch (err) {
      console.error('update inquiry failed:', err);
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  const removeInquiry = async (id) => {
    if (!window.confirm('Delete this inquiry? This cannot be undone.')) return;
    setSavingId(id);
    try {
      await deleteDoc(doc(db, 'adInquiries', id));
      toast.success('Inquiry deleted');
    } catch (err) {
      console.error('delete inquiry failed:', err);
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
        Loading inquiries…
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
              {s === 'all' ? 'All' : STATUS_META[s]?.label || s} <span className="opacity-60 ml-1">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, email, package…"
            className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-10 text-center text-[#A0A0A0]">
          <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white mb-1">No inquiries yet</p>
          <p className="text-sm">
            {statusFilter !== 'all' || search
              ? 'Try widening filters or clearing search.'
              : 'When someone submits the ad inquiry form at /pricing/inquire, it lands here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => {
            const status = (inq.status || 'new');
            const meta = STATUS_META[status] || STATUS_META.new;
            const isOpen = expandedId === inq.id;
            const isSaving = savingId === inq.id;
            return (
              <div
                key={inq.id}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.7)] to-[rgba(15,27,43,0.9)] p-4 md:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-white font-bold text-base truncate">{inq.company || '—'}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${meta.bg} ${meta.border} ${meta.text}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#c8d3e0] mb-1 flex items-center gap-2 flex-wrap">
                      <span>{inq.package || '—'}</span>
                      {inq.productSnapshot?.name && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(255,215,0,0.12)] border border-[rgba(255,215,0,0.35)] text-[#FFD700]">
                          Pinned: {inq.productSnapshot.name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#A0A0A0]">
                      {inq.contactName || '—'} · {inq.campaignMonth || '—'} · {inq.campaignWeek || '—'} · {fmtDate(inq.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${inq.email}`}
                      style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-xs font-bold hover:shadow-[0_6px_16px_rgba(255,215,0,0.3)] transition-all no-underline"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Reply
                    </a>
                    {inq.website && (
                      <a
                        href={inq.website}
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
                      onClick={() => setExpandedId(isOpen ? null : inq.id)}
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
                        <span className="text-white">{inq.contactName || '—'}</span>
                      </Row>
                      <Row label="Email">
                        <button type="button" onClick={() => copy(inq.email)} className="inline-flex items-center gap-1.5 text-[#FFD700] hover:underline">
                          {inq.email || '—'}
                          <Copy className="w-3 h-3" />
                        </button>
                      </Row>
                      <Row label="Website">
                        {inq.website ? (
                          <a href={inq.website} target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                            {inq.website}
                          </a>
                        ) : (
                          <span className="text-[#A0A0A0]">—</span>
                        )}
                      </Row>
                      <Row label="Package">
                        <span className="text-white">{inq.package || '—'}</span>
                      </Row>
                      <Row label="Campaign Month">
                        <span className="text-white">{inq.campaignMonth || '—'}</span>
                      </Row>
                      <Row label="Campaign Week">
                        <span className="text-white">{inq.campaignWeek || '—'}</span>
                      </Row>
                      <Row label="Submitted">
                        <span className="text-white">{fmtDate(inq.createdAt)}</span>
                      </Row>
                      {inq.handledAt && (
                        <Row label="Handled">
                          <span className="text-white">{fmtDate(inq.handledAt)}</span>
                        </Row>
                      )}
                    </div>

                    {inq.productSnapshot && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">Pinned Product</p>
                        <div className="rounded-lg bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.25)] p-3 flex items-center gap-3">
                          {inq.productSnapshot.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={inq.productSnapshot.image}
                              alt={inq.productSnapshot.name || 'Product'}
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                            />
                          ) : (
                            <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
                          )}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{inq.productSnapshot.name || '—'}</p>
                            {Number.isFinite(Number(inq.productSnapshot.price)) && inq.productSnapshot.price > 0 && (
                              <p className="text-[#FFD700] text-xs">
                                {inq.productSnapshot.currency || 'USD'} {Number(inq.productSnapshot.price).toLocaleString()}
                              </p>
                            )}
                            {inq.productId && (
                              <a
                                href={`/product/${inq.productId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[#A0A0A0] hover:text-[#FFD700] inline-flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="w-3 h-3" /> Open product
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {inq.brief && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">Brief</p>
                        <div className="rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-3 text-sm text-[#c8d3e0] whitespace-pre-wrap">
                          {inq.brief}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">Admin note</p>
                      <textarea
                        rows={2}
                        maxLength={500}
                        placeholder={inq.adminNote || 'Internal note (up to 500 chars)'}
                        value={notes[inq.id] ?? inq.adminNote ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [inq.id]: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700] resize-y"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {status !== 'converted' && (
                        <button
                          type="button"
                          onClick={() => setConvertingInquiry(inq)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-xs hover:shadow-[0_6px_16px_rgba(255,215,0,0.3)] disabled:opacity-60 transition-all"
                          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          Convert to Ad
                        </button>
                      )}
                      {status !== 'handled' && (
                        <button
                          type="button"
                          onClick={() => setStatus(inq.id, 'handled')}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-60 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark as Handled
                        </button>
                      )}
                      {status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => setStatus(inq.id, 'archived')}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-500/15 border border-gray-500/40 text-gray-300 text-xs font-semibold hover:bg-gray-500/25 disabled:opacity-60 transition-all"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                      )}
                      {status !== 'new' && (
                        <button
                          type="button"
                          onClick={() => setStatus(inq.id, 'new')}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.4)] text-[#FFD700] text-xs font-semibold hover:bg-[rgba(255,215,0,0.2)] disabled:opacity-60 transition-all"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeInquiry(inq.id)}
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

      {convertingInquiry && (
        <AdCampaignForm
          prefill={buildPrefillFromInquiry(convertingInquiry)}
          onClose={() => setConvertingInquiry(null)}
          onSaved={async (adId) => {
            try {
              await updateDoc(doc(db, 'adInquiries', convertingInquiry.id), {
                status: 'converted',
                linkedAdId: adId,
                handledAt: serverTimestamp(),
                handledBy: user?.uid || null,
              });
            } catch (err) {
              console.error('inquiry -> converted patch failed:', err);
              toast.error('Ad created but inquiry status update failed.');
            } finally {
              setConvertingInquiry(null);
            }
          }}
        />
      )}
    </div>
  );
}

// Map an inquiry doc into the AdCampaignForm's `prefill` shape. Package
// name -> ad type via AD_PACKAGES; combined packages have no direct
// type so the form defaults to Featured and the admin picks manually.
function buildPrefillFromInquiry(inq) {
  const match = AD_PACKAGES.find((p) => p.value === inq.package);
  // If the visitor pinned a product, wire the ad creative to that product:
  // the ad link deep-links into the product page, the logo becomes the
  // first product image, and the description falls back to the product
  // name/description so the admin usually just clicks Save.
  const hasProduct = !!inq.productId && !!inq.productSnapshot;
  return {
    type: match?.type || null,
    companyName: inq.company || '',
    linkUrl: hasProduct ? `/product/${inq.productId}` : (inq.website || ''),
    companyLogo: hasProduct ? (inq.productSnapshot.image || '') : '',
    description: hasProduct
      ? (inq.productSnapshot.description || inq.productSnapshot.name || '')
      : '',
    badgeText: hasProduct ? 'Featured' : '',
    productId: hasProduct ? inq.productId : null,
    inquiryId: inq.id,
    campaignMonth: inq.campaignMonth || null,
    campaignWeek: inq.campaignWeek || null,
  };
}

function Row({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-0.5">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default AdInquiriesManager;
