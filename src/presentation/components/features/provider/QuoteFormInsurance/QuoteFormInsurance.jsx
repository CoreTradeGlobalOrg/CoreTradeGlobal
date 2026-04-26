/**
 * QuoteFormInsurance Component
 *
 * Accordion-based insurance quote orchestrator with three risk type sections:
 *   - Cargo/Marine (required, always expanded)
 *   - Commercial Risk (optional, checkbox toggle)
 *   - Political Risk (optional, checkbox toggle)
 *
 * Owns a single useForm instance shared across all section sub-components.
 * Uses framer-motion for accordion expand/collapse animations.
 * Supports edit mode: pre-fills from both old flat-field and new nested quote formats.
 */

'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, RefreshCw, Shield, AlertTriangle, ChevronDown } from 'lucide-react';
import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';
import {
  ICC_COVERAGE,
  COVERAGE_SCOPE,
  QUOTE_VALIDITY_OPTIONS,
} from '@/core/constants/quoteConstants';
import { CURRENCIES } from '@/core/constants/currencies';
import { CargoMarineSection } from './sections/CargoMarineSection';
import { CommercialRiskSection } from './sections/CommercialRiskSection';
import { PoliticalRiskSection } from './sections/PoliticalRiskSection';
import { ExclusionsSection } from './sections/ExclusionsSection';
import { ConditionsPrecedentSection } from './sections/ConditionsPrecedentSection';
import { ClaimsHandlingSection } from './sections/ClaimsHandlingSection';
import { PremiumAdditionsSection } from './sections/PremiumAdditionsSection';
import { QuoteStatusSection } from './sections/QuoteStatusSection';
import { QuoteSummaryModal } from './QuoteSummaryModal';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ─────────────────────────────────────────────────────────────────────────────
// Zod Validation Schema (nested, Phase 14 format)
// ─────────────────────────────────────────────────────────────────────────────

