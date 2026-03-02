/**
 * RequestKanbanCard Component
 *
 * Individual kanban card for a provider's quote request.
 * Displays product name, origin-destination route, quantity, Incoterm badge,
 * deadline countdown, status badge, and provider type indicator.
 *
 * Used by ProviderDashboard to render cards in each kanban column.
 */

'use client';

import { Shield, Truck, MapPin, Package } from 'lucide-react';
import { CountdownTimer } from '@/presentation/components/features/deal/CountdownTimer/CountdownTimer';
import { QUOTE_REQUEST_STATUS } from '@/core/constants/quoteConstants';

/**
 * Status badge color config
 */
const STATUS_BADGE = {
  [QUOTE_REQUEST_STATUS.PENDING]: {
    label: 'New Request',
    className: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  },
  [QUOTE_REQUEST_STATUS.QUOTED]: {
    label: 'Quoted',
    className: 'bg-blue-900/30 text-blue-400 border-blue-700',
  },
  [QUOTE_REQUEST_STATUS.DECLINED]: {
    label: 'Declined',
    className: 'bg-gray-800/50 text-gray-400 border-gray-600',
  },
  [QUOTE_REQUEST_STATUS.SELECTED]: {
    label: 'Selected',
    className: 'bg-green-900/30 text-green-400 border-green-700',
  },
  [QUOTE_REQUEST_STATUS.NOT_SELECTED]: {
    label: 'Not Selected',
    className: 'bg-red-900/30 text-red-400 border-red-700',
  },
};

/**
 * RequestKanbanCard
 *
 * @param {Object} props
 * @param {import('@/domain/entities/QuoteRequest').QuoteRequest} props.request - Quote request entity
 * @param {Function} props.onClick - Callback when card is clicked
 */
export function RequestKanbanCard({ request, onClick }) {
  const { dealSnapshot, status, deadline, providerType } = request;

  const productName = dealSnapshot?.productName || 'Unknown Product';
  const origin = dealSnapshot?.namedPlace || dealSnapshot?.origin || '—';
  const quantity = dealSnapshot?.quantity;
  const unit = dealSnapshot?.unit || '';
  const incoterm = dealSnapshot?.incoterm || '';

  const badge = STATUS_BADGE[status] || STATUS_BADGE[QUOTE_REQUEST_STATUS.PENDING];
  const isInsurance = providerType === 'insurance';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[#1E2D3D] bg-[#0A1628] p-4 hover:border-blue-500/30 hover:bg-[#0D1F38] transition-all duration-200 cursor-pointer group"
    >
      {/* Header: Product name + provider type icon */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-white truncate group-hover:text-blue-200 transition-colors leading-snug flex-1">
          {productName}
        </p>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1A283B] flex items-center justify-center">
          {isInsurance ? (
            <Shield className="w-4 h-4 text-orange-400" />
          ) : (
            <Truck className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>

      {/* Route / Origin */}
      {origin && origin !== '—' && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 text-[#4A5B6E] flex-shrink-0" />
          <span className="text-xs text-[#8899AA] truncate">{origin}</span>
        </div>
      )}

      {/* Quantity + Incoterm row */}
      <div className="flex items-center gap-2 mb-3">
        {quantity != null && (
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-[#4A5B6E]" />
            <span className="text-xs text-[#8899AA]">
              {quantity} {unit}
            </span>
          </div>
        )}
        {incoterm && (
          <span className="text-xs font-semibold bg-[#1E2D3D] text-[#A0B0C0] border border-[#2A3B52] rounded px-1.5 py-0.5">
            {incoterm}
          </span>
        )}
      </div>

      {/* Deadline countdown */}
      {deadline && (
        <div className="mb-3">
          <CountdownTimer expiresAt={deadline} />
        </div>
      )}

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${badge.className}`}>
          {badge.label}
        </span>
      </div>
    </button>
  );
}

export default RequestKanbanCard;
