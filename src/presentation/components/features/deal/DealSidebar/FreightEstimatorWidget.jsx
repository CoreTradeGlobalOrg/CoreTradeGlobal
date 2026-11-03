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
import { NamedPlaceInput } from '@/presentation/components/features/deal/NamedPlaceInput/NamedPlaceInput';
import {
  TRANSPORT_MODES,
  getChargeableWeight,
  suggestLoadType,
} from '@/core/constants/freightConstants';

// ── Sizes ─────────────────────────────────────────────────────────────────────
// The deal sidebar keeps the compact widget; the /freight-estimator page
// (standalone) uses the full-size form, matching the site's other forms.

const COMPACT = {
  label: 'block text-[10px] text-[#8899AA] uppercase tracking-wide mb-1',
  input: 'bg-[#0F1C2E] border border-[#2A3B52] text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:border-[#FFD700]/50 placeholder-[#4A5B6E]',
  unit: 'right-2 text-[10px]',
  badge: 'px-1.5 py-0.5 text-[9px]',
  note: 'text-[10px]',
  place: 'compact',
  button: 'text-xs px-4 py-2 rounded-lg',
  spinner: 'w-3 h-3',
  message: 'text-xs px-3 py-2',
};

const LARGE = {
  label: 'block text-xs font-semibold text-[#8899AA] uppercase tracking-wide mb-2',
  input: 'bg-[#0A1628] border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-xl px-4 py-3 w-full focus:outline-none focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20 transition-all placeholder:text-[#4a5568]',
  unit: 'right-4 text-xs',
  badge: 'px-2 py-0.5 text-xs',
  note: 'text-xs',
  place: 'default',
  button: 'text-base px-6 py-3.5 rounded-xl',
  spinner: 'w-4 h-4',
  message: 'text-sm px-4 py-3',
};

// ── Icon resolver ─────────────────────────────────────────────────────────────

const ICON_MAP = { Ship, Plane, Truck };

function TransportIcon({ iconName, className, size = 16 }) {
  const Icon = ICON_MAP[iconName] ?? Ship;
  return <Icon size={size} className={className} />;
}

// ── Skeleton loading cards ────────────────────────────────────────────────────

