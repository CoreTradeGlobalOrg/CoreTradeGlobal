/**
 * QuotesSidebar Component
 *
 * Right-side sidebar for the buyer quotes comparison page.
 * Shows trade process stepper, provider selection summary, live cost breakdown,
 * and the confirm selections button for the buyer.
 *
 * Structure:
 * 1. Trade Process Stepper: shows deal progress (Negotiation → Agreement → Insurance & Transport → Tracking)
 * 2. Selection Summary: selected insurance and logistics providers (or "Not selected yet")
 * 3. Cost Breakdown: Goods Value + Freight Cost + Insurance Premium = Total
 * 4. Confirm Button (buyer only): calls actions.confirmSelection(deal.id)
 * 5. Seller view: same display but informational text instead of button
 *
 * Sticky positioned on desktop (sticky top-6).
 * No platform service fee in v1.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  Shield,
  Truck,
  Package,
  MapPin,
  Loader2,
  Info,
} from 'lucide-react';

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

// ─────────────────────────────────────────────────────────────────────────────
// Trade Process Stepper
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'negotiation', label: 'Negotiation', status: 'complete' },
  { id: 'agreement', label: 'Contract Agreement', status: 'complete' },
  { id: 'providers', label: 'Insurance & Transport', status: 'active' },
  { id: 'tracking', label: 'Tracking & Delivery', status: 'upcoming' },
];

function TradeStepper() {
  return (
    <div className="space-y-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex flex-col items-center">
            {step.status === 'complete' ? (
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            ) : step.status === 'active' ? (
              <div className="relative flex-shrink-0">
                <Circle size={16} className="text-[#FFD700]" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-2 h-2 bg-[#FFD700] rounded-full animate-pulse" />
                </span>
              </div>
            ) : (
              <Circle size={16} className="text-[#4A5B6E] flex-shrink-0" />
            )}
            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div className={`w-0.5 h-4 mt-1 ${step.status === 'complete' ? 'bg-emerald-800' : 'bg-[#2A3B52]'}`} />
            )}
          </div>
          {/* Label */}
          <p
            className={`text-xs leading-none pt-0.5 ${
              step.status === 'complete'
                ? 'text-emerald-400'
                : step.status === 'active'
                ? 'text-[#FFD700] font-semibold'
                : 'text-[#4A5B6E]'
            }`}
          >
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuotesSidebar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuotesSidebar
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Quote').Quote|null} props.selectedInsuranceQuote
 * @param {import('@/domain/entities/Quote').Quote|null} props.selectedLogisticsQuote
 * @param {boolean} props.isBuyer
 * @param {{ confirmSelection: Function, loading: boolean }} props.actions
 * @param {boolean} [props.skippedInsurance] - buyer skipped insurance section
 * @param {boolean} [props.skippedLogistics] - buyer skipped logistics section
 */
