/**
 * QuotesPage Component
 *
 * Main buyer quotes comparison layout.
 * Two-column grid: main content (col-span-2) + sidebar (col-span-1).
 *
 * Main content has two stacked sections:
 * 1. Insurance Quotes (green accent): filter by ICC coverage type, sort by price/validity
 * 2. Logistics Quotes (blue accent): filter by transport mode, sort by price/fastest/validity
 *
 * Features:
 * - Real-time live pulse indicator with quote counts
 * - Filter pills for ICC coverage (insurance) and transport mode (logistics)
 * - Sort select: price low/high, fastest (logistics), most time remaining
 * - Auto-calculated ribbons: Cheapest, Fastest (logistics), Best Value (logistics)
 * - Ribbon props passed to InsuranceQuoteCard / LogisticsQuoteCard
 * - Empty states when no quotes have arrived yet
 * - QuotesSidebar with live cost breakdown
 *
 * Pattern: Adapted from DealPage two-column layout (lg:grid-cols-3 gap-6)
 * Color coding: green accent for insurance, blue accent for logistics (CONTEXT.md)
 */

'use client';

import { useState, useMemo } from 'react';
import { Shield, Truck, Activity, ArrowUpDown } from 'lucide-react';
import { InsuranceQuoteCard } from '../InsuranceQuoteCard/InsuranceQuoteCard';
import { LogisticsQuoteCard } from '../LogisticsQuoteCard/LogisticsQuoteCard';
import { QuotesSidebar } from '../QuotesSidebar/QuotesSidebar';
import { TRANSPORT_MODE } from '@/core/constants/quoteConstants';

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
      return sorted.sort(
        (a, b) =>
          (a.estimatedTransitDays ?? Infinity) - (b.estimatedTransitDays ?? Infinity)
      );
    case 'validity_desc':
      return sorted.sort(
        (a, b) =>
          (b.validUntil?.getTime?.() ?? 0) - (a.validUntil?.getTime?.() ?? 0)
      );
    default:
      return sorted;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count, accentColor }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentColor.bg}`}>
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {count > 0 && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accentColor.badge}`}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Pills
// ─────────────────────────────────────────────────────────────────────────────

