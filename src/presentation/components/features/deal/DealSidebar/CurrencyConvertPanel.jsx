'use client';

/**
 * CurrencyConvertPanel
 *
 * Self-contained currency conversion panel for the deal sidebar and trade summary.
 * Shows the current offer's unit price and estimated total converted to two
 * user-selected target currencies using live rates from useLiveCurrency.
 *
 * Target currency selections persist to localStorage. Defaults: EUR + USD
 * (auto-swapped if base currency matches a default).
 */

import { useState, useEffect } from 'react';
import {
  useLiveCurrency,
  convertAmount,
} from '@/presentation/hooks/intelligence/useLiveCurrency';
import {
  TICKER_CURRENCIES,
  TARGET_CURRENCY_KEYS,
} from '@/core/constants/currencyConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a converted amount using Intl.NumberFormat.
 * Returns '—' if the amount is null/undefined.
 */
function formatConverted(amount, currencyCode) {
  if (amount === null || amount === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported Intl currency codes (e.g. AED, SAR in some environments)
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Compute the cross-rate label: "1 {from} = {rate} {to}"
 * Returns null if rates are unavailable.
 */
function getRateLabel(fromCurrency, toCurrency, rates) {
  if (!rates || fromCurrency === toCurrency) return null;
  const rate = convertAmount(1, fromCurrency, toCurrency, rates);
  if (rate === null) return null;
  return `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
}

/**
 * Pick a sensible default target currency that is different from the base
 * and from the other target.
 */
function pickDefault(preferred, baseCurrency, otherTarget) {
  if (preferred !== baseCurrency && preferred !== otherTarget) return preferred;
  // Cycle through the currency list to find a valid fallback
  for (const { code } of TICKER_CURRENCIES) {
    if (code !== baseCurrency && code !== otherTarget) return code;
  }
  return preferred; // Last resort — shouldn't happen with 8 currencies
}

// ─────────────────────────────────────────────────────────────────────────────
// ConversionBlock — renders one target currency's converted rows
// ─────────────────────────────────────────────────────────────────────────────

function ConversionBlock({ label, targetCode, price, currency, estimatedTotal, rates, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-2.5 bg-[#2A3B52] rounded w-24" />
          <div className="h-2.5 bg-[#2A3B52] rounded w-20" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-2.5 bg-[#2A3B52] rounded w-20" />
          <div className="h-2.5 bg-[#2A3B52] rounded w-24" />
        </div>
      </div>
    );
  }

  const convertedPrice = convertAmount(price, currency, targetCode, rates);
  const convertedTotal = convertAmount(estimatedTotal, currency, targetCode, rates);
  const rateLabel = getRateLabel(currency, targetCode, rates);

  return (
    <div className="space-y-1">
      {/* Target currency header */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-semibold text-white">
          {TICKER_CURRENCIES.find((c) => c.code === targetCode)?.flag || ''} {targetCode}
        </span>
        {label && (
          <span className="text-[10px] text-[#8899AA]">({label})</span>
        )}
      </div>

      {/* Unit Price row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899AA]">Unit Price</span>
        <span className="text-xs font-semibold text-[#FFD700]">
          {formatConverted(convertedPrice, targetCode)}
        </span>
      </div>

      {/* Est. Total row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899AA]">Est. Total</span>
        <span className="text-xs font-semibold text-[#FFD700]">
          {formatConverted(convertedTotal, targetCode)}
        </span>
      </div>

      {/* Exchange rate label */}
      {rateLabel && (
        <p className="text-[10px] text-[#8899AA] text-right">{rateLabel}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CurrencyConvertPanel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ price: number|null, currency: string|null, quantity: number|null, estimatedTotal: number|null }} props
 */
export function CurrencyConvertPanel({ price, currency, quantity, estimatedTotal }) {
  const { rates, loading, isStale, cacheExpired, error } = useLiveCurrency();

  const baseCurrency = currency || 'USD';

  // ── Target currency state ──────────────────────────────────────────────────
  // Initialized to null; hydrated from localStorage on first effect run
  const [target1, setTarget1] = useState(null);
  const [target2, setTarget2] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const savedT1 = localStorage.getItem(TARGET_CURRENCY_KEYS.target1);
    const savedT2 = localStorage.getItem(TARGET_CURRENCY_KEYS.target2);

    const defaultT1 = pickDefault('EUR', baseCurrency, savedT2 || 'USD');
    const defaultT2 = pickDefault('USD', baseCurrency, savedT1 || defaultT1);

    setTarget1(savedT1 && savedT1 !== baseCurrency ? savedT1 : defaultT1);
    setTarget2(savedT2 && savedT2 !== baseCurrency ? savedT2 : defaultT2);
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — baseCurrency is read inside but not a reactive dep here

  const handleTarget1Change = (code) => {
    setTarget1(code);
    localStorage.setItem(TARGET_CURRENCY_KEYS.target1, code);
  };

  const handleTarget2Change = (code) => {
    setTarget2(code);
    localStorage.setItem(TARGET_CURRENCY_KEYS.target2, code);
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const resolvedEstimatedTotal =
    estimatedTotal ?? (price != null && quantity != null ? price * quantity : null);

  const noOfferData = price == null;
  const conversionUnavailable = !loading && (cacheExpired || (error && !rates));

  // Don't render dropdowns until hydrated to avoid flicker
  const showDropdowns = hydrated && target1 !== null && target2 !== null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wide">
          Currency Conversion
        </h4>
        <div className="flex items-center gap-1">
          {isStale && !cacheExpired && (
            <span className="text-[10px] text-amber-400 bg-amber-900/20 border border-amber-700/40 px-1.5 py-0.5 rounded-full">
              delayed
            </span>
          )}
          {baseCurrency && (
            <span className="text-[10px] text-[#8899AA]">
              Base: {baseCurrency}
            </span>
          )}
        </div>
      </div>

      {/* No offer data state */}
      {noOfferData ? (
        <p className="text-xs text-[#8899AA] italic">Awaiting offer data</p>
      ) : conversionUnavailable ? (
        /* Full unavailability state */
        <p className="text-xs text-[#8899AA] italic">Conversion unavailable</p>
      ) : (
        <>
          {/* Target currency droppers */}
          {showDropdowns && (
            <div className="flex gap-2 mb-4">
              {/* Target 1 dropdown */}
              <div className="flex-1">
                <label className="block text-[10px] text-[#8899AA] mb-1">Target 1</label>
                <select
                  value={target1}
                  onChange={(e) => handleTarget1Change(e.target.value)}
                  className="w-full bg-[#0F1C2E] border border-[#2A3B52] text-white text-xs rounded pl-2 pr-6 py-1 focus:outline-none focus:border-[#FFD700]/50"
                >
                  {TICKER_CURRENCIES.map(({ code, flag }) => (
                    <option key={code} value={code}>
                      {flag} {code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target 2 dropdown */}
              <div className="flex-1">
                <label className="block text-[10px] text-[#8899AA] mb-1">Target 2</label>
                <select
                  value={target2}
                  onChange={(e) => handleTarget2Change(e.target.value)}
                  className="w-full bg-[#0F1C2E] border border-[#2A3B52] text-white text-xs rounded pl-2 pr-6 py-1 focus:outline-none focus:border-[#FFD700]/50"
                >
                  {TICKER_CURRENCIES.map(({ code, flag }) => (
                    <option key={code} value={code}>
                      {flag} {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Conversion rows */}
          <div className="space-y-3">
            {showDropdowns && (
              <>
                <ConversionBlock
                  targetCode={target1}
                  price={price}
                  currency={baseCurrency}
                  estimatedTotal={resolvedEstimatedTotal}
                  rates={rates}
                  loading={loading}
                />

                {/* Divider */}
                <div className="border-t border-[#2A3B52]" />

                <ConversionBlock
                  targetCode={target2}
                  price={price}
                  currency={baseCurrency}
                  estimatedTotal={resolvedEstimatedTotal}
                  rates={rates}
                  loading={loading}
                />
              </>
            )}

            {/* Loading skeleton before hydration */}
            {!showDropdowns && loading && (
              <div className="animate-pulse space-y-2">
                <div className="h-2.5 bg-[#2A3B52] rounded w-3/4" />
                <div className="h-2.5 bg-[#2A3B52] rounded w-full" />
                <div className="h-2.5 bg-[#2A3B52] rounded w-3/4" />
                <div className="h-2.5 bg-[#2A3B52] rounded w-full" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CurrencyConvertPanel;
