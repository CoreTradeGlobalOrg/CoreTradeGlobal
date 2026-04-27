/**
 * QuoteGrid Component
 *
 * Renders a single quote type section (insurance or logistics):
 * section header, filter pills, sort select, and the card grid or empty/loading state.
 */

'use client';

import { Shield, Truck } from 'lucide-react';
import { InsuranceQuoteCard } from '../InsuranceQuoteCard/InsuranceQuoteCard';
import { LogisticsQuoteCard } from '../LogisticsQuoteCard/LogisticsQuoteCard';
import { SectionHeader, FilterPills, SortSelect, EmptyState } from './QuoteFilters';
import { Tooltip } from '@/presentation/components/common/Tooltip/Tooltip';

/**
 * @param {Object} props
 * @param {'insurance'|'logistics'} props.type
 * @param {import('@/domain/entities/Quote').Quote[]} props.quotes - raw (unfiltered) quotes for count
 * @param {import('@/domain/entities/Quote').Quote[]} props.displayedQuotes - filtered+sorted quotes
 * @param {Object} props.accentColor - { bg, badge, activeFilter }
 * @param {Array} props.filterOptions
 * @param {string} props.filterValue
 * @param {Function} props.onFilterChange
 * @param {Array} props.sortOptions
 * @param {string} props.sortValue
 * @param {Function} props.onSortChange
 * @param {boolean} props.loading
 * @param {Object} props.ribbons - { [quoteId]: 'Cheapest' | 'Fastest' | 'Best Value' }
 * @param {import('@/domain/entities/Quote').Quote|null} props.selectedQuote
 * @param {boolean} props.isBuyer
 * @param {Function} props.onSelect - (quoteRequestId, quoteId) => void
 * @param {boolean} [props.skipped] - section skipped by buyer
 * @param {Function} [props.onSkip] - mark section as skipped
 * @param {Function} [props.onUndoSkip] - undo skip
 */
export function QuoteGrid({
  type,
  quotes,
  displayedQuotes,
  accentColor,
  filterOptions,
  filterValue,
  onFilterChange,
  sortOptions,
  sortValue,
  onSortChange,
  loading,
  ribbons,
  selectedQuote,
  isBuyer,
  onSelect,
  skipped = false,
  onSkip,
  onUndoSkip,
}) {
  const isInsurance = type === 'insurance';
  const icon = isInsurance
    ? <Shield size={14} className="text-emerald-400" />
    : <Truck size={14} className="text-blue-400" />;
  const title = isInsurance ? 'Insurance Quotes' : 'Logistics Quotes';
  const emptyFilterMsg = isInsurance
    ? 'No insurance quotes match the selected filter.'
    : 'No logistics quotes match the selected filter.';
  const emptyWaitMsg = isInsurance
    ? 'Waiting for insurance provider quotes...'
    : 'Waiting for logistics provider quotes...';
  const filterKey = isInsurance ? 'insuranceFilter' : 'logisticsFilter';
  const tooltipContent = isInsurance
    ? 'Insurance quotes cover cargo damage, loss, and delays during transit. ICC-A provides the broadest coverage.'
    : 'Logistics quotes cover transportation from origin to destination. Compare rates, transit times, and transport modes.';

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <SectionHeader
            icon={icon}
            title={title}
            count={quotes.length}
            accentColor={accentColor}
          />
          <Tooltip content={tooltipContent} />
        </div>
        <div className="flex items-center gap-3">
          {isBuyer && !skipped && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-[#8899AA] hover:text-amber-400 transition-colors"
            >
              Skip — I'll arrange my own
            </button>
          )}
          <SortSelect options={sortOptions} value={sortValue} onChange={onSortChange} />
        </div>
      </div>

      {/* Skipped state */}
      {skipped ? (
        <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-amber-900/10 border border-amber-500/30">
          <span className="text-amber-400 text-sm">&#x26A0;</span>
          <span className="text-xs text-[#8899AA]">
            {isInsurance ? 'Insurance' : 'Logistics'} not arranged via platform
          </span>
          {onUndoSkip && (
            <button
              type="button"
              onClick={onUndoSkip}
              className="ml-auto text-xs text-[#FFD700] hover:text-[#FFE44D] underline"
            >
              Undo skip
            </button>
          )}
        </div>
      ) : (
        <>
          <FilterPills
            options={filterOptions}
            value={filterValue}
            onChange={onFilterChange}
            accentColor={accentColor}
          />

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-[#0F1C2E] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : displayedQuotes.length === 0 ? (
            <EmptyState
              message={filterValue !== 'all' ? emptyFilterMsg : emptyWaitMsg}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedQuotes.map((quote) =>
                isInsurance ? (
                  <InsuranceQuoteCard
                    key={quote.id}
                    quote={quote}
                    isBuyer={isBuyer}
                    isSelected={selectedQuote?.id === quote.id}
                    onSelect={onSelect}
                    ribbon={ribbons[quote.id] || null}
                  />
                ) : (
                  <LogisticsQuoteCard
                    key={quote.id}
                    quote={quote}
                    isBuyer={isBuyer}
                    isSelected={selectedQuote?.id === quote.id}
                    onSelect={onSelect}
                    ribbon={ribbons[quote.id] || null}
                  />
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default QuoteGrid;
