/**
 * CostBreakdownSection
 *
 * Displays product cost + insurance premium + logistics fee = total.
 * Values are 'Pending' when not yet available (provider not selected).
 * Visual: table-like layout with separator line and bold total.
 */

'use client';

import { DollarSign } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function CostRow({ label, value, pending, currency, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-[#8899AA]">{label}</span>
      {pending ? (
        <span className="text-xs text-[#8899AA] italic">Pending</span>
      ) : (
        <span className={`text-xs font-semibold ${highlight ? 'text-[#FFD700]' : 'text-white'}`}>
          {currency} {Number(value).toLocaleString()}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CostBreakdownSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   deal: import('@/domain/entities/Deal').Deal,
 *   selectedInsuranceQuote: import('@/domain/entities/Quote').Quote|null,
 *   selectedLogisticsQuote: import('@/domain/entities/Quote').Quote|null,
 * }} props
 */
export function CostBreakdownSection({ deal, selectedInsuranceQuote, selectedLogisticsQuote }) {
  if (!deal) return null;

  const offer = deal.latestOfferSnapshot;
  const currency = offer?.currency || selectedInsuranceQuote?.currency || selectedLogisticsQuote?.currency || 'USD';

  // Product cost = price * quantity
  const productCost =
    offer?.price && offer?.quantity
      ? Number(offer.price) * Number(offer.quantity)
      : null;

  const insurancePremium = selectedInsuranceQuote?.premiumAmount ?? null;
  const logisticsFee = selectedLogisticsQuote?.freightCost ?? null;

  // Total = sum of available values
  let total = null;
  if (productCost != null) {
    total = productCost;
    if (insurancePremium != null) total += insurancePremium;
    if (logisticsFee != null) total += logisticsFee;
  }

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={16} className="text-[#FFD700]" />
        <h3 className="text-sm font-semibold text-white">Cost Breakdown</h3>
      </div>

      {/* Cost rows */}
      <div className="divide-y divide-[#2A3B52]/50">
        <CostRow
          label="Product Cost"
          value={productCost}
          pending={productCost == null}
          currency={currency}
        />
        <CostRow
          label="Insurance Premium"
          value={insurancePremium}
          pending={insurancePremium == null}
          currency={currency}
        />
        <CostRow
          label="Logistics Fee"
          value={logisticsFee}
          pending={logisticsFee == null}
          currency={currency}
        />
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t border-[#2A3B52] flex items-center justify-between">
        <span className="text-sm font-bold text-white">Total</span>
        {total != null ? (
          <span className="text-sm font-bold text-[#FFD700]">
            {currency} {total.toLocaleString()}
          </span>
        ) : (
          <span className="text-sm font-bold text-[#8899AA] italic">Pending</span>
        )}
      </div>

      {/* Note when some values are still pending */}
      {total != null && (insurancePremium == null || logisticsFee == null) && (
        <p className="text-[10px] text-[#8899AA] mt-2 italic">
          * Total reflects available costs only. Some provider costs are pending.
        </p>
      )}
    </div>
  );
}

export default CostBreakdownSection;