function SkeletonCards({ large = false }) {
  return (
    <div className={large ? 'grid gap-3 md:grid-cols-3 mt-2' : 'space-y-2 mt-3'}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`bg-[#0F1C2E] border border-[#2A3B52] animate-pulse ${large ? 'rounded-xl p-5 h-[104px]' : 'rounded-lg p-3'}`}
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

function ModeCard({ quote, dealCurrency, rates, large = false }) {
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
    <div className={`bg-[#0F1C2E] border border-[#2A3B52] ${large ? 'rounded-xl p-5' : 'rounded-lg p-3 mb-2'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TransportIcon iconName={modeMeta.icon} size={large ? 22 : 16} className="text-[#FFD700] flex-shrink-0" />
          <span className={`${large ? 'text-base' : 'text-xs'} font-bold text-white`}>{modeMeta.label}</span>
        </div>
        {(quote.transitMin != null || quote.transitMax != null) && (
          <span className={`${large ? 'text-sm' : 'text-[10px]'} text-[#8899AA] flex-shrink-0`}>
            {quote.transitMin != null && quote.transitMax != null && quote.transitMin !== quote.transitMax
              ? `${quote.transitMin}–${quote.transitMax} days`
              : `~${quote.transitMax ?? quote.transitMin} days`}
          </span>
        )}
      </div>
      <div className={large ? 'mt-3' : 'mt-1.5'}>
        <span className={`${large ? 'text-xl font-bold' : 'text-sm font-semibold'} text-[#FFD700]`}>
          {showConversion
            ? `${fmt(minConverted)} – ${fmt(maxConverted)}`
            : `${fmt(quote.minPrice)} – ${fmt(quote.maxPrice)}`}
        </span>
        {showConversion && (
          <span className={`${large ? 'text-xs block mt-1' : 'text-[10px] ml-1.5'} text-[#8899AA]`}>
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
 * @param {import('@/domain/entities/Deal').Deal} [props.deal] - Optional; prefills destination/currency in a deal context.
 * @param {import('@/domain/entities/Offer').Offer|null} [props.latestOffer]
 * @param {boolean} [props.standalone] - When true, renders without the collapsible header (for the dedicated page).
 */
export function FreightEstimatorWidget({ deal, latestOffer, standalone = false }) {
  const [expanded, setExpanded] = useState(true);
  const isOpen = standalone || expanded;

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

  // NamedPlaceInput emits the value directly (not an event)
  function handleLocationChange(setter) {
    return (val) => {
      setter(val);
      if (estimate || error) reset();
    };
  }

  const ui = standalone ? LARGE : COMPACT;

  return (
    <div className={`bg-[#1A283B] border border-[#2A3B52] ${standalone ? 'rounded-2xl p-5 md:p-8' : 'rounded-xl p-4'}`}>
      {/* Header with collapse toggle — hidden in standalone mode */}
      {!standalone && (
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
      )}

      {isOpen && (
        <div className={standalone ? 'space-y-5' : 'mt-3 space-y-2.5'}>
          <div className={standalone ? 'grid gap-5 md:grid-cols-2' : 'space-y-2.5'}>
          {/* Origin */}
          <div>
            <label className={ui.label}>
              Origin
            </label>
            <NamedPlaceInput
              size={ui.place}
              value={origin}
              onChange={handleLocationChange(setOrigin)}
              ariaLabel="Origin"
              placeholder="City or port (e.g. Istanbul, Turkey)"
            />
          </div>

          {/* Destination */}
          <div>
            <label className={ui.label}>
              Destination
            </label>
            <NamedPlaceInput
              size={ui.place}
              value={destination}
              onChange={handleLocationChange(setDestination)}
              ariaLabel="Destination"
              placeholder="City or port (e.g. Rotterdam, Netherlands)"
            />
          </div>
          </div>

          <div className={standalone ? 'grid gap-5 md:grid-cols-2' : 'space-y-2.5'}>
          {/* Weight */}
          <div>
            <label className={ui.label}>
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
                className={`${ui.input} ${standalone ? 'pr-12' : 'pr-8'}`}
              />
              <span className={`absolute ${ui.unit} top-1/2 -translate-y-1/2 text-[#4A5B6E]`}>
                kg
              </span>
            </div>
            {/* Load type badge */}
            {loadtype && chargeableKg > 0 && (
              <div className={standalone ? 'mt-2' : 'mt-1'}>
                <span className={`inline-flex items-center ${ui.badge} rounded bg-[#0F1C2E] border border-[#2A3B52] text-[#8899AA]`}>
                  {loadtype}
                </span>
              </div>
            )}
          </div>

          {/* Dimensions (optional) */}
          <div>
            <label className={ui.label}>
              Dimensions (cm, optional)
            </label>
            <div className={`flex ${standalone ? 'gap-3' : 'gap-1.5'}`}>
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
                  className={`${ui.input} text-center`}
                />
              ))}
            </div>
            {/* Volumetric weight display */}
            {hasAllDimensions && numWeight > 0 && (
              <p className={`${ui.note} text-[#8899AA] ${standalone ? 'mt-2' : 'mt-1'}`}>
                Volumetric: {volumetricKg?.toFixed(1)}kg&nbsp;
                (chargeable: <span className="text-white">{chargeableKg.toFixed(1)}kg</span>)
              </p>
            )}
          </div>
          </div>

          {/* Get Estimate button */}
          <button
            type="button"
            onClick={handleFetch}
            disabled={!canFetch || loading}
            className={`w-full bg-[#FFD700] text-black font-semibold ${ui.button}
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:bg-[#FFE033] active:bg-[#E6C200] transition-colors
              flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <svg className={`animate-spin ${ui.spinner}`} viewBox="0 0 24 24" fill="none">
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
          {loading && <SkeletonCards large={standalone} />}

          {/* Rate limited */}
          {rateLimited && (
            <p className={`${ui.message} text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg`}>
              Estimate limit reached. Try again in a few minutes.
            </p>
          )}

          {/* Error (non-rate-limited) */}
          {error && !rateLimited && (
            <div className={`flex items-center justify-between gap-2 bg-orange-900/20 border border-orange-700/30 rounded-lg ${ui.message}`}>
              <p className="text-orange-300">{error}</p>
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
              <div className={standalone ? 'grid gap-3 md:grid-cols-3' : undefined}>
                {estimate.quotes.map((quote, idx) => (
                  <ModeCard
                    key={`${quote.mode}-${idx}`}
                    quote={quote}
                    dealCurrency={dealCurrency}
                    rates={rates}
                    large={standalone}
                  />
                ))}
              </div>

              {/* Freightos attribution — required by ToS */}
              <p className={`${ui.note} text-[#8899AA] ${standalone ? 'mt-4' : 'mt-2'}`}>
                Powered by{' '}
                <a
                  href="https://www.freightos.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white transition-colors"
                >
                  Freightos
                </a>
                . Estimates only. Actual rates may vary.
              </p>
            </div>
          )}

          {/* No results state */}
          {estimate && !loading && estimate.quotes.length === 0 && (
            <p className={`${standalone ? 'text-sm' : 'text-xs'} text-[#8899AA] text-center py-2`}>
              No estimates available for this route.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default FreightEstimatorWidget;
