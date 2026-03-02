/**
 * QuoteFormInsurance Component
 *
 * Insurance quote submission form.
 * Fields: ICC Coverage, war/strikes clauses, premium, coverage amount, deductible,
 * claims payment period, policy dates, coverage scope, certificate type, currency,
 * quote validity, notes.
 *
 * Uses react-hook-form + zod for validation (same pattern as CounterOfferForm).
 * Supports edit mode: pre-fills from existingQuote when provided.
 */

'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import {
  ICC_COVERAGE,
  COVERAGE_SCOPE,
  QUOTE_VALIDITY_OPTIONS,
} from '@/core/constants/quoteConstants';
import { CURRENCIES } from '@/core/constants/currencies';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ─────────────────────────────────────────────────────────────────────────────
// Zod Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const insuranceQuoteSchema = z
  .object({
    iccCoverage: z.enum(['A', 'B', 'C'], { required_error: 'ICC coverage type is required' }),
    warClause: z.boolean().default(false),
    strikesClause: z.boolean().default(false),
    premiumAmount: z
      .number({ required_error: 'Premium amount is required', invalid_type_error: 'Must be a number' })
      .positive('Premium must be greater than 0'),
    coverageAmount: z
      .number({ required_error: 'Coverage amount is required', invalid_type_error: 'Must be a number' })
      .positive('Coverage amount must be greater than 0'),
    deductiblePct: z
      .number({ invalid_type_error: 'Must be a number' })
      .min(0, 'Cannot be negative')
      .max(100, 'Cannot exceed 100%')
      .default(0),
    claimsPaymentDays: z
      .number({ required_error: 'Claims payment period is required', invalid_type_error: 'Must be a number' })
      .int('Must be a whole number')
      .positive('Must be greater than 0'),
    policyStartDate: z.string().optional(),
    policyEndDate: z.string().optional(),
    coverageScope: z.string().min(1, 'Coverage scope is required'),
    certificateType: z.string().optional(),
    currency: z.string().min(1, 'Currency is required'),
    validityHours: z.number({ required_error: 'Quote validity is required' }).positive(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.policyStartDate && data.policyEndDate) {
        return new Date(data.policyEndDate) > new Date(data.policyStartDate);
      }
      return true;
    },
    {
      message: 'Policy end date must be after start date',
      path: ['policyEndDate'],
    }
  );

// ─────────────────────────────────────────────────────────────────────────────
// QuoteFormInsurance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuoteFormInsurance
 *
 * @param {Object} props
 * @param {string} props.requestId - Quote request document ID
 * @param {import('@/domain/entities/Quote').Quote|null} props.existingQuote - Pre-fill for edit mode
 * @param {{ submitQuote: Function, loading: boolean }} props.actions - Action handlers from useQuoteActions
 * @param {Function} [props.onSuccess] - Callback after successful submission
 */
