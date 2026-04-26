/**
 * InsuranceQuoteCard Component
 *
 * Displays a single insurance provider quote card in the buyer comparison view.
 * Shows ICC coverage type, premium, coverage details, validity countdown.
 * Green accent border-left per CONTEXT.md color coding.
 *
 * Features:
 * - Ribbon badges: "Cheapest", "Best Value" for qualifying cards
 * - Validity countdown via CountdownTimer
 * - "Expired" badge when quote.isExpired()
 * - Select button for buyer on active non-expired quotes
 * - Selected state: green border + "Selected" badge, no select button
 * - Firm/Indicative status badge (Phase 14)
 * - Expandable section for Commercial Risk, Political Risk, Exclusions,
 *   Claims Handling, Premium Additions, and Message to Buyer (Phase 14)
 */

'use client';

import { useState } from 'react';
import { Shield, CheckCircle2, XCircle, Award, ChevronDown } from 'lucide-react';
import { CountdownTimer } from '@/presentation/components/features/deal/CountdownTimer/CountdownTimer';
import {
  ICC_COVERAGE,
  COVERAGE_SCOPE,
  POLITICAL_PERILS,
  COMMERCIAL_COVERAGE_BASIS,
  STANDARD_EXCLUSIONS,
  STANDARD_CONDITIONS_PRECEDENT,
  CLAIMS_JURISDICTION,
  CLAIMS_RESPONSE_TIME,
  PREMIUM_PAYMENT_TERMS,
} from '@/core/constants/quoteConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getIccLabel(iccValue) {
  if (!iccValue) return '—';
  const coverage = ICC_COVERAGE[iccValue];
  return coverage ? coverage.label : `ICC ${iccValue}`;
}

function getCoverageScopeLabel(scopeValue) {
  if (!scopeValue) return '—';
  const scope = COVERAGE_SCOPE.find((s) => s.value === scopeValue);
  return scope ? scope.label : scopeValue;
}

function lookupLabel(options, value) {
  if (!value) return '—';
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}

