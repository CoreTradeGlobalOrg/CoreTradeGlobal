'use client';

/**
 * FreightEstimatorWidget
 *
 * Collapsible freight cost estimator for the DealSidebar.
 * Auto-populates origin/destination from deal Incoterms namedPlace.
 * Fetches on-demand via useFreightEstimate (never auto-runs on load).
 *
 * INTEL-03: Freight estimator with origin, destination, weight, optional dims.
 * INTEL-04: Freightos called client-side first; proxy fallback only on CORS block.
 * INTEL-05: Graceful error states: API failure, rate limit, no results.
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Ship, Plane, Truck } from 'lucide-react';
import { useFreightEstimate } from '@/presentation/hooks/intelligence/useFreightEstimate';
import { useLiveCurrency, convertAmount } from '@/presentation/hooks/intelligence/useLiveCurrency';
import {
  TRANSPORT_MODES,
  getChargeableWeight,
  suggestLoadType,
} from '@/core/constants/freightConstants';

// ── Icon resolver ─────────────────────────────────────────────────────────────

const ICON_MAP = { Ship, Plane, Truck };

function TransportIcon({ iconName, className }) {
  const Icon = ICON_MAP[iconName] ?? Ship;
  return <Icon size={16} className={className} />;
}

// ── Skeleton loading cards ────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="space-y-2 mt-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-[#0F1C2E] border border-[#2A3B52] rounded-lg p-3 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-[#2A3B52] rounded" />
            <div className="h-3 bg-[#2A3B52] rounded w-24" />
          </div>
          <div className="h-3 bg-[#2A3B52] rounded w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Result card for one transport mode ───────────────────────────────────────

function ModeCard({ quote, dealCurrency, rates }) {
  const modeMeta = TRANSPORT_MODES.find((m) => m.key === quote.mode) ?? {
    label: quote.mode,
    icon: 'Ship',
  };

  // Convert from quote currency (usually USD) to deal currency
  const srcCurrency = quote.currency || 'USD';
  const minConverted = convertAmount(quote.minPrice, srcCurrency, dealCurrency, rates);
  const maxConverted = convertAmount(quote.maxPrice, srcCurrency, dealCurrency, rates);

  function fmt(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: dealCurrency || srcCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const showConversion = dealCurrency && dealCurrency !== srcCurrency && rates;

  return (
    <div className="bg-[#0F1C2E] border border-[#2A3B52] rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TransportIcon iconName={modeMeta.icon} className="text-[#FFD700] flex-shrink-0" />
          <span className="text-xs font-bold text-white">{modeMeta.label}</span>
        </div>
        {(quote.transitMin != null || quote.transitMax != null) && (
          <span className="text-[10px] text-[#8899AA] flex-shrink-0">
            {quote.transitMin != null && quote.transitMax != null && quote.transitMin !== quote.transitMax
              ? `${quote.transitMin}–${quote.transitMax} days`
              : `~${quote.transitMax ?? quote.transitMin} days`}
          </span>
        )}
      </div>
      <div className="mt-1.5">
        <span className="text-sm font-semibold text-[#FFD700]">
          {showConversion
            ? `${fmt(minConverted)} – ${fmt(maxConverted)}`
            : `${fmt(quote.minPrice)} – ${fmt(quote.maxPrice)}`}
        </span>
        {showConversion && (
          <span className="text-[10px] text-[#8899AA] ml-1.5">
            (est. in {dealCurrency})
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Offer').Offer|null} props.latestOffer
 */
