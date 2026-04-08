'use client';

/**
 * CurrencyTicker
 *
 * Auto-scrolling marquee bar displaying live exchange rates.
 * Rendered inside the Navbar at the bottom — no fixed positioning needed.
 * Visible to all visitors without login (INTEL-01).
 */

import { useLiveCurrency } from '@/presentation/hooks/intelligence/useLiveCurrency';
import { TICKER_PAIRS } from '@/core/constants/currencyConstants';
import { formatDistanceToNow } from 'date-fns';

// ── Rate calculation helpers ──────────────────────────────────────────────────

function getPairRate(pair, rates) {
  if (!rates) return null;
  const { base, quote } = pair;

  if (base === 'EUR') return rates[quote] ?? null;
  if (quote === 'EUR') {
    const baseRate = rates[base];
    return baseRate ? 1 / baseRate : null;
  }
  const baseRate = rates[base];
  const quoteRate = rates[quote];
  if (!baseRate || !quoteRate) return null;
  return quoteRate / baseRate;
}

function getDecimalPlaces(pair) {
  if (pair.quote === 'JPY' || pair.base === 'JPY') return 2;
  if (pair.quote === 'TRY' || pair.base === 'TRY') return 2;
  return 4;
}

// ── Ticker items ──────────────────────────────────────────────────────────────

function TickerItems({ rates, fetchedAt, isStale, ariaHidden = false }) {
  const availablePairs = TICKER_PAIRS.filter((pair) => getPairRate(pair, rates) !== null);

  return (
    <span className="inline-flex items-center" aria-hidden={ariaHidden || undefined}>
      {availablePairs.map((pair, i) => {
        const currentRate = getPairRate(pair, rates);
        const decimals = getDecimalPlaces(pair);
        const displayRate = currentRate !== null ? currentRate.toFixed(decimals) : '—';

        return (
          <span key={pair.label} className="inline-flex items-center">
            {i > 0 && <span className="text-[#4A5568] mx-2" aria-hidden="true">·</span>}
            <span className="text-[#FFD700] font-semibold mr-1">{pair.label}</span>
            <span className="text-white">{displayRate}</span>
          </span>
        );
      })}

      <span className="text-[#4A5568] mx-3" aria-hidden="true">|</span>

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
    <div className="w-full overflow-hidden bg-[#0A1628] border-t border-[#2A3B52] py-1.5 px-4">
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
  const { rates, fetchedAt, isStale, cacheExpired, error, loading } = useLiveCurrency();

  if (loading) return <TickerSkeleton />;

  if (cacheExpired || (error && !rates)) {
    return (
      <div className="w-full overflow-hidden bg-[#0A1628] border-t border-[#2A3B52] py-1.5 px-4">
        <p className="text-[10px] sm:text-xs text-[#8899AA] text-center">
          Currency rates temporarily unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-[#0A1628] border-t border-[#2A3B52] py-1.5">
      <div className="flex animate-marquee whitespace-nowrap text-[10px] sm:text-xs [animation-play-state:running] hover:[animation-play-state:paused]">
        <TickerItems rates={rates} fetchedAt={fetchedAt} isStale={isStale} />
        <TickerItems rates={rates} fetchedAt={fetchedAt} isStale={isStale} ariaHidden />
      </div>
    </div>
  );
}
