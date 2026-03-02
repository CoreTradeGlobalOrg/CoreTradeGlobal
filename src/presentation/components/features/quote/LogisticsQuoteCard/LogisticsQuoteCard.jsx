/**
 * LogisticsQuoteCard Component
 *
 * Displays a single logistics provider quote card in the buyer comparison view.
 * Shows transport mode with icon, freight cost, transit days, capability tags.
 * Blue accent border-left per CONTEXT.md color coding.
 *
 * Features:
 * - Ribbon badges: "Cheapest", "Fastest", "Best Value" for qualifying cards
 * - Transport mode icons (Ship, Plane, Truck, etc.)
 * - Container type display for sea freight
 * - Capability tag pills
 * - Validity countdown via CountdownTimer
 * - "Expired" badge when quote.isExpired()
 * - Select button for buyer on active non-expired quotes
 * - Selected state: blue border + "Selected" badge, no select button
 *
 * NOTE: This card shows ONLY the quote's own freight cost (logistics provider pricing).
 * It does NOT display any deal price information.
 */

'use client';

import { Truck, Ship, Plane, Train, ArrowLeftRight, CheckCircle2, Award, Package } from 'lucide-react';
import { CountdownTimer } from '@/presentation/components/features/deal/CountdownTimer/CountdownTimer';
import { TRANSPORT_MODE, CONTAINER_TYPE } from '@/core/constants/quoteConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getTransportMode(modeValue) {
  if (!modeValue) return null;
  return TRANSPORT_MODE.find((m) => m.value === modeValue) || null;
}

function getContainerTypeLabel(typeValue) {
  if (!typeValue) return null;
  const ct = CONTAINER_TYPE.find((c) => c.value === typeValue);
  return ct ? ct.label : typeValue;
}

/**
 * Get a Lucide icon component for a transport mode icon name.
 */
function TransportIcon({ iconName, className }) {
  const iconProps = { size: 16, className };

  switch (iconName) {
    case 'Ship': return <Ship {...iconProps} />;
    case 'Plane': return <Plane {...iconProps} />;
    case 'Truck': return <Truck {...iconProps} />;
    case 'Train': return <Train {...iconProps} />;
    case 'ArrowLeftRight': return <ArrowLeftRight {...iconProps} />;
    default: return <Package {...iconProps} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ribbon Badge
// ─────────────────────────────────────────────────────────────────────────────

function RibbonBadge({ ribbon }) {
  if (!ribbon) return null;

  const colors = {
    Cheapest: 'bg-emerald-500 text-white',
    Fastest: 'bg-blue-500 text-white',
    'Best Value': 'bg-amber-500 text-white',
  };

  const colorClass = colors[ribbon] || 'bg-blue-500 text-white';

  return (
    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${colorClass}`}>
      <Award size={10} />
      {ribbon}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Row
// ─────────────────────────────────────────────────────────────────────────────

function DetailRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#1A283B] last:border-0">
      <span className="text-xs text-[#8899AA]">{label}</span>
      <span className={`text-xs font-medium ${valueClass}`}>{value || '—'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogisticsQuoteCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LogisticsQuoteCard
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Quote').Quote} props.quote - Quote entity
 * @param {boolean} props.isBuyer - Whether the current user is the buyer
 * @param {boolean} props.isSelected - Whether this quote is currently selected
 * @param {Function} props.onSelect - Callback: onSelect(quoteRequestId, quoteId)
 * @param {string|null} props.ribbon - Ribbon label: "Cheapest" | "Fastest" | "Best Value" | null
 */
export function LogisticsQuoteCard({ quote, isBuyer, isSelected, onSelect, ribbon }) {
  if (!quote) return null;

  const isExpired = quote.isExpired();
  const isActive = quote.isActive();
  const canSelect = isBuyer && isActive && !isSelected;

  const transportMode = getTransportMode(quote.transportMode);
  const containerTypeLabel = getContainerTypeLabel(quote.containerType);

  // Border styling: selected = blue thick border, default = blue left accent
  const borderClass = isSelected
    ? 'border-2 border-blue-500'
    : isExpired
    ? 'border border-[#2A3B52] opacity-60'
    : 'border border-[#2A3B52] border-l-4 border-l-blue-500/70';

  return (
    <div
      className={`relative bg-[#1A283B] rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 ${borderClass}`}
    >
      {/* Ribbon badge */}
      <RibbonBadge ribbon={ribbon} />

      {/* Header: provider info + mode icon */}
      <div className="flex items-start gap-3 pr-20">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-900/40 border border-blue-800/50 flex items-center justify-center">
          {transportMode ? (
            <TransportIcon iconName={transportMode.iconName} className="text-blue-400" />
          ) : (
            <Truck size={16} className="text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">
              Logistics Provider
            </p>
            {isSelected && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} />
                Selected
              </span>
            )}
            {isExpired && !isSelected && (
              <span className="text-xs font-semibold bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 rounded-full">
                Expired
              </span>
            )}
          </div>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {transportMode ? transportMode.label : 'Logistics'}
          </p>
        </div>
      </div>

      {/* Freight cost (prominent) */}
      <div className="bg-[#0F1C2E] rounded-lg px-3 py-2">
        <p className="text-xs text-[#8899AA]">Freight Cost</p>
        <p className="text-lg font-bold text-blue-400">
          {formatCurrency(quote.freightCost, quote.currency)}
        </p>
      </div>

      {/* Details */}
      <div>
        <DetailRow
          label="Estimated Transit"
          value={quote.estimatedTransitDays != null ? `${quote.estimatedTransitDays} days` : '—'}
        />
        {containerTypeLabel && quote.transportMode === 'sea' && (
          <DetailRow label="Container Type" value={containerTypeLabel} />
        )}
        <DetailRow label="Loading Date" value={formatDate(quote.loadingDate)} />
        <DetailRow label="Estimated Arrival" value={formatDate(quote.estimatedArrival)} />
        {quote.notes && (
          <div className="mt-2">
            <p className="text-xs text-[#8899AA] mb-1">Notes</p>
            <p className="text-xs text-[#AAB8C8] leading-relaxed">{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Capability tags */}
      {quote.capabilityTags && quote.capabilityTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quote.capabilityTags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-blue-900/30 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Validity countdown */}
      {quote.validUntil && !isExpired && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8899AA]">Valid for</span>
          <CountdownTimer expiresAt={quote.validUntil} />
        </div>
      )}

      {/* Action: select button (buyer only, active non-selected quotes) */}
      {canSelect && (
        <button
          onClick={() => onSelect?.(quote.requestId, quote.id)}
          className="w-full mt-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Select Provider
        </button>
      )}
    </div>
  );
}

export default LogisticsQuoteCard;