export function FreightEstimatorWidget({ deal, latestOffer }) {
  const [expanded, setExpanded] = useState(true);

  // Auto-populate origin/destination from deal Incoterms namedPlace
  const snapshot = latestOffer || deal?.latestOfferSnapshot;
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState(() => snapshot?.namedPlace ?? '');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [widthDim, setWidthDim] = useState('');
  const [heightDim, setHeightDim] = useState('');

  const { estimate, loading, error, rateLimited, fetchEstimate, reset } = useFreightEstimate();
  const { rates } = useLiveCurrency();

  const dealCurrency = snapshot?.currency || 'USD';

  // Derived: volumetric + chargeable weight
  const numWeight = parseFloat(weight) || 0;
  const numLength = parseFloat(length) || null;
  const numWidth = parseFloat(widthDim) || null;
  const numHeight = parseFloat(heightDim) || null;

  const hasAllDimensions =
    numLength != null && numWidth != null && numHeight != null &&
    numLength > 0 && numWidth > 0 && numHeight > 0;

  const volumetricKg = hasAllDimensions
    ? (numLength * numWidth * numHeight) / 5000
    : null;

  const chargeableKg = hasAllDimensions
    ? getChargeableWeight(numWeight, numLength, numWidth, numHeight)
    : numWeight;

  const loadtype = chargeableKg > 0 ? suggestLoadType(chargeableKg) : null;

  // Disable "Get Estimate" until required fields are filled
  const canFetch =
    origin.trim().length > 0 &&
    destination.trim().length > 0 &&
    chargeableKg > 0;

  function handleFetch() {
    if (!canFetch || loading) return;
    reset();
    fetchEstimate({
      origin: origin.trim(),
      destination: destination.trim(),
      weight: chargeableKg,
      loadtype: loadtype || 'boxes',
      width: numWidth,
      height: numHeight,
      length: numLength,
    });
  }

  // Clear results when form fields change after a result was shown
  function handleFieldChange(setter) {
    return (e) => {
      setter(e.target.value);
      if (estimate || error) reset();
    };
  }

  const inputCls =
    'bg-[#0F1C2E] border border-[#2A3B52] text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:border-[#FFD700]/50 placeholder-[#4A5B6E]';

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Header with collapse toggle */}
      <button
        type="button"
        className="flex items-center justify-between w-full group"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <h4 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wide">
          Freight Estimate
        </h4>
        {expanded ? (
          <ChevronUp size={14} className="text-[#8899AA] group-hover:text-white transition-colors" />
        ) : (
          <ChevronDown size={14} className="text-[#8899AA] group-hover:text-white transition-colors" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2.5">
          {/* Origin */}
          <div>
            <label className="block text-[10px] text-[#8899AA] uppercase tracking-wide mb-1">
              Origin
            </label>
            <input
              type="text"
              value={origin}
              onChange={handleFieldChange(setOrigin)}
              placeholder="City, Country (e.g. Istanbul, Turkey)"
              className={inputCls}
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-[10px] text-[#8899AA] uppercase tracking-wide mb-1">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={handleFieldChange(setDestination)}
              placeholder="City, Country (e.g. Rotterdam, Netherlands)"
              className={inputCls}
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-[10px] text-[#8899AA] uppercase tracking-wide mb-1">
              Weight (kg)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={handleFieldChange(setWeight)}
                onFocus={e => e.target.select()}
                placeholder="0"
                className={`${inputCls} pr-8`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#4A5B6E]">
                kg
              </span>
            </div>
            {/* Load type badge */}
            {loadtype && chargeableKg > 0 && (
              <div className="mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-[#0F1C2E] border border-[#2A3B52] text-[#8899AA]">
                  {loadtype}
                </span>
              </div>
            )}
          </div>

          {/* Dimensions (optional) */}
          <div>
            <label className="block text-[10px] text-[#8899AA] uppercase tracking-wide mb-1">
              Dimensions (cm, optional)
            </label>
            <div className="flex gap-1.5">
              {[
                { value: length, setter: setLength, placeholder: 'L' },
                { value: widthDim, setter: setWidthDim, placeholder: 'W' },
                { value: heightDim, setter: setHeightDim, placeholder: 'H' },
              ].map(({ value, setter, placeholder }) => (
                <input
                  key={placeholder}
                  type="number"
                  min="0"
                  step="1"
                  value={value}
                  onChange={handleFieldChange(setter)}
                  onFocus={e => e.target.select()}
                  placeholder={placeholder}
                  className="bg-[#0F1C2E] border border-[#2A3B52] text-white text-xs rounded px-2 py-1.5 w-full text-center focus:outline-none focus:border-[#FFD700]/50 placeholder-[#4A5B6E]"
                />
              ))}
            </div>
            {/* Volumetric weight display */}
            {hasAllDimensions && numWeight > 0 && (
              <p className="text-[10px] text-[#8899AA] mt-1">
                Volumetric: {volumetricKg?.toFixed(1)}kg&nbsp;
                (chargeable: <span className="text-white">{chargeableKg.toFixed(1)}kg</span>)
              </p>
            )}
          </div>

          {/* Get Estimate button */}
          <button
            type="button"
            onClick={handleFetch}
            disabled={!canFetch || loading}
            className="w-full bg-[#FFD700] text-black font-semibold text-xs px-4 py-2 rounded-lg
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:bg-[#FFE033] active:bg-[#E6C200] transition-colors
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Fetching…
              </>
            ) : (
              'Get Estimate'
            )}
          </button>

          {/* Loading skeleton */}
          {loading && <SkeletonCards />}

          {/* Rate limited */}
          {rateLimited && (
            <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
              Estimate limit reached. Try again in a few minutes.
            </p>
          )}

          {/* Error (non-rate-limited) */}
          {error && !rateLimited && (
            <div className="flex items-center justify-between gap-2 bg-orange-900/20 border border-orange-700/30 rounded-lg px-3 py-2">
              <p className="text-xs text-orange-300">{error}</p>
              <button
                type="button"
                onClick={handleFetch}
                className="text-[10px] text-orange-400 border border-orange-700/50 rounded px-2 py-0.5 hover:bg-orange-900/40 flex-shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Results */}
          {estimate && !loading && estimate.quotes.length > 0 && (
            <div className="mt-1">
              {estimate.quotes.map((quote, idx) => (
                <ModeCard
                  key={`${quote.mode}-${idx}`}
                  quote={quote}
                  dealCurrency={dealCurrency}
                  rates={rates}
                />
              ))}

              {/* Freightos attribution — required by ToS */}
              <p className="text-[10px] text-[#8899AA] mt-2">
                Powered by{' '}
                <a
                  href="https://www.freightos.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white transition-colors"
                >
                  Freightos
                </a>
                . Estimates only — actual rates may vary.
              </p>
            </div>
          )}

          {/* No results state */}
          {estimate && !loading && estimate.quotes.length === 0 && (
            <p className="text-xs text-[#8899AA] text-center py-2">
              No estimates available for this route.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default FreightEstimatorWidget;