export function QuotesSidebar({
  deal,
  selectedInsuranceQuote,
  selectedLogisticsQuote,
  isBuyer,
  actions,
  skippedInsurance = false,
  skippedLogistics = false,
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  // A section is "satisfied" if a provider was selected OR the buyer explicitly skipped it.
  // At least one section must be satisfied to proceed. The other can be handled later.
  const insuranceSatisfied = !!selectedInsuranceQuote || skippedInsurance;
  const logisticsSatisfied = !!selectedLogisticsQuote || skippedLogistics;
  const hasAnySelection = insuranceSatisfied || logisticsSatisfied;

  // Goods value from deal's latest offer snapshot
  const goodsValue = deal?.latestOfferSnapshot?.estimatedTotal
    ?? deal?.latestOfferSnapshot?.price
    ?? null;

  const currency = deal?.latestOfferSnapshot?.currency
    ?? selectedInsuranceQuote?.currency
    ?? selectedLogisticsQuote?.currency
    ?? 'USD';

  const freightCost = selectedLogisticsQuote?.freightCost ?? null;
  const premiumAmount = selectedInsuranceQuote?.premiumAmount ?? null;

  // Total: sum of available values
  const total =
    (goodsValue != null ? goodsValue : 0) +
    (freightCost != null ? freightCost : 0) +
    (premiumAmount != null ? premiumAmount : 0);

  const hasAnyValue = goodsValue != null || freightCost != null || premiumAmount != null;

  // ── Confirm handler ────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!deal?.id || confirming) return;
    setConfirming(true);
    try {
      await actions.confirmSelection(deal.id, { skippedInsurance, skippedLogistics });
      router.push(`/deals/${deal.id}`);
    } catch {
      // Error handled in useQuoteActions with toast
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="sticky top-6 space-y-4">

      {/* Trade Stepper */}
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wider mb-3">
          Deal Progress
        </h3>
        <TradeStepper />
      </div>

      {/* Selection Summary */}
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wider mb-3">
          Selected Providers
        </h3>
        <div className="space-y-3">
          {/* Insurance selection */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-emerald-900/40 border border-emerald-800/50 flex items-center justify-center">
              <Shield size={12} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8899AA]">Insurance</p>
              {selectedInsuranceQuote ? (
                <p className="text-xs font-semibold text-emerald-400">
                  {formatCurrency(selectedInsuranceQuote.premiumAmount, selectedInsuranceQuote.currency)} premium
                </p>
              ) : skippedInsurance ? (
                <p className="text-xs text-amber-400 italic">Arranging own coverage</p>
              ) : (
                <p className="text-xs text-[#4A5B6E] italic">Not selected yet</p>
              )}
            </div>
          </div>

          {/* Logistics selection */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-blue-900/40 border border-blue-800/50 flex items-center justify-center">
              <Truck size={12} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8899AA]">Logistics</p>
              {selectedLogisticsQuote ? (
                <p className="text-xs font-semibold text-blue-400">
                  {formatCurrency(selectedLogisticsQuote.freightCost, selectedLogisticsQuote.currency)} freight
                </p>
              ) : skippedLogistics ? (
                <p className="text-xs text-amber-400 italic">Arranging own logistics</p>
              ) : (
                <p className="text-xs text-[#4A5B6E] italic">Not selected yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wider mb-3">
          Cost Breakdown
        </h3>

        <div className="space-y-2">
          {/* Goods Value */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Package size={12} className="text-[#8899AA]" />
              <span className="text-xs text-[#8899AA]">Goods Value</span>
            </div>
            <span className="text-xs font-medium text-white">
              {goodsValue != null ? formatCurrency(goodsValue, currency) : '—'}
            </span>
          </div>

          {/* Freight Cost */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Truck size={12} className="text-[#8899AA]" />
              <span className="text-xs text-[#8899AA]">Freight Cost</span>
            </div>
            <span className={`text-xs font-medium ${freightCost != null ? 'text-blue-400' : 'text-[#4A5B6E]'}`}>
              {freightCost != null ? formatCurrency(freightCost, currency) : '—'}
            </span>
          </div>

          {/* Insurance Premium */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Shield size={12} className="text-[#8899AA]" />
              <span className="text-xs text-[#8899AA]">Insurance Premium</span>
            </div>
            <span className={`text-xs font-medium ${premiumAmount != null ? 'text-emerald-400' : 'text-[#4A5B6E]'}`}>
              {premiumAmount != null ? formatCurrency(premiumAmount, currency) : '—'}
            </span>
          </div>

          {/* Separator */}
          <div className="border-t border-[#2A3B52] pt-2 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-white">Total Estimated Cost</span>
              <span className="text-sm font-bold text-[#FFD700]">
                {hasAnyValue ? formatCurrency(total, currency) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* No service fee note */}
        <div className="mt-3 flex items-start gap-1.5">
          <Info size={10} className="text-[#4A5B6E] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#4A5B6E]">
            No platform service fee applies in this phase.
          </p>
        </div>
      </div>

      {/* Confirm/action area */}
      {isBuyer ? (
        <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
          <button
            onClick={handleConfirm}
            disabled={!hasAnySelection || confirming || actions.loading}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              hasAnySelection && !confirming && !actions.loading
                ? 'bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] cursor-pointer'
                : 'bg-[#2A3B52] text-[#4A5B6E] cursor-not-allowed'
            }`}
          >
            {(confirming || actions.loading) && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {confirming || actions.loading
              ? 'Confirming...'
              : 'Confirm Coverage & Shipment'}
          </button>
          {!hasAnySelection && (
            <p className="text-xs text-[#4A5B6E] text-center mt-2">
              Select or skip at least one provider to continue.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-[#8899AA] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#8899AA]">
              Waiting for the buyer to select insurance and logistics providers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotesSidebar;
