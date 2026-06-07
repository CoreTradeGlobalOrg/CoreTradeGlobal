'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { DEAL_STATUS, OFFER_STATUS } from '@/core/constants/dealConstants';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import {
  Handshake,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Search,
} from 'lucide-react';

const STATUS_CONFIG = {
  [DEAL_STATUS.NEGOTIATING]: { label: 'Negotiating', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30' },
  [DEAL_STATUS.ACCEPTED]: { label: 'Accepted', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30' },
  [DEAL_STATUS.REJECTED]: { label: 'Rejected', color: 'text-red-400 bg-red-900/20 border-red-700/30' },
  [DEAL_STATUS.EXPIRED]: { label: 'Expired', color: 'text-gray-400 bg-gray-900/20 border-gray-700/30' },
  [DEAL_STATUS.WITHDRAWN]: { label: 'Withdrawn', color: 'text-orange-400 bg-orange-900/20 border-orange-700/30' },
  [DEAL_STATUS.CONTRACT_APPROVED]: { label: 'Contract Approved', color: 'text-purple-400 bg-purple-900/20 border-purple-700/30' },
  [DEAL_STATUS.PROVIDERS_SELECTED]: { label: 'In Transit', color: 'text-cyan-400 bg-cyan-900/20 border-cyan-700/30' },
  [DEAL_STATUS.DELIVERED]: { label: 'Delivered', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
};

const OFFER_STATUS_CONFIG = {
  [OFFER_STATUS.OPEN]: { label: 'Open', color: 'text-yellow-400' },
  [OFFER_STATUS.COUNTERED]: { label: 'Countered', color: 'text-blue-400' },
  [OFFER_STATUS.ACCEPTED]: { label: 'Accepted', color: 'text-green-400' },
  [OFFER_STATUS.REJECTED]: { label: 'Rejected', color: 'text-red-400' },
  [OFFER_STATUS.EXPIRED]: { label: 'Expired', color: 'text-gray-400' },
  [OFFER_STATUS.WITHDRAWN]: { label: 'Withdrawn', color: 'text-orange-400' },
};

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', CNY: '¥',
  AUD: 'A$', CAD: 'C$', INR: '₹', BRL: 'R$',
};

function formatDate(date) {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(price, currency) {
  if (!price) return '—';
  const symbol = CURRENCY_SYMBOLS[currency] || currency || '$';
  return `${symbol}${Number(price).toLocaleString()}`;
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'text-gray-400 bg-gray-900/20 border-gray-700/30' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function OfferStatusBadge({ status }) {
  const config = OFFER_STATUS_CONFIG[status] || { label: status, color: 'text-gray-400' };
  return <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>;
}

/**
 * Expandable row showing offers for a deal.
 */
function OffersPanel({ dealId, userMap }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const offersRef = collection(db, 'deals', dealId, 'offers');
        const q = query(offersRef, orderBy('round', 'asc'));
        const snap = await getDocs(q);
        setOffers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch offers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOffers();
  }, [dealId]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-20 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
      </div>
    );
  }

  if (offers.length === 0) {
    return <div className="p-4 text-sm text-[#A0A0A0]">No offers yet.</div>;
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">
        Offer History ({offers.length} rounds)
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#A0A0A0] uppercase tracking-wide">
              <th className="pb-2 pr-4">Round</th>
              <th className="pb-2 pr-4">Submitted By</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Price</th>
              <th className="pb-2 pr-4">Qty</th>
              <th className="pb-2 pr-4">Incoterm</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const submitter = userMap[offer.submittedBy];
              return (
                <tr key={offer.id} className="border-t border-[rgba(255,255,255,0.06)]">
                  <td className="py-2 pr-4 text-white font-medium">#{offer.round}</td>
                  <td className="py-2 pr-4 text-white">
                    {submitter?.companyName || submitter?.displayName || offer.submittedBy?.slice(0, 8)}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-medium ${offer.role === 'buyer' ? 'text-green-400' : 'text-[#FFD700]'}`}>
                      {offer.role === 'buyer' ? 'Buyer' : 'Seller'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-white">{formatPrice(offer.price, offer.currency)}</td>
                  <td className="py-2 pr-4 text-white">{offer.quantity || '—'} {offer.unit || ''}</td>
                  <td className="py-2 pr-4 text-white">{offer.incoterm || '—'}</td>
                  <td className="py-2 pr-4"><OfferStatusBadge status={offer.status} /></td>
                  <td className="py-2 text-[#A0A0A0]">{formatDate(offer.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TradesManager({ users = [] }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDeal, setExpandedDeal] = useState(null);

  // Build user lookup map
  const userMap = {};
  users.forEach((u) => { userMap[u.id] = u; });

  useEffect(() => {
    async function fetchDeals() {
      try {
        const dealsRef = collection(db, 'deals');
        const q = query(dealsRef, orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        setDeals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, []);

  const filteredDeals = deals.filter((deal) => {
    if (statusFilter !== 'all' && deal.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const buyer = userMap[deal.buyerId];
      const seller = userMap[deal.sellerId];
      const match =
        (deal.productName || '').toLowerCase().includes(q) ||
        (buyer?.companyName || '').toLowerCase().includes(q) ||
        (buyer?.displayName || '').toLowerCase().includes(q) ||
        (seller?.companyName || '').toLowerCase().includes(q) ||
        (seller?.displayName || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Stats
  const statusCounts = {};
  deals.forEach((d) => {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
        <div className="h-64 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl p-3 border bg-[#FFD700]/5 border-[#FFD700]/20">
          <p className="text-2xl font-bold text-white">{deals.length}</p>
          <p className="text-xs text-[#A0A0A0]">Total Deals</p>
        </div>
        <div className="rounded-xl p-3 border bg-yellow-900/10 border-yellow-700/20">
          <p className="text-2xl font-bold text-yellow-400">{statusCounts[DEAL_STATUS.NEGOTIATING] || 0}</p>
          <p className="text-xs text-[#A0A0A0]">Negotiating</p>
        </div>
        <div className="rounded-xl p-3 border bg-cyan-900/10 border-cyan-700/20">
          <p className="text-2xl font-bold text-cyan-400">{statusCounts[DEAL_STATUS.PROVIDERS_SELECTED] || 0}</p>
          <p className="text-xs text-[#A0A0A0]">In Transit</p>
        </div>
        <div className="rounded-xl p-3 border bg-green-900/10 border-green-700/20">
          <p className="text-2xl font-bold text-green-400">{statusCounts[DEAL_STATUS.DELIVERED] || 0}</p>
          <p className="text-xs text-[#A0A0A0]">Delivered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
          <input
            type="text"
            placeholder="Search by product, buyer, or seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm placeholder:text-[#64748b] focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-[#FFD700]/50 cursor-pointer"
          >
            <option value="all">All Statuses ({deals.length})</option>
            {Object.entries(DEAL_STATUS).map(([key, value]) => (
              <option key={key} value={value}>
                {STATUS_CONFIG[value]?.label || value} ({statusCounts[value] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs text-[#A0A0A0] mb-3">
        Showing {filteredDeals.length} of {deals.length} deals
      </p>

      {/* Deals Table */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-12">
          <Handshake className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
          <p className="text-[#A0A0A0]">No deals found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.03)] text-left text-xs text-[#A0A0A0] uppercase tracking-wide">
                  <th className="p-3" />
                  <th className="p-3">Product</th>
                  <th className="p-3">Buyer</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Round</th>
                  <th className="p-3">Latest Price</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => {
                  const buyer = userMap[deal.buyerId];
                  const seller = userMap[deal.sellerId];
                  const isExpanded = expandedDeal === deal.id;
                  const snapshot = deal.latestOfferSnapshot;

                  return (
                    <React.Fragment key={deal.id}>
                      <tr
                        className="border-t border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => setExpandedDeal(isExpanded ? null : deal.id)}
                      >
                        <td className="p-3">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#A0A0A0]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-white font-medium truncate max-w-[200px]">
                            {deal.productName || '—'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {buyer?.country && <CountryFlag countryCode={buyer.country} size={14} />}
                            <span className="text-white truncate max-w-[150px]">
                              {buyer?.companyName || buyer?.displayName || deal.buyerId?.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {seller?.country && <CountryFlag countryCode={seller.country} size={14} />}
                            <span className="text-white truncate max-w-[150px]">
                              {seller?.companyName || seller?.displayName || deal.sellerId?.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3"><StatusBadge status={deal.status} /></td>
                        <td className="p-3 text-white text-center">{deal.round || 1}</td>
                        <td className="p-3 text-white">
                          {snapshot
                            ? `${formatPrice(snapshot.price, snapshot.currency)} × ${snapshot.quantity || '—'}`
                            : '—'}
                        </td>
                        <td className="p-3 text-[#A0A0A0]">{formatDate(deal.updatedAt)}</td>
                        <td className="p-3">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="text-[#FFD700] hover:text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="View Deal"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="bg-[rgba(255,255,255,0.02)]">
                            <OffersPanel dealId={deal.id} userMap={userMap} />
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
      )}
    </div>
  );
}

export default TradesManager;
