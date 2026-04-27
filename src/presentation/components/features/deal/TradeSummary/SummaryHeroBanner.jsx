/**
 * SummaryHeroBanner
 *
 * Top hero section of the Trade Summary tab.
 * Displays deal status, product name, key stats, and a live shipment tracking pill.
 *
 * Design: dark theme (bg-[#0F1C2E]) with gold accent for status highlights.
 * Responsive: stacks on mobile, horizontal on desktop.
 */

'use client';

import {
  CheckCircle2,
  Truck,
  Package,
  AlertCircle,
  Clock,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { DEAL_STATUS } from '@/core/constants/dealConstants';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_LABELS } from '@/core/constants/shipmentConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Map deal status to icon component */
function StatusIcon({ status, className }) {
  const iconProps = { size: 28, className };
  switch (status) {
    case DEAL_STATUS.DELIVERED:
      return <CheckCircle2 {...iconProps} />;
    case DEAL_STATUS.PROVIDERS_SELECTED:
      return <Truck {...iconProps} />;
    case DEAL_STATUS.CONTRACT_APPROVED:
      return <Package {...iconProps} />;
    default:
      return <AlertCircle {...iconProps} />;
  }
}

/** Human-readable deal status label */
function dealStatusLabel(status) {
  const labels = {
    [DEAL_STATUS.DELIVERED]: 'Delivered',
    [DEAL_STATUS.PROVIDERS_SELECTED]: 'In Progress',
    [DEAL_STATUS.CONTRACT_APPROVED]: 'Contract Approved',
    [DEAL_STATUS.ACCEPTED]: 'Awaiting Contract',
  };
  return labels[status] || status?.replace(/_/g, ' ') || 'Active';
}

/** Shipment tracking pill color by status */
function shipmentPillStyle(status) {
  switch (status) {
    case SHIPMENT_STATUS.DELIVERED:
      return 'bg-green-900/40 text-green-400 border-green-700/50';
    case SHIPMENT_STATUS.IN_TRANSIT:
    case SHIPMENT_STATUS.OUT_FOR_DELIVERY:
      return 'bg-blue-900/40 text-blue-400 border-blue-700/50';
    case SHIPMENT_STATUS.AT_CUSTOMS:
      return 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50';
    case SHIPMENT_STATUS.PICKED_UP:
      return 'bg-indigo-900/40 text-indigo-400 border-indigo-700/50';
    case SHIPMENT_STATUS.COVERAGE_ACTIVE:
      return 'bg-emerald-900/40 text-emerald-400 border-emerald-700/50';
    default:
      return 'bg-[#1A283B] text-[#8899AA] border-[#2A3B52]';
  }
}

function shipmentPillIcon(status) {
  switch (status) {
    case SHIPMENT_STATUS.DELIVERED:
      return <CheckCircle2 size={12} />;
    case SHIPMENT_STATUS.IN_TRANSIT:
    case SHIPMENT_STATUS.OUT_FOR_DELIVERY:
    case SHIPMENT_STATUS.PICKED_UP:
      return <Truck size={12} />;
    case SHIPMENT_STATUS.AT_CUSTOMS:
      return <AlertCircle size={12} />;
    case SHIPMENT_STATUS.COVERAGE_ACTIVE:
      return <ShieldCheck size={12} />;
    default:
      return <Clock size={12} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryHeroBanner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ deal: import('@/domain/entities/Deal').Deal, latestShipment: import('@/domain/entities/ShipmentUpdate').ShipmentUpdate|null }} props
 */
export function SummaryHeroBanner({ deal, latestShipment }) {
  if (!deal) return null;

  const statusLabel = dealStatusLabel(deal.status);
  const isDelivered = deal.status === DEAL_STATUS.DELIVERED;

  const offer = deal.latestOfferSnapshot;
  const quantity = offer?.quantity;
  const unit = offer?.unit;
  const price = offer?.price;
  const currency = offer?.currency || 'USD';

  const shipmentStatus = latestShipment?.status;
  const shipmentLabel = shipmentStatus ? SHIPMENT_STATUS_LABELS[shipmentStatus] : null;

  return (
    <div
      className={`rounded-xl border px-5 py-5 ${
        isDelivered
          ? 'bg-green-900/10 border-green-700/30'
          : 'bg-[#0F1C2E] border-[#2A3B52]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Status icon + product name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              isDelivered ? 'bg-green-900/40' : 'bg-[#FFD700]/10'
            }`}
          >
            <StatusIcon
              status={deal.status}
              className={isDelivered ? 'text-green-400' : 'text-[#FFD700]'}
            />
          </div>

          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${
              isDelivered ? 'text-green-400' : 'text-[#FFD700]'
            }`}>
              {statusLabel}
            </p>
            <h2 className="text-lg font-bold text-white truncate">
              {deal.productName || 'Trade Deal'}
            </h2>
            {deal.productCategory && (
              <p className="text-xs text-[#8899AA] truncate">{deal.productCategory}</p>
            )}
          </div>
        </div>

        {/* Key stats */}
        <div className="flex flex-wrap gap-4 sm:gap-6 sm:flex-shrink-0">
          {quantity && (
            <div className="text-center">
              <p className="text-xs text-[#8899AA] mb-0.5">Quantity</p>
              <p className="text-sm font-semibold text-white">
                {quantity.toLocaleString()} {unit || ''}
              </p>
            </div>
          )}
          {price && (
            <div className="text-center">
              <p className="text-xs text-[#8899AA] mb-0.5">Unit Price</p>
              <p className="text-sm font-semibold text-[#FFD700]">
                {currency} {Number(price).toLocaleString()}
              </p>
            </div>
          )}
          {offer?.incoterm && (
            <div className="text-center">
              <p className="text-xs text-[#8899AA] mb-0.5">Incoterm</p>
              <p className="text-sm font-semibold text-white">{offer.incoterm}</p>
            </div>
          )}
        </div>

        {/* Live tracking pill */}
        {shipmentLabel && (
          <div className="sm:flex-shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${shipmentPillStyle(shipmentStatus)}`}
            >
              {shipmentPillIcon(shipmentStatus)}
              {shipmentLabel}
            </div>
          </div>
        )}

        {/* No shipment yet pill */}
        {!shipmentLabel && deal.status === DEAL_STATUS.PROVIDERS_SELECTED && (
          <div className="sm:flex-shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium bg-[#1A283B] text-[#8899AA] border-[#2A3B52]">
              <Clock size={12} />
              Awaiting Shipment
            </div>
          </div>
        )}
      </div>

      {/* Named place info */}
      {offer?.namedPlace && (
        <div className="mt-3 pt-3 border-t border-[#2A3B52]/50 flex items-center gap-1.5">
          <MapPin size={12} className="text-[#8899AA]" />
          <span className="text-xs text-[#8899AA]">
            Named Place: <span className="text-white">{offer.namedPlace}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default SummaryHeroBanner;
