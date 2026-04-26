/**
 * QuoteSummaryModal
 *
 * Pre-submit confirmation modal showing a structured summary of all filled sections.
 * Only non-empty sections are shown.
 *
 * Props:
 *   isOpen              - boolean
 *   onClose             - () => void
 *   onConfirm           - () => void
 *   watchedValues       - object (from parent's watch())
 *   isLoading           - boolean
 *   commercialRiskEnabled - boolean
 *   politicalRiskEnabled  - boolean
 */

'use client';

import { X, Loader2 } from 'lucide-react';
import {
  ICC_COVERAGE,
  COVERAGE_SCOPE,
  STANDARD_EXCLUSIONS,
  STANDARD_CONDITIONS_PRECEDENT,
  CLAIMS_JURISDICTION,
  CLAIMS_RESPONSE_TIME,
  PREMIUM_PAYMENT_TERMS,
  QUOTE_BINDING_STATUS,
  POLITICAL_PERILS,
  COMMERCIAL_COVERAGE_BASIS,
  QUOTE_VALIDITY_OPTIONS,
} from '@/core/constants/quoteConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Look up label from an array of { value, label } objects */
function getLabel(arr, value) {
  if (!value) return '—';
  const found = arr.find((item) => item.value === value);
  return found ? found.label : value;
}