const insuranceQuoteSchema = z.object({
  cargoMarine: z.object({
    iccCoverage: z.enum(['A', 'B', 'C'], { required_error: 'ICC coverage type is required' }),
    warClause: z.boolean().default(false),
    strikesClause: z.boolean().default(false),
    premiumAmount: z
      .number({ required_error: 'Required', invalid_type_error: 'Must be a number' })
      .positive('Must be > 0'),
    coverageAmount: z
      .number({ required_error: 'Required', invalid_type_error: 'Must be a number' })
      .positive('Must be > 0'),
    lossCoveredPct: z
      .number({ invalid_type_error: 'Must be a number' })
      .min(70, 'Min 70%')
      .max(110, 'Max 110%')
      .default(100),
    deductiblePct: z
      .number({ invalid_type_error: 'Must be a number' })
      .min(0)
      .max(100)
      .default(0),
    claimsPaymentDays: z
      .number({ required_error: 'Required', invalid_type_error: 'Must be a number' })
      .int()
      .positive(),
    policyStartDate: z.string().min(1, 'Start date is required'),
    policyEndDate: z.string().min(1, 'End date is required'),
    coverageScope: z.string().min(1, 'Required'),
    certificateType: z.string().optional(),
  }).refine(
    (data) => {
      if (data.policyStartDate && data.policyEndDate) {
        return new Date(data.policyEndDate) > new Date(data.policyStartDate);
      }
      return true;
    },
    { message: 'End date must be after start date', path: ['policyEndDate'] }
  ),

  commercialRisk: z.object({
    coverageLimit: z
      .number({ required_error: 'Required', invalid_type_error: 'Must be a number' })
      .positive(),
    currency: z.string().min(1, 'Required'),
    lossCoveredPct: z
      .number({ invalid_type_error: 'Must be a number' })
      .min(0)
      .max(100)
      .default(90),
    coverageBasis: z.string().min(1, 'Required'),
    waitingPeriodDays: z
      .number({ invalid_type_error: 'Must be a number' })
      .int()
      .positive(),
  }).optional(),

  politicalRisk: z.object({
    coverageLimit: z
      .number({ required_error: 'Required', invalid_type_error: 'Must be a number' })
      .positive(),
    currency: z.string().min(1, 'Required'),
    lossCoveredPct: z
      .number({ invalid_type_error: 'Must be a number' })
      .min(0)
      .max(100)
      .default(90),
    perils: z.array(z.string()).min(1, 'Select at least one peril'),
  }).optional(),

  exclusions: z.object({
    standardItems: z.array(z.string()).default([]),
    customText: z.string().optional(),
  }).default({ standardItems: [], customText: '' }),

  conditionsPrecedent: z.object({
    standardItems: z.array(z.string()).default([]),
    customText: z.string().optional(),
  }).default({ standardItems: [], customText: '' }),

  claimsHandling: z.object({
    jurisdiction: z.string().min(1, 'Jurisdiction is required'),
    responseTime: z.string().min(1, 'Response time is required'),
    contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  }).optional(),

  premiumAdditions: z.object({
    ratePercent: z.number({ invalid_type_error: 'Must be a number' }).min(0).optional(),
    paymentTerms: z.string().optional(),
  }).optional(),

  quoteStatus: z.object({
    status: z.enum(['indicative', 'firm']).default('indicative'),
    bindingConditions: z.string().optional(),
    messageToBuyer: z.string().optional(),
  }).default({ status: 'indicative' }),

  // Shared fields
  currency: z.string().min(1, 'Currency is required'),
  validityHours: z.number({ required_error: 'Required' }).positive(),
  notes: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a date field (Date | string | undefined) to YYYY-MM-DD string or '' */
function normalizeDate(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  try {
    return new Date(val).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QuoteFormInsurance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} props.requestId - Quote request document ID
 * @param {import('@/domain/entities/Quote').Quote|null} props.existingQuote - Pre-fill for edit mode
 * @param {{ submitQuote: Function, loading: boolean }} props.actions - Action handlers from useQuoteActions
 * @param {Function} [props.onSuccess] - Callback after successful submission
 */
export function QuoteFormInsurance({ requestId, existingQuote, actions, onSuccess }) {
  const isEditMode = !!existingQuote;

  // ── Accordion toggle state ─────────────────────────────────────────────────
  const [commercialRiskEnabled, setCommercialRiskEnabled] = useState(
    !!existingQuote?.commercialRisk
  );
  const [politicalRiskEnabled, setPoliticalRiskEnabled] = useState(
    !!existingQuote?.politicalRisk
  );

  // ── Summary modal state ────────────────────────────────────────────────────
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // ── Default values — backward-compat with old flat-field quotes ────────────
  const defaultValues = existingQuote
    ? {
        cargoMarine: {
          iccCoverage:
            existingQuote.cargoMarine?.iccCoverage || existingQuote.iccCoverage || 'A',
          warClause:
            existingQuote.cargoMarine?.warClause ?? existingQuote.warClause ?? false,
          strikesClause:
            existingQuote.cargoMarine?.strikesClause ?? existingQuote.strikesClause ?? false,
          premiumAmount:
            existingQuote.cargoMarine?.premiumAmount || existingQuote.premiumAmount || 0,
          coverageAmount:
            existingQuote.cargoMarine?.coverageAmount || existingQuote.coverageAmount || 0,
          lossCoveredPct: existingQuote.cargoMarine?.lossCoveredPct ?? 100,
          deductiblePct:
            existingQuote.cargoMarine?.deductiblePct ?? existingQuote.deductiblePct ?? 0,
          claimsPaymentDays:
            existingQuote.cargoMarine?.claimsPaymentDays ||
            existingQuote.claimsPaymentDays ||
            30,
          policyStartDate: normalizeDate(
            existingQuote.cargoMarine?.policyStartDate || existingQuote.policyStartDate
          ),
          policyEndDate: normalizeDate(
            existingQuote.cargoMarine?.policyEndDate || existingQuote.policyEndDate
          ),
          coverageScope:
            existingQuote.cargoMarine?.coverageScope ||
            existingQuote.coverageScope ||
            COVERAGE_SCOPE[0].value,
          certificateType:
            existingQuote.cargoMarine?.certificateType || existingQuote.certificateType || '',
        },
        commercialRisk: existingQuote.commercialRisk || undefined,
        politicalRisk: existingQuote.politicalRisk || undefined,
        exclusions: existingQuote.exclusions || { standardItems: [], customText: '' },
        conditionsPrecedent: existingQuote.conditionsPrecedent || { standardItems: [], customText: '' },
        claimsHandling: existingQuote.claimsHandling || undefined,
        premiumAdditions: existingQuote.premiumAdditions || undefined,
        quoteStatus: existingQuote.quoteStatus || { status: 'indicative' },
        currency: existingQuote.currency || 'USD',
        validityHours: existingQuote.validityHours || 24,
        notes: existingQuote.notes || '',
      }
    : {
        cargoMarine: {
          iccCoverage: 'A',
          warClause: false,
          strikesClause: false,
          premiumAmount: 0,
          coverageAmount: 0,
          lossCoveredPct: 100,
          deductiblePct: 0,
          claimsPaymentDays: 30,
          policyStartDate: '',
          policyEndDate: '',
          coverageScope: COVERAGE_SCOPE[0].value,
          certificateType: '',
        },
        commercialRisk: undefined,
        politicalRisk: undefined,
        exclusions: { standardItems: [], customText: '' },
        conditionsPrecedent: { standardItems: [], customText: '' },
        claimsHandling: undefined,
        premiumAdditions: undefined,
        quoteStatus: { status: 'indicative' },
        currency: 'USD',
        validityHours: 24,
        notes: '',
      };

  // ── Single useForm instance shared across all sections ─────────────────────
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(insuranceQuoteSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues,
  });

  // ── Toggle handlers — clear form state when disabling optional sections ─────
  const handleCommercialRiskToggle = (e) => {
    const checked = e.target.checked;
    setCommercialRiskEnabled(checked);
    if (!checked) {
      setValue('commercialRisk', undefined);
    }
  };

  const handlePoliticalRiskToggle = (e) => {
    const checked = e.target.checked;
    setPoliticalRiskEnabled(checked);
    if (!checked) {
      setValue('politicalRisk', undefined);
    }
  };

  // ── Watched values for summary modal ─────────────────────────────────────
  const watchedValues = watch();

  // ── Form submit ────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    await actions.submitQuote(requestId, {
      type: 'insurance',
      ...data,
    });
    if (onSuccess) onSuccess();
  };

  // ── Modal confirm: triggers actual submission ──────────────────────────────
  const handleConfirmSubmit = async () => {
    await handleSubmit(onSubmit)();
  };

  // ── Accordion animation variants ─────────────────────────────────────────
  const accordionVariants = {
    open: {
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeInOut' },
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeInOut' },
    },
  };

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-orange-900/20 border-b border-orange-700/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-orange-400">
          {isEditMode ? 'Update Insurance Quote' : 'Submit Insurance Quote'}
        </h3>
        <p className="text-xs text-[#8899AA] mt-0.5">
          Fill in coverage details and premium for this cargo
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(() => setShowSummaryModal(true))(e);
        }}
        className="p-4 space-y-3"
      >

        {/* ── Cargo / Marine Accordion (Required, always open) ─────────────── */}
        <div className="border border-[#2A3B52] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0F1C2E]">
            <Shield size={16} className="text-orange-400 shrink-0" />
            <span className="text-sm font-semibold text-white flex-1">Cargo / Marine</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-300 border border-orange-700/30">
              Required
            </span>
          </div>
          <div className="px-4 py-4 border-t border-[#2A3B52]">
            <CargoMarineSection
              register={register}
              control={control}
              errors={errors}
              watch={watch}
            />
          </div>
        </div>

        {/* ── Commercial Risk Accordion (Optional, toggleable) ─────────────── */}
        <div className="border border-[#2A3B52] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0F1C2E]">
            <AlertTriangle size={16} className="text-yellow-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white flex-1">Commercial Risk</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A283B] text-[#8899AA] border border-[#2A3B52]">
              Optional
            </span>
            <label className="flex items-center gap-2 cursor-pointer ml-2">
              <span className="text-xs text-[#8899AA]">Enable</span>
              <input
                type="checkbox"
                checked={commercialRiskEnabled}
                onChange={handleCommercialRiskToggle}
                className="w-4 h-4 accent-orange-400"
              />
            </label>
          </div>
          <AnimatePresence initial={false}>
            {commercialRiskEnabled && (
              <motion.div
                key="commercial-risk-body"
                variants={accordionVariants}
                initial="closed"
                animate="open"
                exit="closed"
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 py-4 border-t border-[#2A3B52]">
                  <CommercialRiskSection
                    register={register}
                    errors={errors}
                    watch={watch}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Political Risk Accordion (Optional, toggleable) ──────────────── */}
        <div className="border border-[#2A3B52] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0F1C2E]">
            <AlertTriangle size={16} className="text-red-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white flex-1">Political Risk</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A283B] text-[#8899AA] border border-[#2A3B52]">
              Optional
            </span>
            <label className="flex items-center gap-2 cursor-pointer ml-2">
              <span className="text-xs text-[#8899AA]">Enable</span>
              <input
                type="checkbox"
                checked={politicalRiskEnabled}
                onChange={handlePoliticalRiskToggle}
                className="w-4 h-4 accent-orange-400"
              />
            </label>
          </div>
          <AnimatePresence initial={false}>
            {politicalRiskEnabled && (
              <motion.div
                key="political-risk-body"
                variants={accordionVariants}
                initial="closed"
                animate="open"
                exit="closed"
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 py-4 border-t border-[#2A3B52]">
                  <PoliticalRiskSection
                    register={register}
                    errors={errors}
                    watch={watch}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Shared sections ───────────────────────────────────────────────── */}
        <ExclusionsSection register={register} errors={errors} watch={watch} />
        <ConditionsPrecedentSection register={register} errors={errors} watch={watch} />
        <ClaimsHandlingSection register={register} errors={errors} watch={watch} />
        <PremiumAdditionsSection register={register} errors={errors} watch={watch} />
        <QuoteStatusSection register={register} errors={errors} watch={watch} />

        {/* ── Shared fields: Currency + Validity row ────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Currency *</label>
            <select
              {...register('currency')}
              style={{ backgroundImage: selectChevronUrl }}
              className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#0F1C2E]">
                  {c.label}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p className="text-xs text-red-400 mt-1">{errors.currency.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Quote Validity *</label>
            <select
              {...register('validityHours', { valueAsNumber: true })}
              style={{ backgroundImage: selectChevronUrl }}
              className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
            >
              {QUOTE_VALIDITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0F1C2E]">
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.validityHours && (
              <p className="text-xs text-red-400 mt-1">{errors.validityHours.message}</p>
            )}
          </div>
        </div>

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">
            Notes / Special Conditions (optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any special conditions, exclusions, or additional notes..."
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
          />
        </div>

        {/* ── Submit Button ─────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={actions?.loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actions?.loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : isEditMode ? (
            <>
              <RefreshCw size={16} />
              Update Quote
            </>
          ) : (
            <>
              <Send size={16} />
              Submit Quote
            </>
          )}
        </button>

      </form>

      {/* ── Summary Modal ─────────────────────────────────────────────────── */}
      <QuoteSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onConfirm={handleConfirmSubmit}
        watchedValues={watchedValues}
        isLoading={actions?.loading}
        commercialRiskEnabled={commercialRiskEnabled}
        politicalRiskEnabled={politicalRiskEnabled}
      />
    </div>
  );
}

export default QuoteFormInsurance;