function lookupLabels(options, values) {
  if (!values || !Array.isArray(values) || values.length === 0) return '—';
  return values
    .map((v) => {
      const found = options.find((o) => o.value === v);
      return found ? found.label : v;
    })
    .join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Ribbon Badge
// ─────────────────────────────────────────────────────────────────────────────

function RibbonBadge({ ribbon }) {
  if (!ribbon) return null;

  const colors = {
    Cheapest: 'bg-emerald-500 text-white',
    'Best Value': 'bg-amber-500 text-white',
  };

  const colorClass = colors[ribbon] || 'bg-blue-500 text-white';

  return (
    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${colorClass}`}>
      <Award size={10} />
      {ribbon}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Row
// ─────────────────────────────────────────────────────────────────────────────

function DetailRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#1A283B] last:border-0">
      <span className="text-xs text-[#8899AA]">{label}</span>
      <span className={`text-xs font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InsuranceQuoteCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InsuranceQuoteCard
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Quote').Quote} props.quote - Quote entity
 * @param {boolean} props.isBuyer - Whether the current user is the buyer
 * @param {boolean} props.isSelected - Whether this quote is currently selected
 * @param {Function} props.onSelect - Callback: onSelect(quoteRequestId, quoteId)
 * @param {string|null} props.ribbon - Ribbon label: "Cheapest" | "Best Value" | null
 */
export function InsuranceQuoteCard({ quote, isBuyer, isSelected, onSelect, ribbon }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!quote) return null;

  const isExpired = quote.isExpired();
  const isActive = quote.isActive();

  const canSelect = isBuyer && isActive && !isSelected;

  // Determine if this quote has any Phase 14 extended data
  const hasExtendedData =
    quote.hasCommercialRisk?.() ||
    quote.hasPoliticalRisk?.() ||
    quote.exclusions ||
    quote.claimsHandling ||
    quote.premiumAdditions ||
    quote.messageToBuyer;

  // Border styling: selected = green thick border, default = green left accent
  const borderClass = isSelected
    ? 'border-2 border-emerald-500'
    : isExpired
    ? 'border border-[#2A3B52] opacity-60'
    : 'border border-[#2A3B52] border-l-4 border-l-emerald-500/70';

  return (
    <div
      className={`relative bg-[#1A283B] rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 ${borderClass}`}
    >
      {/* Ribbon badge */}
      <RibbonBadge ribbon={ribbon} />

      {/* Header: provider info + selected/expired/firm/indicative badges */}
      <div className="flex items-start gap-3 pr-20">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-900/40 border border-emerald-800/50 flex items-center justify-center">
          <Shield size={16} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">
              Insurance Provider
            </p>
            {isSelected && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} />
                Selected
              </span>
            )}
            {isExpired && !isSelected && (
              <span className="text-xs font-semibold bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 rounded-full">
                Expired
              </span>
            )}
            {/* Firm / Indicative badge */}
            {quote.isFirmQuote?.() && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Firm Quote
              </span>
            )}
            {quote.isIndicativeQuote?.() && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Subject to Review
              </span>
            )}
          </div>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {getIccLabel(quote.iccCoverage)}
          </p>
        </div>
      </div>

      {/* Premium (prominent) */}
      <div className="bg-[#0F1C2E] rounded-lg px-3 py-2">
        <p className="text-xs text-[#8899AA]">Premium</p>
        <p className="text-lg font-bold text-emerald-400">
          {formatCurrency(quote.premiumAmount, quote.currency)}
        </p>
      </div>

      {/* Details */}
      <div>
        <DetailRow
          label="Coverage Amount"
          value={formatCurrency(quote.coverageAmount, quote.currency)}
        />
        <DetailRow
          label="Deductible"
          value={quote.deductiblePct != null ? `${quote.deductiblePct}%` : '—'}
        />
        {(quote.cargoMarine?.lossCoveredPct != null || quote.cargoMarine?.lossCoveredPct === 0) && (
          <DetailRow
            label="Loss Covered"
            value={`${quote.cargoMarine.lossCoveredPct}%`}
          />
        )}
        <DetailRow
          label="Coverage Scope"
          value={getCoverageScopeLabel(quote.coverageScope)}
        />
        <DetailRow
          label="Claims Payment"
          value={quote.claimsPaymentDays != null ? `${quote.claimsPaymentDays} business days` : '—'}
        />
        <DetailRow
          label="War Clause"
          value={
            <span className="flex items-center gap-1">
              {quote.warClause ? (
                <><CheckCircle2 size={12} className="text-emerald-400" /><span className="text-emerald-400">Included</span></>
              ) : (
                <><XCircle size={12} className="text-red-400" /><span className="text-red-400">Not included</span></>
              )}
            </span>
          }
        />
        <DetailRow
          label="Strikes Clause"
          value={
            <span className="flex items-center gap-1">
              {quote.strikesClause ? (
                <><CheckCircle2 size={12} className="text-emerald-400" /><span className="text-emerald-400">Included</span></>
              ) : (
                <><XCircle size={12} className="text-red-400" /><span className="text-red-400">Not included</span></>
              )}
            </span>
          }
        />
        {(quote.policyStartDate || quote.policyEndDate) && (
          <DetailRow
            label="Policy Period"
            value={`${formatDate(quote.policyStartDate)} – ${formatDate(quote.policyEndDate)}`}
          />
        )}
        {quote.notes && (
          <div className="mt-2">
            <p className="text-xs text-[#8899AA] mb-1">Notes</p>
            <p className="text-xs text-[#AAB8C8] leading-relaxed">{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Expandable toggle — only shown when extended data exists */}
      {hasExtendedData && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#8899AA] hover:text-white transition-colors"
        >
          {isExpanded ? 'Hide Details' : 'View Full Coverage Details'}
          <ChevronDown
            size={14}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Expandable content — within-card expansion, no layout shift on siblings */}
      {isExpanded && (
        <div className="border-t border-[#1E2D3D] pt-3 space-y-3">
          {/* Commercial Risk */}
          {quote.commercialRisk && (
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1.5">Commercial Risk</p>
              <DetailRow
                label="Coverage Limit"
                value={formatCurrency(quote.commercialRisk.coverageLimit, quote.commercialRisk.currency)}
              />
              <DetailRow
                label="Loss Covered"
                value={quote.commercialRisk.lossCoveredPct != null ? `${quote.commercialRisk.lossCoveredPct}%` : '—'}
              />
              <DetailRow
                label="Coverage Basis"
                value={lookupLabel(COMMERCIAL_COVERAGE_BASIS, quote.commercialRisk.coverageBasis)}
              />
              <DetailRow
                label="Waiting Period"
                value={quote.commercialRisk.waitingPeriodDays ? `${quote.commercialRisk.waitingPeriodDays} days` : '—'}
              />
            </div>
          )}

          {/* Political Risk */}
          {quote.politicalRisk && (
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1.5">Political Risk</p>
              <DetailRow
                label="Coverage Limit"
                value={formatCurrency(quote.politicalRisk.coverageLimit, quote.politicalRisk.currency)}
              />
              <DetailRow
                label="Loss Covered"
                value={quote.politicalRisk.lossCoveredPct != null ? `${quote.politicalRisk.lossCoveredPct}%` : '—'}
              />
              <DetailRow
                label="Perils Covered"
                value={lookupLabels(POLITICAL_PERILS, quote.politicalRisk.perils)}
              />
            </div>
          )}

          {/* Exclusions */}
          {quote.exclusions &&
            (quote.exclusions.standardItems?.length > 0 || quote.exclusions.customText) && (
              <div>
                <p className="text-xs font-semibold text-[#8899AA] mb-1.5">Exclusions</p>
                {quote.exclusions.standardItems?.map((item) => (
                  <p key={item} className="text-xs text-[#AAB8C8]">
                    - {lookupLabel(STANDARD_EXCLUSIONS, item)}
                  </p>
                ))}
                {quote.exclusions.customText && (
                  <p className="text-xs text-[#AAB8C8] mt-1 italic">{quote.exclusions.customText}</p>
                )}
              </div>
            )}

          {/* Claims Handling */}
          {quote.claimsHandling && (
            <div>
              <p className="text-xs font-semibold text-[#8899AA] mb-1.5">Claims Handling</p>
              <DetailRow
                label="Jurisdiction"
                value={lookupLabel(CLAIMS_JURISDICTION, quote.claimsHandling.jurisdiction)}
              />
              <DetailRow
                label="Response Time"
                value={lookupLabel(CLAIMS_RESPONSE_TIME, quote.claimsHandling.responseTime)}
              />
              {quote.claimsHandling.contactEmail && (
                <DetailRow label="Contact" value={quote.claimsHandling.contactEmail} />
              )}
            </div>
          )}

          {/* Premium Additions */}
          {quote.premiumAdditions &&
            (quote.premiumAdditions.ratePercent || quote.premiumAdditions.paymentTerms) && (
              <div>
                <p className="text-xs font-semibold text-[#8899AA] mb-1.5">Premium Additions</p>
                {quote.premiumAdditions.ratePercent != null && (
                  <DetailRow label="Premium Rate" value={`${quote.premiumAdditions.ratePercent}%`} />
                )}
                {quote.premiumAdditions.paymentTerms && (
                  <DetailRow
                    label="Payment Terms"
                    value={lookupLabel(PREMIUM_PAYMENT_TERMS, quote.premiumAdditions.paymentTerms)}
                  />
                )}
              </div>
            )}

          {/* Message to Buyer */}
          {quote.messageToBuyer && (
            <div>
              <p className="text-xs font-semibold text-[#8899AA] mb-1">Message from Provider</p>
              <p className="text-xs text-[#AAB8C8] leading-relaxed">{quote.messageToBuyer}</p>
            </div>
          )}
        </div>
      )}

      {/* Validity countdown */}
      {quote.validUntil && !isExpired && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8899AA]">Valid for</span>
          <CountdownTimer expiresAt={quote.validUntil} />
        </div>
      )}

      {/* Action: select button (buyer only, active non-selected quotes) */}
      {canSelect && (
        <button
          onClick={() => onSelect?.(quote.requestId, quote.id)}
          className="w-full mt-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Select Provider
        </button>
      )}
    </div>
  );
}

export default InsuranceQuoteCard;
