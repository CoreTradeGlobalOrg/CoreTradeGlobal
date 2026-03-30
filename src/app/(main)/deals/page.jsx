/**
 * My Deals Page
 *
 * Shows all deals where the authenticated user is buyer or seller.
 * Updates in real-time via Firestore listeners (useDeals hook).
 * Supports tab filtering: All / Active / Completed.
 *
 * Enhancements (Phase 6 Plan 04):
 *  - Deal status summary cards (negotiating, awaiting contract, in transit, delivered)
 *  - Recent activity feed from notifications subcollection
 *  - Active shipments highlight section
 *  - Quick action buttons
 *
 * Route: /deals
 * Auth: requires authenticated user
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Handshake,
  Plus,
  Truck,
  CheckCircle2,
  FileText,
  Activity,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useDeals } from '@/presentation/hooks/deal/useDeals';
import { DealList } from '@/presentation/components/features/deal/DealList/DealList';
import { DealCard } from '@/presentation/components/features/deal/DealCard/DealCard';
import { DEAL_STATUS } from '@/core/constants/dealConstants';
import { SHIPMENT_STATUS } from '@/core/constants/shipmentConstants';
import { db } from '@/core/config/firebase.config';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES = [DEAL_STATUS.NEGOTIATING, DEAL_STATUS.ACCEPTED];
const COMPLETED_STATUSES = [
  DEAL_STATUS.CONTRACT_APPROVED,
  DEAL_STATUS.PROVIDERS_SELECTED,
  DEAL_STATUS.DELIVERED,
  DEAL_STATUS.REJECTED,
  DEAL_STATUS.EXPIRED,
  DEAL_STATUS.WITHDRAWN,
];

/** Shipment statuses that indicate an active in-transit state */
const IN_TRANSIT_SHIPMENT_STATUSES = new Set([
  SHIPMENT_STATUS.PREPARING,
  SHIPMENT_STATUS.PICKED_UP,
  SHIPMENT_STATUS.IN_TRANSIT,
  SHIPMENT_STATUS.AT_CUSTOMS,
  SHIPMENT_STATUS.OUT_FOR_DELIVERY,
]);

