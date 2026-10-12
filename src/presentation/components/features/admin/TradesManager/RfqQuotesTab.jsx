'use client';

/**
 * RfqQuotesTab — every quote submitted on an RFQ (requests/{id}/quotes),
 * newest first, with full quote terms in the expandable panel.
 *
 * Delete removes the quote and decrements the RFQ's quoteCount.
 * (Attachment files in Storage are left as-is — admin has no Storage
 * delete permission on that path.)
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  collection, collectionGroup, getDocs, query, where, documentId, writeBatch, doc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, ExternalLink, Paperclip, Trash2 } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';
import {
  formatDate, formatPrice, toMillis, userLabel, searchText, humanize,
  paymentTermLabel, shippingMethodLabel, chunk,
} from './quoteUtils';
import { QuotesToolbar, StatCard, StatusPill, EmptyState, ListSkeleton } from './QuotesShared';

const QUOTE_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30' },
  accepted: { label: 'Accepted', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-900/20 border-red-700/30' },
  expired: { label: 'Expired', color: 'text-gray-400 bg-gray-900/20 border-gray-700/30' },
};

function quoterLabel(quote, userMap) {
  return quote.userInfo?.companyName || quote.userInfo?.displayName || userLabel(userMap, quote.userId);
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[#A0A0A0]">{label}</div>
      <div className="text-sm text-white break-words">{value || '—'}</div>
    </div>
  );
}

function QuoteDetails({ quote, userMap }) {
  const quoter = userMap[quote.userId];
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Detail label="Quoted By" value={quote.userInfo?.displayName || quoter?.displayName} />
        <Detail label="Company" value={quote.userInfo?.companyName || quoter?.companyName} />
        <Detail label="Email" value={quote.userInfo?.email || quoter?.email} />
        <Detail label="Unit Price" value={formatPrice(quote.unitPrice, quote.currency)} />
        <Detail label="Incoterms" value={quote.incoterms} />
        <Detail label="Shipping" value={shippingMethodLabel(quote.shippingMethod)} />
        <Detail label="Port of Loading" value={quote.portOfLoading} />
        <Detail label="Lead Time" value={quote.leadTime} />
        <Detail label="MOQ" value={quote.moq} />
        <Detail label="Supply Capacity" value={quote.supplyCapacity} />
        <Detail label="Payment Terms" value={paymentTermLabel(quote.paymentTerms)} />
        <Detail label="Warranty" value={humanize(quote.warranty)} />
        <Detail label="Price Valid Until" value={quote.priceValidUntil ? formatDate(quote.priceValidUntil) : '—'} />
      </div>
      {quote.specifications && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[#A0A0A0] mb-1">Specifications / Notes</div>
          <p className="text-sm text-[#D0D0D0] whitespace-pre-wrap break-words">{quote.specifications}</p>
        </div>
      )}
      {Array.isArray(quote.attachments) && quote.attachments.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[#A0A0A0] mb-1">Attachments</div>
          <div className="flex flex-wrap gap-2">
            {quote.attachments.map((a, i) => (
              <a
                key={a.url || i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs text-[#FFD700] hover:text-white max-w-full"
              >
                <Paperclip className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{a.name || `File ${i + 1}`}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RfqQuotesTab({ userMap }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const quoteSnap = await getDocs(collectionGroup(db, 'quotes'));
        // Only requests/{id}/quotes — guard against any other "quotes" subcollection
        const quotes = quoteSnap.docs
          .filter((d) => d.ref.parent.parent?.parent?.id === 'requests')
          .map((d) => ({ id: d.id, requestId: d.ref.parent.parent.id, ...d.data() }));

        // Load parent RFQs in batches of 30 (Firestore "in" limit)
        const requestIds = [...new Set(quotes.map((q) => q.requestId))];
        const requestMap = {};
        const snaps = await Promise.all(
          chunk(requestIds, 30).map((ids) =>
            getDocs(query(collection(db, 'requests'), where(documentId(), 'in', ids)))
          )
        );
        snaps.forEach((s) => s.docs.forEach((d) => { requestMap[d.id] = { id: d.id, ...d.data() }; }));

        const rows = quotes.map((q) => ({ ...q, request: requestMap[q.requestId] || null }));
        rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setItems(rows);
      } catch (err) {
        console.error('Failed to load RFQ quotes:', err);
        toast.error('Failed to load RFQ quotes');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {};
    items.forEach((i) => { const s = i.status || 'pending'; counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== 'all' && (i.status || 'pending') !== statusFilter) return false;
      if (!q) return true;
      const owner = userMap[i.request?.userId];
      return searchText(
        i.request?.title, i.request?.productName,
        i.userInfo?.displayName, i.userInfo?.companyName, i.userInfo?.email,
        owner?.companyName, owner?.displayName, owner?.email,
      ).includes(q);
    });
  }, [items, statusFilter, searchQuery, userMap]);

  const handleDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleting(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'requests', target.requestId, 'quotes', target.id));
      if (target.request) {
        batch.update(doc(db, 'requests', target.requestId), {
          quoteCount: Math.max(0, (Number(target.request.quoteCount) || 1) - 1),
        });
      }
      await batch.commit();
      setItems((prev) => prev
        .filter((i) => i.id !== target.id || i.requestId !== target.requestId)
        // keep the local quoteCount in sync for further deletes on the same RFQ
        .map((i) => (i.requestId === target.requestId && i.request
          ? { ...i, request: { ...i.request, quoteCount: Math.max(0, (Number(i.request.quoteCount) || 1) - 1) } }
          : i)));
      toast.success('Quote deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete RFQ quote:', err);
      toast.error('Failed to delete quote');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <ListSkeleton />;

  const rfqTitle = (item) => item.request?.title || item.request?.productName || 'Deleted RFQ';
  const rowKey = (item) => `${item.requestId}_${item.id}`;

  const renderActions = (item) => (
    <div className="flex items-center gap-2 justify-end">
      {item.request && (
        <Link
          href={`/request/${item.requestId}`}
          onClick={(e) => e.stopPropagation()}
          title="View RFQ"
          className="text-[#FFD700] hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
        title="Delete quote"
        aria-label="Delete quote"
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard value={items.length} label="Total Quotes" tone="gold" />
        <StatCard value={statusCounts.pending || 0} label="Pending" tone="yellow" />
        <StatCard value={statusCounts.accepted || 0} label="Accepted" tone="green" />
      </div>

      <QuotesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by RFQ, supplier or buyer..."
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={Object.entries(QUOTE_STATUS_CONFIG).map(([value, c]) => ({
          value,
          label: `${c.label} (${statusCounts[value] || 0})`,
        }))}
        totalCount={items.length}
      />

      <p className="text-xs text-[#A0A0A0] mb-3">Showing {filtered.length} of {items.length} quotes</p>

      {filtered.length === 0 ? (
        <EmptyState text="No RFQ quotes found." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[rgba(255,255,255,0.03)] text-left text-xs text-[#A0A0A0] uppercase tracking-wide">
                    <th className="p-3" />
                    <th className="p-3">RFQ</th>
                    <th className="p-3">RFQ Owner</th>
                    <th className="p-3">Quoted By</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3">Incoterms</th>
                    <th className="p-3">Lead Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const key = rowKey(item);
                    const isExpanded = expandedId === key;
                    return (
                      <React.Fragment key={key}>
                        <tr
                          className="border-t border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : key)}
                        >
                          <td className="p-3">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-[#A0A0A0]" />
                              : <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />}
                          </td>
                          <td className="p-3">
                            <div className={`font-medium truncate max-w-[220px] ${item.request ? 'text-white' : 'text-[#A0A0A0] italic'}`}>{rfqTitle(item)}</div>
                            {item.request?.quantity && (
                              <div className="text-xs text-[#A0A0A0]">{item.request.quantity} {item.request.unit || ''}</div>
                            )}
                          </td>
                          <td className="p-3 text-[#D0D0D0] truncate max-w-[160px]">{item.request ? userLabel(userMap, item.request.userId) : '—'}</td>
                          <td className="p-3 text-white truncate max-w-[160px]">{quoterLabel(item, userMap)}</td>
                          <td className="p-3 text-white whitespace-nowrap">{formatPrice(item.unitPrice, item.currency)}</td>
                          <td className="p-3 text-[#D0D0D0]">{item.incoterms || '—'}</td>
                          <td className="p-3 text-[#D0D0D0] whitespace-nowrap">{item.leadTime || '—'}</td>
                          <td className="p-3"><StatusPill status={item.status || 'pending'} config={QUOTE_STATUS_CONFIG} /></td>
                          <td className="p-3 text-[#A0A0A0] whitespace-nowrap">{formatDate(item.createdAt)}</td>
                          <td className="p-3">{renderActions(item)}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="bg-[rgba(255,255,255,0.02)]">
                              <QuoteDetails quote={item} userMap={userMap} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => {
              const key = rowKey(item);
              const isExpanded = expandedId === key;
              return (
                <div key={key} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${item.request ? 'text-white' : 'text-[#A0A0A0] italic'}`}>{rfqTitle(item)}</div>
                        <div className="text-xs text-[#A0A0A0]">{formatDate(item.createdAt)}</div>
                      </div>
                      <StatusPill status={item.status || 'pending'} config={QUOTE_STATUS_CONFIG} />
                    </div>
                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex gap-2 min-w-0"><span className="text-[#A0A0A0] flex-shrink-0">Quoted by:</span><span className="text-white truncate">{quoterLabel(item, userMap)}</span></div>
                      <div className="flex gap-2 min-w-0"><span className="text-[#A0A0A0] flex-shrink-0">RFQ owner:</span><span className="text-white truncate">{item.request ? userLabel(userMap, item.request.userId) : '—'}</span></div>
                      <div className="flex gap-2"><span className="text-[#A0A0A0]">Price:</span><span className="text-white">{formatPrice(item.unitPrice, item.currency)}{item.incoterms ? ` · ${item.incoterms}` : ''}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : key)}
                        className="flex items-center gap-1 text-xs text-[#A0A0A0] hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Details
                      </button>
                      {renderActions(item)}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[rgba(255,255,255,0.05)]">
                      <QuoteDetails quote={item} userMap={userMap} />
                    </div>
                  )}
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
        title="Delete Quote"
        message={deleteTarget
          ? `Delete the quote from "${quoterLabel(deleteTarget, userMap)}" on "${rfqTitle(deleteTarget)}"? This action cannot be undone.`
          : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
