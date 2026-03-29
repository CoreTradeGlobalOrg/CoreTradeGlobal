/**
 * TradeInfoBar
 *
 * Horizontal info strip below the hero banner.
 * Shows deal number, product, total amount, Incoterms, container number, and status badge.
 *
 * Design: dark theme (bg-[#0b1626] border-[#1e2d47]), evenly spaced items.
 */

'use client';

import { DEAL_STATUS } from '@/core/constants/dealConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
    [DEAL_STATUS.DELIVERED]: { label: 'Delivered', className: 'bg-green-900/40 text-green-400' },
    [DEAL_STATUS.PROVIDERS_SELECTED]: { label: 'In Progress', className: 'bg-blue-900/40 text-blue-400' },
    [DEAL_STATUS.CONTRACT_APPROVED]: { label: 'Contract Approved', className: 'bg-[#FFD700]/10 text-[#FFD700]' },
    [DEAL_STATUS.ACCEPTED]: { label: 'Accepted', className: 'bg-purple-900/40 text-purple-400' },
  };

  const cfg = configs[status] || {
    label: status?.replace(/_/g, ' ') || 'Active',
    className: 'bg-[#1A283B] text-[#8899AA]',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoItem
// ─────────────────────────────────────────────────────────────────────────────

function InfoItem({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] text-[#8899AA] uppercase tracking-wider font-medium">
        {label}
      </span>
      <span className="text-xs font-semibold text-white truncate">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TradeInfoBar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   deal: import('@/domain/entities/Deal').Deal,
 *   latestShipment: import('@/domain/entities/ShipmentUpdate').ShipmentUpdate|null
 * }} props
 */
export function TradeInfoBar({ deal, latestShipment }) {
  if (!deal) return null;

  const offer = deal.latestOfferSnapshot;
  const currency = offer?.currency || 'USD';

  // Total amount = price * quantity
  const totalAmount =
    offer?.price && offer?.quantity
      ? `${currency} ${(Number(offer.price) * Number(offer.quantity)).toLocaleString()}`
      : 'Pending';

  // Truncate deal ID to last 8 characters for display
  const dealNo = deal.id ? `#${deal.id.slice(-8).toUpperCase()}` : 'N/A';

  const containerNo = latestShipment?.containerNumber || 'Pending';

  return (
    <div className="rounded-xl border border-[#1e2d47] bg-[#0b1626] px-4 py-3 no-print">
      <div className="flex flex-wrap gap-4 sm:gap-6 items-center justify-between">
        <InfoItem label="Deal No." value={dealNo} />
        <InfoItem label="Product" value={deal.productName || 'N/A'} />
        <InfoItem label="Total Amount" value={totalAmount} />
        {offer?.incoterm && (
          <InfoItem label="Incoterms" value={offer.incoterm} />
        )}
        <InfoItem label="Container No." value={containerNo} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#8899AA] uppercase tracking-wider font-medium">
            Status
          </span>
          <StatusBadge status={deal.status} />
        </div>
      </div>
    </div>
  );
}

export default TradeInfoBar;
