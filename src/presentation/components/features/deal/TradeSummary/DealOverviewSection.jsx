/**
 * DealOverviewSection
 *
 * Shows product, price, Incoterms, quantities, and payment terms from the deal's
 * latest offer snapshot. Rendered as a card section with key-value pairs.
 */

'use client';

import { Package } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[#2A3B52]/50 last:border-0">
      <span className="text-xs text-[#8899AA] flex-shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium text-white text-right">{value || 'N/A'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DealOverviewSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ deal: import('@/domain/entities/Deal').Deal }} props
 */
export function DealOverviewSection({ deal }) {
  if (!deal) return null;

  const offer = deal.latestOfferSnapshot;
  const currency = offer?.currency || 'USD';

  const unitPrice = offer?.price
    ? `${currency} ${Number(offer.price).toLocaleString()}`
    : 'N/A';

  const quantity = offer?.quantity
    ? `${Number(offer.quantity).toLocaleString()} ${offer.unit || ''}`
    : 'N/A';

  const totalValue =
    offer?.price && offer?.quantity
      ? `${currency} ${(Number(offer.price) * Number(offer.quantity)).toLocaleString()}`
      : 'N/A';

  const paymentTermLabel = offer?.paymentTerms
    ? offer.paymentTerms.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'N/A';

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Package size={16} className="text-[#FFD700]" />
        <h3 className="text-sm font-semibold text-white">Deal Overview</h3>
      </div>

      {/* Key-value pairs */}
      <div className="space-y-0">
        <Row label="Product" value={deal.productName} />
        <Row label="Category" value={deal.productCategory} />
        <Row label="Unit Price" value={unitPrice} />
        <Row label="Quantity" value={quantity} />
        <Row label="Total Value" value={totalValue} />
        <Row label="Incoterm" value={offer?.incoterm} />
        <Row label="Named Place" value={offer?.namedPlace} />
        <Row label="Payment Terms" value={paymentTermLabel} />
      </div>
    </div>
  );
}

export default DealOverviewSection;