export function QuoteFormInsurance({ requestId, existingQuote, actions, onSuccess }) {
  const isEditMode = !!existingQuote;

  const defaultValues = existingQuote
    ? {
        iccCoverage: existingQuote.iccCoverage || 'A',
        warClause: existingQuote.warClause || false,
        strikesClause: existingQuote.strikesClause || false,
        premiumAmount: existingQuote.premiumAmount || 0,
        coverageAmount: existingQuote.coverageAmount || 0,
        deductiblePct: existingQuote.deductiblePct ?? 0,
        claimsPaymentDays: existingQuote.claimsPaymentDays || 30,
        policyStartDate: existingQuote.policyStartDate
          ? (existingQuote.policyStartDate instanceof Date
              ? existingQuote.policyStartDate.toISOString().split('T')[0]
              : new Date(existingQuote.policyStartDate).toISOString().split('T')[0])
          : '',
        policyEndDate: existingQuote.policyEndDate
          ? (existingQuote.policyEndDate instanceof Date
              ? existingQuote.policyEndDate.toISOString().split('T')[0]
              : new Date(existingQuote.policyEndDate).toISOString().split('T')[0])
          : '',
        coverageScope: existingQuote.coverageScope || COVERAGE_SCOPE[0].value,
        certificateType: existingQuote.certificateType || '',
        currency: existingQuote.currency || 'USD',
        validityHours: existingQuote.validityHours || 24,
        notes: existingQuote.notes || '',
      }
    : {
        iccCoverage: 'A',
        warClause: false,
        strikesClause: false,
        premiumAmount: 0,
        coverageAmount: 0,
        deductiblePct: 0,
        claimsPaymentDays: 30,
        policyStartDate: '',
        policyEndDate: '',
        coverageScope: COVERAGE_SCOPE[0].value,
        certificateType: '',
        currency: 'USD',
        validityHours: 24,
        notes: '',
      };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(insuranceQuoteSchema),
    defaultValues,
  });

  const watchedICC = watch('iccCoverage');

  const onSubmit = async (data) => {
    await actions.submitQuote(requestId, {
      type: 'insurance',
      ...data,
    });
    if (onSuccess) onSuccess();
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

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-5">

        {/* ICC Coverage Type */}
        <div>
          <label className="block text-xs font-medium text-[#8899AA] mb-2">
            ICC Coverage Type *
          </label>
          <div className="space-y-2">
            {Object.values(ICC_COVERAGE).map((coverage) => (
              <label
                key={coverage.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  watchedICC === coverage.value
                    ? 'border-orange-500/50 bg-orange-900/10'
                    : 'border-[#2A3B52] bg-[#0F1C2E] hover:border-[#3A4B62]'
                }`}
              >
                <input
                  type="radio"
                  value={coverage.value}
                  {...register('iccCoverage')}
                  className="mt-0.5 accent-orange-400"
                />
                <div>
                  <p className={`text-sm font-medium ${watchedICC === coverage.value ? 'text-orange-300' : 'text-white'}`}>
                    {coverage.label}
                  </p>
                  <p className="text-xs text-[#8899AA] mt-0.5">{coverage.description}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.iccCoverage && (
            <p className="text-xs text-red-400 mt-1">{errors.iccCoverage.message}</p>
          )}
        </div>

        {/* War & Strikes Clauses */}
        <div>
          <label className="block text-xs font-medium text-[#8899AA] mb-2">
            Additional Clauses
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors">
              <input
                type="checkbox"
                {...register('warClause')}
                className="w-4 h-4 accent-orange-400"
              />
              <div>
                <p className="text-sm text-white font-medium">War Clause</p>
                <p className="text-xs text-[#8899AA]">Coverage for losses due to war, strikes, and civil commotion</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors">
              <input
                type="checkbox"
                {...register('strikesClause')}
                className="w-4 h-4 accent-orange-400"
              />
              <div>
                <p className="text-sm text-white font-medium">Strikes Clause</p>
                <p className="text-xs text-[#8899AA]">Coverage for losses caused by strikers or labor disputes</p>
              </div>
            </label>
          </div>
        </div>

        {/* Premium + Coverage row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Premium Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('premiumAmount', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {errors.premiumAmount && (
              <p className="text-xs text-red-400 mt-1">{errors.premiumAmount.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Coverage Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('coverageAmount', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {errors.coverageAmount && (
              <p className="text-xs text-red-400 mt-1">{errors.coverageAmount.message}</p>
            )}
          </div>
        </div>

        {/* Deductible + Claims payment row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Deductible / Franchise %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register('deductiblePct', { valueAsNumber: true })}
              placeholder="0"
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {errors.deductiblePct && (
              <p className="text-xs text-red-400 mt-1">{errors.deductiblePct.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Claims Payment (days) *</label>
            <input
              type="number"
              step="1"
              min="1"
              {...register('claimsPaymentDays', { valueAsNumber: true })}
              placeholder="30"
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {errors.claimsPaymentDays && (
              <p className="text-xs text-red-400 mt-1">{errors.claimsPaymentDays.message}</p>
            )}
          </div>
        </div>

        {/* Policy Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Policy Start Date</label>
            <style>{`
              input[type="date"].insurance-date::-webkit-calendar-picker-indicator {
                filter: invert(70%) sepia(30%) saturate(600%) hue-rotate(10deg);
                cursor: pointer;
              }
            `}</style>
            <input
              type="date"
              {...register('policyStartDate')}
              min={new Date().toISOString().split('T')[0]}
              className="insurance-date w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Policy End Date</label>
            <input
              type="date"
              {...register('policyEndDate')}
              min={new Date().toISOString().split('T')[0]}
              className="insurance-date w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {errors.policyEndDate && (
              <p className="text-xs text-red-400 mt-1">{errors.policyEndDate.message}</p>
            )}
          </div>
        </div>

        {/* Coverage Scope */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Coverage Scope *</label>
          <select
            {...register('coverageScope')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
          >
            {COVERAGE_SCOPE.map((scope) => (
              <option key={scope.value} value={scope.value} className="bg-[#0F1C2E]">
                {scope.label}
              </option>
            ))}
          </select>
          {errors.coverageScope && (
            <p className="text-xs text-red-400 mt-1">{errors.coverageScope.message}</p>
          )}
        </div>

        {/* Certificate Type (optional) */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Certificate Type (optional)</label>
          <input
            type="text"
            {...register('certificateType')}
            placeholder="e.g., Marine Certificate, Open Cover"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>

        {/* Currency + Validity row */}
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

        {/* Notes / Special Conditions */}
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

        {/* Submit Button */}
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
    </div>
  );
}

export default QuoteFormInsurance;
