/**
 * QuotesPage Component
 *
 * Main buyer quotes comparison layout orchestrator.
 * Two-column grid: main content (col-span-2) + sidebar (col-span-1).
 *
 * Main content has two stacked sections:
 * 1. Insurance Quotes (green accent): filter by ICC coverage type, sort by price/validity
 * 2. Logistics Quotes (blue accent): filter by transport mode, sort by price/fastest/validity
 *
 * Features:
 * - Real-time live pulse indicator with quote counts
 * - Filter pills and sort controls per section
 * - Auto-calculated ribbons: Cheapest, Fastest (logistics), Best Value (logistics)
 * - QuotesSidebar with live cost breakdown
 */

'use client';

import { useState, useMemo } from 'react';
import { QuotesSidebar } from '../QuotesSidebar/QuotesSidebar';
import { TRANSPORT_MODE } from '@/core/constants/quoteConstants';
import { QuoteGrid } from './QuoteGrid';
import { LegalBanner } from '@/presentation/components/features/legal/LegalBanner/LegalBanner';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const INSURANCE_SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'validity_desc', label: 'Most Time Remaining' },
];

const LOGISTICS_SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'validity_desc', label: 'Most Time Remaining' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sortQuotes(quotes, sortValue) {
  const sorted = [...quotes];
  switch (sortValue) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.getPrice() ?? Infinity) - (b.getPrice() ?? Infinity));
    case 'price_desc':
      return sorted.sort((a, b) => (b.getPrice() ?? -Infinity) - (a.getPrice() ?? -Infinity));
    case 'fastest':
      return sorted.sort((a, b) => (a.estimatedTransitDays ?? Infinity) - (b.estimatedTransitDays ?? Infinity));
    case 'validity_desc':
      return sorted.sort((a, b) => (b.validUntil?.getTime?.() ?? 0) - (a.validUntil?.getTime?.() ?? 0));
    default:
      return sorted;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QuotesPage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Quote').Quote[]} props.insuranceQuotes
 * @param {import('@/domain/entities/Quote').Quote[]} props.logisticsQuotes
 * @param {import('@/domain/entities/Quote').Quote|null} props.selectedInsuranceQuote
 * @param {import('@/domain/entities/Quote').Quote|null} props.selectedLogisticsQuote
 * @param {import('@/domain/entities/QuoteRequest').QuoteRequest[]} props.quoteRequests
 * @param {string} props.currentUserUid
 * @param {{ acceptQuote: Function, confirmSelection: Function, loading: boolean }} props.actions
 * @param {boolean} props.isBuyer
 * @param {boolean} [props.loading]
 */
