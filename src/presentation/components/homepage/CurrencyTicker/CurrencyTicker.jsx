'use client';

/**
 * CurrencyTicker
 *
 * Auto-scrolling marquee bar displaying live exchange rates for 8 currencies.
 * Positioned above the hero section on the homepage — visible to all visitors
 * without login (INTEL-01).
 *
 * - Rates auto-refresh every 60s via useLiveCurrency singleton hook
 * - Arrow indicators (▲/▼) show rate direction vs previous fetch
 * - Pauses on hover for readability
 * - "Updated X ago" timestamp appended at the end of each content block
 * - Graceful fallback: shows cached rates with warning badge, or "unavailable" message
 * - Responsive: text-[10px] on mobile, sm:text-xs on desktop
 */

import { useLiveCurrency } from '@/presentation/hooks/intelligence/useLiveCurrency';
import { TICKER_PAIRS } from '@/core/constants/currencyConstants';
import { formatDistanceToNow } from 'date-fns';

// ── Rate calculation helpers ──────────────────────────────────────────────────

/**
 * Computes the display rate for a given pair from EUR-based rates object.
 * All rates in _rates are "X per 1 EUR", so:
 *   EUR/USD = rates.USD
 *   USD/EUR = 1 / rates.USD
 *   USD/GBP = rates.GBP / rates.USD (convert USD→EUR→GBP)
 *
 * @param {{ base: string, quote: string }} pair
 * @param {Object} rates - rates keyed by currency code, all vs EUR
 * @returns {number|null}
 */
function getPairRate(pair, rates) {
  if (!rates) return null;
  const { base, quote } = pair;

  if (base === 'EUR') {
    return rates[quote] ?? null;
  }
  if (quote === 'EUR') {
    const baseRate = rates[base];
    return baseRate ? 1 / baseRate : null;
  }
  // Cross rate: base→EUR→quote
  const baseRate = rates[base];
  const quoteRate = rates[quote];
  if (!baseRate || !quoteRate) return null;
  return quoteRate / baseRate;
}

/**
 * Returns the decimal places to show for a given pair rate value.
 * JPY pairs typically show 2 decimal places; others show 4.
 */
function getDecimalPlaces(pair) {
  if (pair.quote === 'JPY' || pair.base === 'JPY') return 2;
  if (pair.quote === 'TRY' || pair.base === 'TRY') return 2;
  return 4;
}

// ── Arrow indicator ───────────────────────────────────────────────────────────

function ArrowIndicator({ current, previous }) {
  if (current === null || previous === null || previous === undefined) {
    return <span className="text-[#4A5568] ml-0.5">–</span>;
  }
  if (current > previous) {
    return <span className="text-emerald-400 ml-0.5">▲</span>;
  }
  if (current < previous) {
    return <span className="text-red-400 ml-0.5">▼</span>;
  }
  return <span className="text-[#4A5568] ml-0.5">–</span>;
}

// ── Ticker items ──────────────────────────────────────────────────────────────

function TickerItems({ rates, previousRates, fetchedAt, isStale, ariaHidden = false }) {
  // Filter to only pairs where we have data for both currencies
  const availablePairs = TICKER_PAIRS.filter((pair) => {
    const rate = getPairRate(pair, rates);
    return rate !== null;
  });

  return (
    <span className="inline-flex items-center" aria-hidden={ariaHidden || undefined}>
      {availablePairs.map((pair, i) => {
        const currentRate = getPairRate(pair, rates);
        const prevRate = getPairRate(pair, previousRates);
        const decimals = getDecimalPlaces(pair);
        const displayRate = currentRate !== null ? currentRate.toFixed(decimals) : '—';

        return (
          <span key={pair.label} className="inline-flex items-center">
            {/* Dot divider between items */}
            {i > 0 && (
              <span className="text-[#4A5568] mx-2" aria-hidden="true">·</span>
            )}
            {/* Pair label in gold */}
            <span className="text-[#FFD700] font-semibold mr-1">{pair.label}</span>
            {/* Rate value in white */}
            <span className="text-white">{displayRate}</span>
            {/* Direction arrow */}
            <ArrowIndicator current={currentRate} previous={prevRate} />
          </span>
        );
      })}

      {/* Separator before timestamp */}
      <span className="text-[#4A5568] mx-3" aria-hidden="true">|</span>

      {/* "Updated X ago" timestamp */}
      {fetchedAt && (
        <span className="text-[#8899AA] italic mr-4">
          Updated {formatDistanceToNow(new Date(fetchedAt), { addSuffix: true })}
          {isStale && (
            <span className="text-amber-400 not-italic ml-1">(rates may be delayed)</span>
          )}
        </span>
      )}
    </span>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TickerSkeleton() {
  return (
    <div className="fixed top-[100px] left-0 right-0 z-[999] overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5 px-4 max-md:top-[70px]">
      <div className="flex gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="h-3 w-16 bg-[#2A3B52] rounded" />
            <div className="h-3 w-12 bg-[#1E2D3D] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CurrencyTicker() {
  const { rates, previousRates, fetchedAt, isStale, cacheExpired, error, loading } =
    useLiveCurrency();

  // Loading state: show skeleton bar
  if (loading) {
    return <TickerSkeleton />;
  }

  // Cache expired and no data: show unavailable message
  if (cacheExpired || (error && !rates)) {
    return (
      <div className="fixed top-[100px] left-0 right-0 z-[999] overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5 px-4 max-md:top-[70px]">
        <p className="text-[10px] sm:text-xs text-[#8899AA] text-center">
          Currency rates temporarily unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="fixed top-[100px] sm:top-[100px] left-0 right-0 z-[999] overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5 max-md:top-[70px]">
      {/* Marquee container: duplicated content for seamless infinite loop */}
      <div
        className="flex animate-marquee whitespace-nowrap text-[10px] sm:text-xs [animation-play-state:running] hover:[animation-play-state:paused]"
      >
        {/* First copy */}
        <TickerItems
          rates={rates}
          previousRates={previousRates}
          fetchedAt={fetchedAt}
          isStale={isStale}
        />
        {/* Identical second copy — creates seamless loop when first copy exits */}
        <TickerItems
          rates={rates}
          previousRates={previousRates}
          fetchedAt={fetchedAt}
          isStale={isStale}
          ariaHidden
        />
      </div>
    </div>
  );
}