/** Notification types relevant to deals */
const DEAL_NOTIFICATION_TYPES = new Set([
  'counter_offer',
  'contract_approved',
  'shipment_update',
  'providers_selected',
  'deal_accepted',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Activity feed helpers
// ─────────────────────────────────────────────────────────────────────────────

function notificationIcon(type) {
  switch (type) {
    case 'shipment_update': return <Truck className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    case 'contract_approved': return <FileText className="w-4 h-4 text-[#FFD700] flex-shrink-0" />;
    case 'providers_selected': return <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    case 'deal_accepted': return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    default: return <Activity className="w-4 h-4 text-[#8899AA] flex-shrink-0" />;
  }
}

function resolveTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status summary cards
// ─────────────────────────────────────────────────────────────────────────────

function StatusSummaryCards({ deals }) {
  const negotiating = deals.filter((d) => d.status === DEAL_STATUS.NEGOTIATING).length;
  const awaitingContract = deals.filter((d) => d.status === DEAL_STATUS.ACCEPTED).length;
  const inTransit = deals.filter(
    (d) =>
      d.status === DEAL_STATUS.PROVIDERS_SELECTED &&
      d.currentShipmentStatus &&
      IN_TRANSIT_SHIPMENT_STATUSES.has(d.currentShipmentStatus)
  ).length;
  const delivered = deals.filter((d) => d.status === DEAL_STATUS.DELIVERED).length;

  const cards = [
    {
      key: 'negotiating',
      icon: <Handshake className="w-5 h-5 text-emerald-400" />,
      count: negotiating,
      label: 'Negotiating',
      bg: 'bg-emerald-900/10 border-emerald-700/20',
    },
    {
      key: 'awaiting',
      icon: <FileText className="w-5 h-5 text-[#FFD700]" />,
      count: awaitingContract,
      label: 'Awaiting Contract',
      bg: 'bg-[#FFD700]/5 border-[#FFD700]/20',
    },
    {
      key: 'transit',
      icon: <Truck className="w-5 h-5 text-blue-400" />,
      count: inTransit,
      label: 'In Transit',
      bg: 'bg-blue-900/10 border-blue-700/20',
    },
    {
      key: 'delivered',
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      count: delivered,
      label: 'Delivered',
      bg: 'bg-green-900/10 border-green-700/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`rounded-xl p-4 border flex items-center gap-3 ${c.bg}`}
        >
          {c.icon}
          <div>
            <p className="text-xl font-bold text-white">{c.count}</p>
            <p className="text-xs text-[#8899AA]">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent activity feed
// ─────────────────────────────────────────────────────────────────────────────

function RecentActivityFeed({ uid }) {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const notifRef = collection(db, 'users', uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'), limit(10));

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((n) => DEAL_NOTIFICATION_TYPES.has(n.type));
      setActivities(items);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  if (loading) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[#8899AA] uppercase tracking-wide mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Recent Activity
      </h2>
      <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
        {activities.length === 0 ? (
          <p className="text-[#64748b] text-sm text-center py-6">No recent activity</p>
        ) : (
          activities.map((item, index) => {
            const ts = resolveTimestamp(item.createdAt);
            const timeLabel = ts ? formatDistanceToNow(ts, { addSuffix: true }) : '';

            return (
              <button
                key={item.id}
                onClick={() => item.dealId && router.push(`/deals/${item.dealId}`)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors ${
                  index !== activities.length - 1 ? 'border-b border-[rgba(255,255,255,0.06)]' : ''
                }`}
              >
                <div className="mt-0.5">{notificationIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.title || item.body}</p>
                  {item.title && item.body && (
                    <p className="text-xs text-[#64748b] truncate mt-0.5">{item.body}</p>
                  )}
                </div>
                <span className="text-xs text-[#64748b] flex-shrink-0 mt-0.5">{timeLabel}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Shipments section
// ─────────────────────────────────────────────────────────────────────────────

function ActiveShipmentsSection({ deals, currentUserId }) {
  const activeShipments = deals.filter(
    (d) =>
      d.status === DEAL_STATUS.PROVIDERS_SELECTED &&
      d.currentShipmentStatus
  );

  if (activeShipments.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[#8899AA] uppercase tracking-wide mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Active Shipments
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeShipments.map((deal) => (
          <DealCard key={deal.id} deal={deal} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DealsPage
// ─────────────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { deals, loading: dealsLoading, error } = useDeals();
  const [activeTab, setActiveTab] = useState('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/deals');
    }
  }, [authLoading, isAuthenticated, router]);

  // Filter deals based on active tab
  const filteredDeals = (() => {
    if (activeTab === 'active') {
      return deals.filter((d) => ACTIVE_STATUSES.includes(d.status));
    }
    if (activeTab === 'completed') {
      return deals.filter((d) => COMPLETED_STATUSES.includes(d.status));
    }
    return deals;
  })();

  // Count badges
  const activeBadge = deals.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;

  // ── Loading skeleton ──
  if (authLoading || dealsLoading) {
    return (
      <main className="min-h-screen bg-radial-navy pt-[120px] pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <div className="h-8 w-32 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-radial-navy pt-[120px] pb-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Page Header + Quick Action ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Handshake className="w-7 h-7 text-[#FFD700]" />
              My Deals
            </h1>
            <p className="text-[#64748b] text-sm mt-1">
              {deals.length} deal{deals.length !== 1 ? 's' : ''} in total
            </p>
          </div>
          <Link
            href="/marketplace"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFD700] text-black text-sm font-semibold hover:bg-[#e6c200] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Browse Marketplace
          </Link>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Status Summary Cards ── */}
        {deals.length > 0 && <StatusSummaryCards deals={deals} />}

        {/* ── Recent Activity Feed ── */}
        {user?.uid && <RecentActivityFeed uid={user.uid} />}

        {/* ── Active Shipments ── */}
        {deals.length > 0 && (
          <ActiveShipmentsSection deals={deals} currentUserId={user?.uid} />
        )}

        {/* ── Tab Filter ── */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                flex items-center gap-2
                ${
                  activeTab === tab.key
                    ? 'bg-[#FFD700] text-[#0F1B2B] shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }
              `}
            >
              {tab.label}
              {tab.key === 'active' && activeBadge > 0 && (
                <span
                  className={`
                    text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center
                    ${activeTab === 'active' ? 'bg-[#0F1B2B] text-[#FFD700]' : 'bg-[rgba(255,215,0,0.2)] text-[#FFD700]'}
                  `}
                >
                  {activeBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Deal List or Empty State ── */}
        {filteredDeals.length > 0 ? (
          <DealList deals={filteredDeals} currentUserId={user?.uid} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.15)] flex items-center justify-center">
              <Handshake className="w-8 h-8 text-[#FFD700] opacity-60" />
            </div>

            {activeTab === 'all' ? (
              <>
                <div>
                  <p className="text-white font-semibold mb-1">No deals yet</p>
                  <p className="text-[#64748b] text-sm">
                    Start a deal from any product conversation.
                  </p>
                </div>
                <Link
                  href="/messages"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Go to Messages
                </Link>
              </>
            ) : (
              <div>
                <p className="text-white font-semibold mb-1">
                  No {activeTab} deals
                </p>
                <p className="text-[#64748b] text-sm">
                  {activeTab === 'active'
                    ? 'All your deals have been completed.'
                    : 'No completed deals found.'}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
