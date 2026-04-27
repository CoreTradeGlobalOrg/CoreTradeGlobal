/**
 * TradeSummaryTab
 *
 * Main orchestrator for the Trade Summary tab on the deal page.
 * Calls useTradeSummary to aggregate multi-source data and renders all sub-sections.
 *
 * Layout:
 * - Two-column on desktop: main content (left) + sidebar (right: map + future timeline)
 * - Full-width stacked on mobile
 *
 * PDF Export:
 * - "Export PDF" button calls window.print()
 * - @media print CSS in globals.css hides nav/buttons and shows clean summary
 */

'use client';

import { Printer } from 'lucide-react';
import { useTradeSummary } from '@/presentation/hooks/deal/useTradeSummary';
import { LegalBanner } from '@/presentation/components/features/legal/LegalBanner/LegalBanner';
import { Tooltip } from '@/presentation/components/common/Tooltip/Tooltip';
import { SummaryHeroBanner } from './SummaryHeroBanner';
import { TradeInfoBar } from './TradeInfoBar';
import { TradeRouteMap } from './TradeRouteMap';
import { DealOverviewSection } from './DealOverviewSection';
import { PartiesProvidersSection } from './PartiesProvidersSection';
import { CostBreakdownSection } from './CostBreakdownSection';
import { DocumentsSection } from './DocumentsSection';
import { LegalConsultingSection } from './LegalConsultingSection';
import { OrderTimeline } from './OrderTimeline';
import { CurrencyConvertPanel } from '@/presentation/components/features/deal/DealSidebar/CurrencyConvertPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-28 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
      {/* Info bar skeleton */}
      <div className="h-12 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
      {/* Two-column skeleton */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="h-48 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
          <div className="h-48 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
          <div className="h-36 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
        </div>
        <div className="w-full lg:w-72 xl:w-80 space-y-4 flex-shrink-0">
          <div className="h-48 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
          <div className="h-36 rounded-xl bg-[#1A283B] border border-[#2A3B52]" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TradeSummaryTab
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ dealId: string, currentUserUid: string }} props
 */
export function TradeSummaryTab({ dealId, currentUserUid }) {
  const {
    deal,
    contract,
    selectedInsuranceQuote,
    selectedLogisticsQuote,
    latestShipment,
    shipmentUpdates,
    legalEngagement,
    buyerName,
    sellerName,
    loading,
  } = useTradeSummary(dealId, currentUserUid);

  if (loading) return <SummarySkeleton />;

  if (!deal) {
    return (
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-8 text-center">
        <p className="text-sm text-[#8899AA]">Trade summary unavailable.</p>
      </div>
    );
  }

  // Derive named place for map from offer snapshot
  const offer = deal.latestOfferSnapshot;
  const originName = deal.productCategory || 'Origin';
  const destinationName = offer?.namedPlace || 'Destination';

  return (
    <div className="space-y-4">
      {/* Header row: Trade Summary title + Tooltip + PDF Export button */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Trade Summary</h2>
          <Tooltip content="A complete overview of your deal including agreed terms, selected providers, costs, and shipment status." />
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A283B] border border-[#2A3B52] text-xs font-medium text-[#8899AA] hover:text-white hover:border-[#3A4B62] transition-colors"
        >
          <Printer size={14} />
          Export PDF
        </button>
      </div>

      {/* Hero Banner */}
      <SummaryHeroBanner deal={deal} latestShipment={latestShipment} />

      {/* Trade Info Bar */}
      <TradeInfoBar deal={deal} latestShipment={latestShipment} />

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Main column — deal details */}
        <div className="flex-1 min-w-0 space-y-4">
          <DealOverviewSection deal={deal} />
          <PartiesProvidersSection
            deal={deal}
            selectedInsuranceQuote={selectedInsuranceQuote}
            selectedLogisticsQuote={selectedLogisticsQuote}
            buyerName={buyerName}
            sellerName={sellerName}
          />
          <CostBreakdownSection
            deal={deal}
            selectedInsuranceQuote={selectedInsuranceQuote}
            selectedLogisticsQuote={selectedLogisticsQuote}
          />
          {/* Currency Conversion — renders below cost breakdown, shares useLiveCurrency singleton */}
          {(() => {
            const snapshot = deal.latestOfferSnapshot;
            return (
              <CurrencyConvertPanel
                price={snapshot?.price}
                currency={snapshot?.currency}
                quantity={snapshot?.quantity}
                estimatedTotal={snapshot?.estimatedTotal ?? (snapshot?.price != null && snapshot?.quantity != null ? snapshot.price * snapshot.quantity : null)}
              />
            );
          })()}
          <DocumentsSection deal={deal} contract={contract} />
          <LegalConsultingSection
            legalEngagement={legalEngagement}
            currentUserUid={currentUserUid}
            dealId={dealId}
          />
          <LegalBanner dealId={dealId} currentUserUid={currentUserUid} />
        </div>

        {/* Right sidebar — map + order timeline */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4">
          <TradeRouteMap
            originName={originName}
            destinationName={destinationName}
          />
          <OrderTimeline
            deal={deal}
            shipmentUpdates={shipmentUpdates}
            dealId={dealId}
          />
        </div>
      </div>

      {/* Legal disclaimer footer */}
      <div className="rounded-xl border border-[#2A3B52] bg-[#0b1626] px-4 py-3 text-center">
        <p className="text-[10px] text-[#8899AA] italic">
          This summary is for informational purposes only and does not constitute a legally
          binding document. Always refer to the signed contract for authoritative terms.
        </p>
      </div>
    </div>
  );
}

export default TradeSummaryTab;
