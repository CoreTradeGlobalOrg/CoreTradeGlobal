'use client';

/**
 * RfqListTab — every RFQ on the platform (requests/*), newest first,
 * whether or not it has quotes: member RFQs, guest RFQs and guest RFQs
 * still waiting for their email confirmation (pending_verification).
 *
 * Delete removes the RFQ, its quotes and the id from the owner's
 * requestIds (for spam or test RFQs).
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  collection, getDocs, orderBy, query, writeBatch, doc, arrayRemove, deleteField,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ExternalLink, Trash2 } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { revalidatePublicPage } from '@/lib/revalidatePublicPage';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';
import { formatDate, toMillis, searchText } from './quoteUtils';
import { QuotesToolbar, StatCard, StatusPill, EmptyState, ListSkeleton } from './QuotesShared';

const RFQ_STATUS_CONFIG = {
  pending_verification: { label: 'Awaiting email', color: 'text-orange-400 bg-orange-900/20 border-orange-700/30' },
  active: { label: 'Active', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
  closed: { label: 'Closed', color: 'text-gray-400 bg-gray-900/20 border-gray-700/30' },
};

function isGuestRfq(rfq, owner) {
  return rfq.source === 'guest' || owner?.source === 'guest_rfq';
}

/** Admin sees the real identity; anonymous guests are labelled as such. */
function ownerLabel(owner) {
  if (!owner) return 'Deleted user';
  if (owner.source === 'guest_rfq' && !owner.identitySetAt) return 'Anonymous buyer';
  return owner.companyName || owner.displayName || owner.email || owner.id?.slice(0, 8) || '—';
}

function GuestBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
      Guest
    </span>
  );
}

export function RfqListTab({ userMap }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setItems(rows);
      } catch (err) {
        console.error('Failed to load RFQs:', err);
        toast.error('Failed to load RFQs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {};
    items.forEach((i) => { counts[i.status || 'active'] = (counts[i.status || 'active'] || 0) + 1; });
    return counts;
  }, [items]);

  const guestCount = useMemo(
    () => items.filter((i) => isGuestRfq(i, userMap[i.userId])).length,
    [items, userMap]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== 'all' && (i.status || 'active') !== statusFilter) return false;
      if (!q) return true;
      const owner = userMap[i.userId];
      return searchText(
        i.productName, i.title, i.description, i.targetCountry,
        owner?.companyName, owner?.displayName, owner?.email
      ).includes(q);
    });
  }, [items, statusFilter, searchQuery, userMap]);

  const handleDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleting(true);
    try {
      const quotesSnap = await getDocs(collection(db, 'requests', target.id, 'quotes'));
      const batch = writeBatch(db);
      quotesSnap.docs.forEach((q) => batch.delete(q.ref));
      batch.delete(doc(db, 'requests', target.id));
      const owner = userMap[target.userId];
      if (owner) {
        batch.update(doc(db, 'users', target.userId), {
          requestIds: arrayRemove(target.id),
          ...(owner.pendingGuestRfqId === target.id && { pendingGuestRfqId: deleteField() }),
        });
      }
      await batch.commit();
      await revalidatePublicPage('request', target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      toast.success('RFQ deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete RFQ:', err);
      toast.error('Failed to delete RFQ');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <ListSkeleton />;

  const title = (rfq) => rfq.productName || rfq.title || 'Untitled RFQ';
  const isLive = (rfq) => (rfq.status || 'active') === 'active';

  const renderActions = (rfq) => (
    <div className="flex items-center gap-2 justify-end">
      {isLive(rfq) && (
        <Link
          href={`/request/${rfq.id}`}
          title="View RFQ"
          className="text-[#FFD700] hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      )}
      <button
        type="button"
        onClick={() => setDeleteTarget(rfq)}
        title="Delete RFQ"
        aria-label="Delete RFQ"
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard value={items.length} label="Total RFQs" tone="gold" />
        <StatCard value={statusCounts.active || 0} label="Active" tone="green" />
        <StatCard value={statusCounts.pending_verification || 0} label="Awaiting Email" tone="yellow" />
        <StatCard value={guestCount} label="Guest RFQs" tone="gold" />
      </div>

      <QuotesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by product, buyer, email or country..."
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={Object.entries(RFQ_STATUS_CONFIG).map(([value, c]) => ({
          value,
          label: `${c.label} (${statusCounts[value] || 0})`,
        }))}
        totalCount={items.length}
      />

      <p className="text-xs text-[#A0A0A0] mb-3">Showing {filtered.length} of {items.length} RFQs</p>

      {filtered.length === 0 ? (
        <EmptyState text="No RFQs found." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[rgba(255,255,255,0.03)] text-left text-xs text-[#A0A0A0] uppercase tracking-wide">
                    <th className="p-3">RFQ</th>
                    <th className="p-3">Buyer</th>
                    <th className="p-3">Target Country</th>
                    <th className="p-3">Quotes</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rfq) => {
                    const owner = userMap[rfq.userId];
                    return (
                      <tr key={rfq.id} className="border-t border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-white truncate max-w-[240px]">{title(rfq)}</div>
                          {rfq.quantity && (
                            <div className="text-xs text-[#A0A0A0]">{rfq.quantity} {rfq.unit || ''}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[#D0D0D0] truncate max-w-[180px]">{ownerLabel(owner)}</span>
                            {isGuestRfq(rfq, owner) && <GuestBadge />}
                          </div>
                          {owner?.email && <div className="text-xs text-[#A0A0A0] truncate max-w-[220px]">{owner.email}</div>}
                        </td>
                        <td className="p-3 text-[#D0D0D0]">{rfq.targetCountry || '—'}</td>
                        <td className="p-3 text-white">{Number(rfq.quoteCount) || 0}</td>
                        <td className="p-3"><StatusPill status={rfq.status || 'active'} config={RFQ_STATUS_CONFIG} /></td>
                        <td className="p-3 text-[#A0A0A0] whitespace-nowrap">{formatDate(rfq.createdAt)}</td>
                        <td className="p-3">{renderActions(rfq)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((rfq) => {
              const owner = userMap[rfq.userId];
              return (
                <div key={rfq.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{title(rfq)}</div>
                      <div className="text-xs text-[#A0A0A0]">{formatDate(rfq.createdAt)}</div>
                    </div>
                    <StatusPill status={rfq.status || 'active'} config={RFQ_STATUS_CONFIG} />
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#A0A0A0] flex-shrink-0">Buyer:</span>
                      <span className="text-white truncate">{ownerLabel(owner)}</span>
                      {isGuestRfq(rfq, owner) && <GuestBadge />}
                    </div>
                    {owner?.email && <div className="text-xs text-[#A0A0A0] truncate">{owner.email}</div>}
                    <div className="flex gap-2"><span className="text-[#A0A0A0]">Quotes:</span><span className="text-white">{Number(rfq.quoteCount) || 0}</span></div>
                  </div>
                  <div className="flex justify-end pt-3 border-t border-[rgba(255,255,255,0.05)]">
                    {renderActions(rfq)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete RFQ"
        message={deleteTarget
          ? `Delete "${title(deleteTarget)}" and all of its quotes? This action cannot be undone.`
          : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

export default RfqListTab;
