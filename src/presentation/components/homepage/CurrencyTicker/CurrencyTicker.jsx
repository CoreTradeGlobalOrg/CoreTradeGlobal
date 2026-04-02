'use client';

/**
 * CurrencyTicker
 *
 * Auto-scrolling marquee bar displaying live exchange rates for 8 currencies.
 * Fixed below the navbar on the homepage — visible to all visitors
 * without login (INTEL-01).
 *
 * - Rates auto-refresh every 60s via useLiveCurrency singleton hook
 * - Tracks navbar height on scroll (100px default → 80px scrolled, 70→60 mobile)
 * - Pauses on hover for readability
 * - "Updated X ago" timestamp appended at the end of each content block
 * - Graceful fallback: shows cached rates with warning badge, or "unavailable" message
 * - Responsive: text-[10px] on mobile, sm:text-xs on desktop
 */

import { useState, useEffect } from 'react';
import { useLiveCurrency } from '@/presentation/hooks/intelligence/useLiveCurrency';
import { TICKER_PAIRS } from '@/core/constants/currencyConstants';
import { formatDistanceToNow } from 'date-fns';

// ── Navbar height tracker ────────────────────────────────────────────────────

function useNavbarHeight() {
  const [top, setTop] = useState(100);

  useEffect(() => {
    function update() {
      const nav = document.querySelector('.navbar');
      if (nav) {
        setTop(nav.offsetHeight);
      }
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return top;
}

// ── Rate calculation helpers ──────────────────────────────────────────────────

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
  const availablePairs = TICKER_PAIRS.filter((pair) => {
    return getPairRate(pair, rates) !== null;
  });

  return (
    <span className="inline-flex items-center" aria-hidden={ariaHidden || undefined}>
      {availablePairs.map((pair, i) => {
        const currentRate = getPairRate(pair, rates);
        const decimals = getDecimalPlaces(pair);
        const displayRate = currentRate !== null ? currentRate.toFixed(decimals) : '—';

        return (
          <span key={pair.label} className="inline-flex items-center">
            {i > 0 && (
              <span className="text-[#4A5568] mx-2" aria-hidden="true">·</span>
            )}
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

function TickerSkeleton({ top }) {
  return (
    <div
      style={{ top }}
      className="fixed left-0 right-0 z-[999] overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5 px-4 transition-[top] duration-200"
    >
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
  const navbarHeight = useNavbarHeight();
  const { rates, fetchedAt, isStale, cacheExpired, error, loading } =
    useLiveCurrency();

  if (loading) {
    return <TickerSkeleton top={navbarHeight} />;
  }

  if (cacheExpired || (error && !rates)) {
    return (
      <div
        style={{ top: navbarHeight }}
        className="fixed left-0 right-0 z-[999] overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5 px-4 transition-[top] duration-200"
      >
        <p className="text-[10px] sm:text-xs text-[#8899AA] text-center">
          Currency rates temporarily unavailable
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ top: navbarHeight }}
      className="fixed left-0 right-0 z-[999] overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5 transition-[top] duration-200"
    >
      <div
        className="flex animate-marquee whitespace-nowrap text-[10px] sm:text-xs [animation-play-state:running] hover:[animation-play-state:paused]"
      >
        <TickerItems rates={rates} fetchedAt={fetchedAt} isStale={isStale} />
        <TickerItems rates={rates} fetchedAt={fetchedAt} isStale={isStale} ariaHidden />
      </div>
    </div>
  );
}