function FilterPills({ options, value, onChange, accentColor }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            value === opt.value
              ? `${accentColor.activeFilter} border-transparent`
              : 'bg-transparent border-[#2A3B52] text-[#8899AA] hover:border-[#4A5B6E] hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sort Select
// ─────────────────────────────────────────────────────────────────────────────

function SortSelect({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={12} className="text-[#8899AA]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs bg-[#1A283B] border border-[#2A3B52] text-[#8899AA] rounded-lg px-2 py-1 focus:outline-none focus:border-[#4A5B6E]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div className="border border-dashed border-[#2A3B52] rounded-xl p-8 text-center">
      <Activity size={24} className="text-[#4A5B6E] mx-auto mb-2" />
      <p className="text-sm text-[#4A5B6E]">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuotesPage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuotesPage
 *
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
  // ── Insurance filter/sort state ────────────────────────────────────────────
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [insuranceSort, setInsuranceSort] = useState('price_asc');

  // ── Logistics filter/sort state ────────────────────────────────────────────
  const [logisticsFilter, setLogisticsFilter] = useState('all');
  const [logisticsSort, setLogisticsSort] = useState('price_asc');

  // ── Insurance filter pills ─────────────────────────────────────────────────
  const insuranceFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'A', label: 'ICC A' },
    { value: 'B', label: 'ICC B' },
    { value: 'C', label: 'ICC C' },
  ];

  // ── Logistics filter pills ─────────────────────────────────────────────────
  const logisticsFilterOptions = [
    { value: 'all', label: 'All' },
    ...TRANSPORT_MODE.map((m) => ({ value: m.value, label: m.label })),
  ];

  // ── Filtered + sorted insurance quotes ────────────────────────────────────
  const displayedInsuranceQuotes = useMemo(() => {
    const filtered = insuranceFilter === 'all'
      ? insuranceQuotes
      : insuranceQuotes.filter((q) => q.iccCoverage === insuranceFilter);
    return sortQuotes(filtered, insuranceSort);
  }, [insuranceQuotes, insuranceFilter, insuranceSort]);

  // ── Filtered + sorted logistics quotes ────────────────────────────────────
  const displayedLogisticsQuotes = useMemo(() => {
    const filtered = logisticsFilter === 'all'
      ? logisticsQuotes
      : logisticsQuotes.filter((q) => q.transportMode === logisticsFilter);
    return sortQuotes(filtered, logisticsSort);
  }, [logisticsQuotes, logisticsFilter, logisticsSort]);

  // ── Auto-calculated ribbons (insurance) ───────────────────────────────────
  const insuranceRibbons = useMemo(() => {
    const ribbons = {};
    const active = insuranceQuotes.filter((q) => q.isActive());
    if (active.length === 0) return ribbons;

    // Cheapest: lowest premiumAmount
    const cheapest = active.reduce((min, q) =>
      (q.getPrice() ?? Infinity) < (min.getPrice() ?? Infinity) ? q : min
    );
    ribbons[cheapest.id] = 'Cheapest';

    return ribbons;
  }, [insuranceQuotes]);

  // ── Auto-calculated ribbons (logistics) ───────────────────────────────────
  const logisticsRibbons = useMemo(() => {
    const ribbons = {};
    const active = logisticsQuotes.filter((q) => q.isActive());
    if (active.length === 0) return ribbons;

    // Cheapest: lowest freightCost
    const cheapest = active.reduce((min, q) =>
      (q.getPrice() ?? Infinity) < (min.getPrice() ?? Infinity) ? q : min
    );
    ribbons[cheapest.id] = 'Cheapest';

    // Fastest: lowest estimatedTransitDays
    const withTransit = active.filter((q) => q.estimatedTransitDays != null);
    if (withTransit.length > 0) {
      const fastest = withTransit.reduce((min, q) =>
        q.estimatedTransitDays < min.estimatedTransitDays ? q : min
      );
      if (!ribbons[fastest.id]) {
        ribbons[fastest.id] = 'Fastest';
      }
    }

    // Best Value: lowest price-per-transit-day ratio
    const withBoth = active.filter(
      (q) => q.freightCost != null && q.estimatedTransitDays != null && q.estimatedTransitDays > 0
    );
    if (withBoth.length > 0) {
      const bestValue = withBoth.reduce((best, q) => {
        const ratio = q.freightCost / q.estimatedTransitDays;
        const bestRatio = best.freightCost / best.estimatedTransitDays;
        return ratio < bestRatio ? q : best;
      });
      if (!ribbons[bestValue.id]) {
        ribbons[bestValue.id] = 'Best Value';
      }
    }

    return ribbons;
  }, [logisticsQuotes]);

  // ── Colors ─────────────────────────────────────────────────────────────────
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

  // ── Handler: select a provider quote ──────────────────────────────────────
  function handleSelectQuote(quoteRequestId, quoteId) {
    actions.acceptQuote(quoteRequestId, quoteId);
  }

  if (!deal) return null;

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[var(--navbar-height)] pb-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Page Header */}
        <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-white">
                Compare Provider Quotes
              </h1>
              <p className="text-sm text-[#8899AA] mt-0.5">
                {deal.productName} &mdash; Deal{' '}
                <span className="font-mono text-xs text-[#4A5B6E]">
                  #{deal.id?.slice(-8)}
                </span>
              </p>
            </div>
            {/* Live pulse indicator */}
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

        {/* Two-column grid: main (col-span-2) + sidebar (col-span-1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Insurance Quotes Section ── */}
            <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <SectionHeader
                  icon={<Shield size={14} className="text-emerald-400" />}
                  title="Insurance Quotes"
                  count={insuranceQuotes.length}
                  accentColor={insuranceAccent}
                />
                <SortSelect
                  options={INSURANCE_SORT_OPTIONS}
                  value={insuranceSort}
                  onChange={setInsuranceSort}
                />
              </div>

              {/* Filter pills */}
              <FilterPills
                options={insuranceFilterOptions}
                value={insuranceFilter}
                onChange={setInsuranceFilter}
                accentColor={insuranceAccent}
              />

              {/* Quote grid or empty state */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-48 bg-[#0F1C2E] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : displayedInsuranceQuotes.length === 0 ? (
                <EmptyState
                  message={
                    insuranceFilter !== 'all'
                      ? 'No insurance quotes match the selected filter.'
                      : 'Waiting for insurance provider quotes...'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedInsuranceQuotes.map((quote) => (
                    <InsuranceQuoteCard
                      key={quote.id}
                      quote={quote}
                      isBuyer={isBuyer}
                      isSelected={selectedInsuranceQuote?.id === quote.id}
                      onSelect={handleSelectQuote}
                      ribbon={insuranceRibbons[quote.id] || null}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Logistics Quotes Section ── */}
            <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <SectionHeader
                  icon={<Truck size={14} className="text-blue-400" />}
                  title="Logistics Quotes"
                  count={logisticsQuotes.length}
                  accentColor={logisticsAccent}
                />
                <SortSelect
                  options={LOGISTICS_SORT_OPTIONS}
                  value={logisticsSort}
                  onChange={setLogisticsSort}
                />
              </div>

              {/* Filter pills */}
              <FilterPills
                options={logisticsFilterOptions}
                value={logisticsFilter}
                onChange={setLogisticsFilter}
                accentColor={logisticsAccent}
              />

              {/* Quote grid or empty state */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-48 bg-[#0F1C2E] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : displayedLogisticsQuotes.length === 0 ? (
                <EmptyState
                  message={
                    logisticsFilter !== 'all'
                      ? 'No logistics quotes match the selected filter.'
                      : 'Waiting for logistics provider quotes...'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedLogisticsQuotes.map((quote) => (
                    <LogisticsQuoteCard
                      key={quote.id}
                      quote={quote}
                      isBuyer={isBuyer}
                      isSelected={selectedLogisticsQuote?.id === quote.id}
                      onSelect={handleSelectQuote}
                      ribbon={logisticsRibbons[quote.id] || null}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <QuotesSidebar
              deal={deal}
              selectedInsuranceQuote={selectedInsuranceQuote}
              selectedLogisticsQuote={selectedLogisticsQuote}
              isBuyer={isBuyer}
              actions={actions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotesPage;
