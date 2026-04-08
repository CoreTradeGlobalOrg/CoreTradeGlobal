/**
 * ActiveShipmentsTab Component
 *
 * Displays deals where the logistics provider is selected, showing the current
 * shipment status and an expandable ShipmentUpdateForm for each deal.
 *
 * Props:
 *   uid  {string} - Authenticated provider UID
 */

'use client';

import { useState } from 'react';
import { Truck, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useActiveShipments } from '@/presentation/hooks/provider/useActiveShipments';
import { ShipmentUpdateForm } from '@/presentation/components/features/provider/ShipmentUpdateForm';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_LABELS } from '@/core/constants/shipmentConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Status badge colors
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  [SHIPMENT_STATUS.PREPARING]:        'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
  [SHIPMENT_STATUS.PICKED_UP]:        'bg-blue-900/30 text-blue-400 border-blue-700/40',
  [SHIPMENT_STATUS.IN_TRANSIT]:       'bg-indigo-900/30 text-indigo-400 border-indigo-700/40',
  [SHIPMENT_STATUS.AT_CUSTOMS]:       'bg-orange-900/30 text-orange-400 border-orange-700/40',
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: 'bg-purple-900/30 text-purple-400 border-purple-700/40',
  [SHIPMENT_STATUS.DELIVERED]:        'bg-green-900/30 text-green-400 border-green-700/40',
};

function StatusBadge({ status }) {
  const classes = STATUS_BADGE[status] || 'bg-gray-900/30 text-gray-400 border-gray-700/40';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {SHIPMENT_STATUS_LABELS[status] || status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1628] p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-[rgba(255,255,255,0.07)] rounded w-3/4" />
      <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-1/2" />
      <div className="h-6 bg-[rgba(255,255,255,0.05)] rounded-full w-28" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShipmentCard — individual deal card with expandable form
// ─────────────────────────────────────────────────────────────────────────────

function ShipmentCard({ shipment, onSubmit, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const { quoteRequest, deal, latestShipmentUpdate } = shipment;

  const productName =
    deal?.productName ||
    quoteRequest?.dealSnapshot?.productName ||
    'Unnamed Product';

  const buyerName =
    deal?.buyerName ||
    quoteRequest?.dealSnapshot?.buyerName ||
    quoteRequest?.buyerId ||
    '—';

  const sellerName =
    deal?.sellerName ||
    quoteRequest?.dealSnapshot?.sellerName ||
    quoteRequest?.sellerId ||
    '—';

  const currentStatus = latestShipmentUpdate?.status || null;
  const containerNumber = latestShipmentUpdate?.containerNumber || null;
  const trackingRef = latestShipmentUpdate?.trackingRef || null;
  const etaDate = latestShipmentUpdate?.etaDate || null;

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1822] overflow-hidden">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{productName}</p>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              {buyerName} → {sellerName}
            </p>
          </div>
          {currentStatus && <StatusBadge status={currentStatus} />}
        </div>

        {/* Metadata row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6A7B8E]">
          {containerNumber && (
            <span>
              <span className="text-[#A0A0A0]">Container:</span> {containerNumber}
            </span>
          )}
          {trackingRef && (
            <span>
              <span className="text-[#A0A0A0]">Tracking:</span> {trackingRef}
            </span>
          )}
          {etaDate && (
            <span>
              <span className="text-[#A0A0A0]">ETA:</span>{' '}
              {formatDistanceToNow(
                etaDate instanceof Date ? etaDate : new Date(etaDate),
                { addSuffix: true }
              )}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-[#FFD700] hover:text-yellow-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Hide update form
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Update shipment status
            </>
          )}
        </button>
      </div>

      {/* Expandable form */}
      {expanded && (
        <div className="border-t border-[#1E2D3D] p-4">
          <ShipmentUpdateForm
            dealId={quoteRequest.dealId}
            currentStatus={currentStatus}
            onSubmit={onSubmit}
            loading={actionLoading}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActiveShipmentsTab
// ─────────────────────────────────────────────────────────────────────────────

export function ActiveShipmentsTab({ uid }) {
  const { shipments, loading, error, actionLoading, submitUpdate } = useActiveShipments(
    uid,
    'logistics'
  );

  // Compute delivery stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const inTransitCount = shipments.filter((s) => {
    const status = s.latestShipmentUpdate?.status;
    return (
      status &&
      status !== SHIPMENT_STATUS.DELIVERED &&
      status !== SHIPMENT_STATUS.COVERAGE_ACTIVE
    );
  }).length;

  const deliveredThisMonth = shipments.filter((s) => {
    if (s.latestShipmentUpdate?.status !== SHIPMENT_STATUS.DELIVERED) return false;
    const ts = s.latestShipmentUpdate?.timestamp;
    if (!ts) return false;
    const date = ts instanceof Date ? ts : new Date(ts);
    return date >= startOfMonth;
  }).length;

  if (error) {
    return (
      <div className="text-center py-12 text-red-400 text-sm">
        Failed to load active shipments: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {!loading && shipments.length > 0 && (
        <div className="flex gap-6 p-3 bg-[#0A1628] rounded-xl border border-[#1E2D3D] text-sm">
          <div>
            <span className="text-[#A0A0A0]">In transit: </span>
            <span className="text-white font-semibold">{inTransitCount}</span>
          </div>
          <div>
            <span className="text-[#A0A0A0]">Delivered this month: </span>
            <span className="text-green-400 font-semibold">{deliveredThisMonth}</span>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && shipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0A1628] border border-[#1E2D3D] flex items-center justify-center">
            <Truck className="w-7 h-7 text-[#4A5B6E]" />
          </div>
          <div>
            <p className="text-white font-medium">No active shipments</p>
            <p className="text-[#6A7B8E] text-sm mt-1">
              Shipments appear here when a buyer selects your quote.
            </p>
          </div>
        </div>
      )}

      {/* Shipment cards */}
      {!loading && shipments.length > 0 && (
        <div className="space-y-3">
          {shipments.map((s) => (
            <ShipmentCard
              key={s.quoteRequest.id}
              shipment={s}
              onSubmit={submitUpdate}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ActiveShipmentsTab;