/** Format a numeric amount with currency code */
function formatCurrency(amount, currency) {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  return `${currency || ''} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

/** Format percent value */
function formatPct(value) {
  if (value == null || value === '') return '—';
  return `${value}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** A summary section block */
function SummarySection({ title, children }) {
  return (
    <div className="mb-5">
      <h5 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 pb-1 border-b border-[#2A3B52]">
        {title}
      </h5>
      {children}
    </div>
  );
}

/** A key-value row */
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-xs text-[#8899AA] shrink-0">{label}</span>
      <span className="text-xs text-white text-right">{value || '—'}</span>
    </div>
  );
}

/** A 2-column grid of key-value rows */
function RowGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-x-4">
      {items.map(({ label, value }) => (
        <Row key={label} label={label} value={value} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuoteSummaryModal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuoteSummaryModal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onConfirm
 * @param {Object} props.watchedValues
 * @param {boolean} props.isLoading
 * @param {boolean} props.commercialRiskEnabled
 * @param {boolean} props.politicalRiskEnabled
 */
export function QuoteSummaryModal({
  isOpen,
  onClose,
  onConfirm,
  watchedValues = {},
  isLoading = false,
  commercialRiskEnabled = false,
  politicalRiskEnabled = false,
}) {
  if (!isOpen) return null;

  const cm = watchedValues;
  const cargo = cm.cargoMarine || cm; // handle both nested and flat form values
  const exclusions = cm.exclusions || {};
  const conditions = cm.conditionsPrecedent || {};
  const claims = cm.claimsHandling || {};
  const premium = cm.premiumAdditions || {};
  const status = cm.quoteStatus || {};
  const commercialRisk = cm.commercialRisk || {};
  const politicalRisk = cm.politicalRisk || {};

  // ── Exclusions ──
  const selectedExclusions = exclusions.standardItems || [];
  const exclusionLabels = STANDARD_EXCLUSIONS
    .filter((e) => selectedExclusions.includes(e.value))
    .map((e) => e.label);
  const hasExclusions = exclusionLabels.length > 0 || !!exclusions.customText;

  // ── Conditions Precedent ──
  const selectedConditions = conditions.standardItems || [];
  const conditionLabels = STANDARD_CONDITIONS_PRECEDENT
    .filter((c) => selectedConditions.includes(c.value))
    .map((c) => c.label);
  const hasConditions = conditionLabels.length > 0 || !!conditions.customText;

  // ── Claims Handling ──
  const hasClaimsHandling = !!claims.jurisdiction;

  // ── Premium Additions ──
  const hasPremiumAdditions = (claims.ratePercent != null && claims.ratePercent !== '') || !!premium.paymentTerms;

  // ── ICC Coverage display ──
  const iccObj = ICC_COVERAGE[cargo.iccCoverage];
  const iccLabel = iccObj ? iccObj.label : cargo.iccCoverage || '—';

  // ── Validity label ──
  const validityLabel = getLabel(
    QUOTE_VALIDITY_OPTIONS.map((o) => ({ value: String(o.value), label: o.label })),
    String(cargo.validityHours || cm.validityHours)
  );

  // ── Political perils labels ──
  const selectedPerils = politicalRisk.perils || [];
  const perilLabels = POLITICAL_PERILS
    .filter((p) => selectedPerils.includes(p.value))
    .map((p) => p.label)
    .join(', ');

  // ── Quote status display ──
  const isFirm = status.status === QUOTE_BINDING_STATUS.FIRM;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-[#0D1822] rounded-xl border border-[#2A3B52] flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3B52] shrink-0">
          <h3 className="text-base font-semibold text-white">Review Quote Summary</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8899AA] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* 1. Cargo / Marine Insurance — always shown */}
          <SummarySection title="Cargo / Marine Insurance">
            <RowGrid
              items={[
                { label: 'ICC Coverage', value: iccLabel },
                { label: 'Premium', value: formatCurrency(cargo.premiumAmount || cm.premiumAmount, cm.currency) },
                { label: 'Coverage Amount', value: formatCurrency(cargo.coverageAmount || cm.coverageAmount, cm.currency) },
                { label: 'Deductible', value: formatPct(cargo.deductiblePct ?? cm.deductiblePct) },
                { label: 'Claims Payment', value: (cargo.claimsPaymentDays || cm.claimsPaymentDays) ? `${cargo.claimsPaymentDays || cm.claimsPaymentDays} days` : '—' },
                { label: 'Coverage Scope', value: getLabel(COVERAGE_SCOPE, cargo.coverageScope || cm.coverageScope) },
                { label: 'Policy Start', value: cargo.policyStartDate || cm.policyStartDate || '—' },
                { label: 'Policy End', value: cargo.policyEndDate || cm.policyEndDate || '—' },
              ]}
            />
            {(cargo.warClause || cm.warClause || cargo.strikesClause || cm.strikesClause) && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {(cargo.warClause || cm.warClause) && (
                  <span className="text-xs bg-[#1A283B] border border-[#2A3B52] px-2 py-0.5 rounded text-white">
                    War Clause
                  </span>
                )}
                {(cargo.strikesClause || cm.strikesClause) && (
                  <span className="text-xs bg-[#1A283B] border border-[#2A3B52] px-2 py-0.5 rounded text-white">
                    Strikes Clause
                  </span>
                )}
              </div>
            )}
          </SummarySection>

          {/* 2. Commercial Risk — only if enabled and data present */}
          {commercialRiskEnabled && commercialRisk && Object.keys(commercialRisk).length > 0 && (
            <SummarySection title="Commercial Risk">
              <RowGrid
                items={[
                  { label: 'Coverage Limit', value: formatCurrency(commercialRisk.coverageLimit, commercialRisk.currency) },
                  { label: 'Currency', value: commercialRisk.currency || '—' },
                  { label: 'Loss %', value: formatPct(commercialRisk.lossPct) },
                  { label: 'Coverage Basis', value: getLabel(COMMERCIAL_COVERAGE_BASIS, commercialRisk.coverageBasis) },
                  { label: 'Waiting Period', value: commercialRisk.waitingPeriod ? `${commercialRisk.waitingPeriod} days` : '—' },
                ]}
              />
            </SummarySection>
          )}

          {/* 3. Political Risk — only if enabled and data present */}
          {politicalRiskEnabled && politicalRisk && Object.keys(politicalRisk).length > 0 && (
            <SummarySection title="Political Risk">
              <RowGrid
                items={[
                  { label: 'Coverage Limit', value: formatCurrency(politicalRisk.coverageLimit, politicalRisk.currency) },
                  { label: 'Currency', value: politicalRisk.currency || '—' },
                  { label: 'Loss %', value: formatPct(politicalRisk.lossPct) },
                ]}
              />
              {perilLabels && (
                <div className="mt-1">
                  <Row label="Selected Perils" value={perilLabels} />
                </div>
              )}
            </SummarySection>
          )}

          {/* 4. Exclusions — only if any */}
          {hasExclusions && (
            <SummarySection title="Exclusions">
              {exclusionLabels.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {exclusionLabels.map((label) => (
                    <li key={label} className="text-xs text-white flex items-start gap-1.5">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {label}
                    </li>
                  ))}
                </ul>
              )}
              {exclusions.customText && (
                <div className="mt-1">
                  <span className="text-xs text-[#8899AA]">Additional: </span>
                  <span className="text-xs text-white">{exclusions.customText}</span>
                </div>
              )}
            </SummarySection>
          )}

          {/* 5. Conditions Precedent — only if any */}
          {hasConditions && (
            <SummarySection title="Conditions Precedent">
              {conditionLabels.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {conditionLabels.map((label) => (
                    <li key={label} className="text-xs text-white flex items-start gap-1.5">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {label}
                    </li>
                  ))}
                </ul>
              )}
              {conditions.customText && (
                <div className="mt-1">
                  <span className="text-xs text-[#8899AA]">Additional: </span>
                  <span className="text-xs text-white">{conditions.customText}</span>
                </div>
              )}
            </SummarySection>
          )}

          {/* 6. Claims Handling — only if jurisdiction set */}
          {hasClaimsHandling && (
            <SummarySection title="Claims Handling">
              <RowGrid
                items={[
                  { label: 'Jurisdiction', value: getLabel(CLAIMS_JURISDICTION, claims.jurisdiction) },
                  { label: 'Response Time', value: getLabel(CLAIMS_RESPONSE_TIME, claims.responseTime) },
                  { label: 'Contact Email', value: claims.contactEmail || '—' },
                ]}
              />
            </SummarySection>
          )}

          {/* 7. Premium Additions — only if rate or terms set */}
          {hasPremiumAdditions && (
            <SummarySection title="Premium Additions">
              <RowGrid
                items={[
                  { label: 'Rate', value: premium.ratePercent != null && premium.ratePercent !== '' ? `${premium.ratePercent}%` : '—' },
                  { label: 'Payment Terms', value: getLabel(PREMIUM_PAYMENT_TERMS, premium.paymentTerms) },
                ]}
              />
            </SummarySection>
          )}

          {/* 8. Quote Status — always shown */}
          <SummarySection title="Quote Status">
            <Row
              label="Status"
              value={
                <span className={isFirm ? 'text-green-400' : 'text-amber-400'}>
                  {isFirm ? 'Firm' : 'Indicative'}
                </span>
              }
            />
            {isFirm && status.bindingConditions && (
              <Row label="Binding Conditions" value={status.bindingConditions} />
            )}
            {status.messageToBuyer && (
              <Row label="Message to Buyer" value={status.messageToBuyer} />
            )}
          </SummarySection>

          {/* 9. Quote Validity + Currency — always shown */}
          <SummarySection title="Quote Details">
            <RowGrid
              items={[
                { label: 'Validity', value: validityLabel },
                { label: 'Currency', value: cm.currency || '—' },
              ]}
            />
          </SummarySection>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A3B52] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-[#8899AA] hover:text-white border border-[#2A3B52] rounded-lg transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm & Submit'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

export default QuoteSummaryModal;