export function QuotesPage({
  deal,
  insuranceQuotes,
  logisticsQuotes,
  selectedInsuranceQuote,
  selectedLogisticsQuote,
  quoteRequests,
  currentUserUid,
  actions,
  isBuyer,
  loading = false,
}) {
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [insuranceSort, setInsuranceSort] = useState('price_asc');
  const [logisticsFilter, setLogisticsFilter] = useState('all');
  const [logisticsSort, setLogisticsSort] = useState('price_asc');
  const [skippedInsurance, setSkippedInsurance] = useState(!!deal?.skippedInsurance);
  const [skippedLogistics, setSkippedLogistics] = useState(!!deal?.skippedLogistics);

  const insuranceFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'A', label: 'ICC A' },
    { value: 'B', label: 'ICC B' },
    { value: 'C', label: 'ICC C' },
  ];

  const logisticsFilterOptions = [
    { value: 'all', label: 'All' },
    ...TRANSPORT_MODE.map((m) => ({ value: m.value, label: m.label })),
  ];

  const displayedInsuranceQuotes = useMemo(() => {
    const filtered = insuranceFilter === 'all'
      ? insuranceQuotes
      : insuranceQuotes.filter((q) => q.iccCoverage === insuranceFilter);
    return sortQuotes(filtered, insuranceSort);
  }, [insuranceQuotes, insuranceFilter, insuranceSort]);

  const displayedLogisticsQuotes = useMemo(() => {
    const filtered = logisticsFilter === 'all'
      ? logisticsQuotes
      : logisticsQuotes.filter((q) => q.transportMode === logisticsFilter);
    return sortQuotes(filtered, logisticsSort);
  }, [logisticsQuotes, logisticsFilter, logisticsSort]);

  const insuranceRibbons = useMemo(() => {
    const ribbons = {};
    const active = insuranceQuotes.filter((q) => q.isActive());
    if (active.length === 0) return ribbons;
    const cheapest = active.reduce((min, q) =>
      (q.getPrice() ?? Infinity) < (min.getPrice() ?? Infinity) ? q : min
    );
    ribbons[cheapest.id] = 'Cheapest';
    return ribbons;
  }, [insuranceQuotes]);

  const logisticsRibbons = useMemo(() => {
    const ribbons = {};
    const active = logisticsQuotes.filter((q) => q.isActive());
    if (active.length === 0) return ribbons;

    const cheapest = active.reduce((min, q) =>
      (q.getPrice() ?? Infinity) < (min.getPrice() ?? Infinity) ? q : min
    );
    ribbons[cheapest.id] = 'Cheapest';

    const withTransit = active.filter((q) => q.estimatedTransitDays != null);
    if (withTransit.length > 0) {
      const fastest = withTransit.reduce((min, q) =>
        q.estimatedTransitDays < min.estimatedTransitDays ? q : min
      );
      if (!ribbons[fastest.id]) ribbons[fastest.id] = 'Fastest';
    }

    const withBoth = active.filter(
      (q) => q.freightCost != null && q.estimatedTransitDays != null && q.estimatedTransitDays > 0
    );
    if (withBoth.length > 0) {
      const bestValue = withBoth.reduce((best, q) => {
        const ratio = q.freightCost / q.estimatedTransitDays;
        const bestRatio = best.freightCost / best.estimatedTransitDays;
        return ratio < bestRatio ? q : best;
      });
      if (!ribbons[bestValue.id]) ribbons[bestValue.id] = 'Best Value';
    }

    return ribbons;
  }, [logisticsQuotes]);

  const insuranceAccent = {
    bg: 'bg-emerald-900/40',
    badge: 'bg-emerald-900/40 text-emerald-400',
    activeFilter: 'bg-emerald-700 text-white',
  };

  const logisticsAccent = {
    bg: 'bg-blue-900/40',
    badge: 'bg-blue-900/40 text-blue-400',
    activeFilter: 'bg-blue-700 text-white',
  };

  if (!deal) return null;

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[calc(var(--navbar-height)+24px)] pb-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Page Header */}
        <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-white">Compare Provider Quotes</h1>
              <p className="text-sm text-[#8899AA] mt-0.5">
                {deal.productName} &mdash; Deal{' '}
                <span className="font-mono text-xs text-[#4A5B6E]">#{deal.id?.slice(-8)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8899AA]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {loading
                ? 'Loading quotes...'
                : `${insuranceQuotes.length} insurance · ${logisticsQuotes.length} logistics`}
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuoteGrid
              type="insurance"
              quotes={insuranceQuotes}
              displayedQuotes={displayedInsuranceQuotes}
              accentColor={insuranceAccent}
              filterOptions={insuranceFilterOptions}
              filterValue={insuranceFilter}
              onFilterChange={setInsuranceFilter}
              sortOptions={INSURANCE_SORT_OPTIONS}
              sortValue={insuranceSort}
              onSortChange={setInsuranceSort}
              loading={loading}
              ribbons={insuranceRibbons}
              selectedQuote={selectedInsuranceQuote}
              isBuyer={isBuyer}
              onSelect={actions.acceptQuote}
              skipped={skippedInsurance}
              onSkip={() => setSkippedInsurance(true)}
              onUndoSkip={() => setSkippedInsurance(false)}
            />

            <QuoteGrid
              type="logistics"
              quotes={logisticsQuotes}
              displayedQuotes={displayedLogisticsQuotes}
              accentColor={logisticsAccent}
              filterOptions={logisticsFilterOptions}
              filterValue={logisticsFilter}
              onFilterChange={setLogisticsFilter}
              sortOptions={LOGISTICS_SORT_OPTIONS}
              sortValue={logisticsSort}
              onSortChange={setLogisticsSort}
              loading={loading}
              ribbons={logisticsRibbons}
              selectedQuote={selectedLogisticsQuote}
              isBuyer={isBuyer}
              onSelect={actions.acceptQuote}
              skipped={skippedLogistics}
              onSkip={() => setSkippedLogistics(true)}
              onUndoSkip={() => setSkippedLogistics(false)}
            />
          </div>

          {/* Sidebar */}
          <div>
            <QuotesSidebar
              deal={deal}
              selectedInsuranceQuote={selectedInsuranceQuote}
              selectedLogisticsQuote={selectedLogisticsQuote}
              isBuyer={isBuyer}
              actions={actions}
              skippedInsurance={skippedInsurance}
              skippedLogistics={skippedLogistics}
            />
          </div>
        </div>

        {/* Legal banner — below quote grids */}
        <LegalBanner dealId={deal.id} currentUserUid={currentUserUid} />
      </div>
    </div>
  );
}

export default QuotesPage;
