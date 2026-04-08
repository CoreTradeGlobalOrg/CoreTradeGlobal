/**
 * QuoteFormLogistics Component
 *
 * Logistics quote submission form.
 * Fields: Transport mode, container type (sea only), freight cost, currency,
 * estimated transit days, loading date, estimated arrival, quote validity,
 * capability tags, notes.
 *
 * Uses react-hook-form + zod for validation (same pattern as CounterOfferForm).
 * Container type field conditionally shown when transport mode is 'sea'.
 * Supports edit mode: pre-fills from existingQuote when provided.
 */

'use client';

import { useForm, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';
import {
  TRANSPORT_MODE,
  CONTAINER_TYPE,
  CAPABILITY_TAGS,
  QUOTE_VALIDITY_OPTIONS,
} from '@/core/constants/quoteConstants';
import { CURRENCIES } from '@/core/constants/currencies';

// Custom chevron for select elements
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ─────────────────────────────────────────────────────────────────────────────
// Zod Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const logisticsQuoteSchema = z
  .object({
    transportMode: z.string().min(1, 'Transport mode is required'),
    containerType: z.string().optional(),
    freightCost: z
      .number({ required_error: 'Freight cost is required', invalid_type_error: 'Must be a number' })
      .positive('Freight cost must be greater than 0'),
    currency: z.string().min(1, 'Currency is required'),
    estimatedTransitDays: z
      .number({ required_error: 'Transit days required', invalid_type_error: 'Must be a number' })
      .int('Must be a whole number')
      .positive('Must be greater than 0'),
    loadingDate: z.string().optional(),
    estimatedArrival: z.string().optional(),
    validityHours: z.number({ required_error: 'Quote validity is required' }).positive(),
    capabilityTags: z.array(z.string()).optional().default([]),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.loadingDate && data.estimatedArrival) {
        return new Date(data.estimatedArrival) >= new Date(data.loadingDate);
      }
      return true;
    },
    {
      message: 'Estimated arrival must be on or after loading date',
      path: ['estimatedArrival'],
    }
  );

// ─────────────────────────────────────────────────────────────────────────────
// QuoteFormLogistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuoteFormLogistics
 *
 * @param {Object} props
 * @param {string} props.requestId - Quote request document ID
 * @param {import('@/domain/entities/Quote').Quote|null} props.existingQuote - Pre-fill for edit mode
 * @param {{ submitQuote: Function, loading: boolean }} props.actions - Action handlers from useQuoteActions
 * @param {Function} [props.onSuccess] - Callback after successful submission
 */
export function QuoteFormLogistics({ requestId, existingQuote, actions, onSuccess }) {
  const isEditMode = !!existingQuote;

  const defaultValues = existingQuote
    ? {
        transportMode: existingQuote.transportMode || 'sea',
        containerType: existingQuote.containerType || '',
        freightCost: existingQuote.freightCost || 0,
        currency: existingQuote.currency || 'USD',
        estimatedTransitDays: existingQuote.estimatedTransitDays || 0,
        loadingDate: existingQuote.loadingDate
          ? (existingQuote.loadingDate instanceof Date
              ? existingQuote.loadingDate.toISOString().split('T')[0]
              : new Date(existingQuote.loadingDate).toISOString().split('T')[0])
          : '',
        estimatedArrival: existingQuote.estimatedArrival
          ? (existingQuote.estimatedArrival instanceof Date
              ? existingQuote.estimatedArrival.toISOString().split('T')[0]
              : new Date(existingQuote.estimatedArrival).toISOString().split('T')[0])
          : '',
        validityHours: existingQuote.validityHours || 24,
        capabilityTags: existingQuote.capabilityTags || [],
        notes: existingQuote.notes || '',
      }
    : {
        transportMode: 'sea',
        containerType: '',
        freightCost: 0,
        currency: 'USD',
        estimatedTransitDays: 0,
        loadingDate: '',
        estimatedArrival: '',
        validityHours: 24,
        capabilityTags: [],
        notes: '',
      };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(logisticsQuoteSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues,
  });

  // Watch transport mode to conditionally show container type
  const watchedTransportMode = useWatch({ control, name: 'transportMode' });
  const showContainerType = watchedTransportMode === 'sea';

  const onSubmit = async (data) => {
    await actions.submitQuote(requestId, {
      type: 'logistics',
      ...data,
    });
    if (onSuccess) onSuccess();
  };

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-green-900/20 border-b border-green-700/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-green-400">
          {isEditMode ? 'Update Logistics Quote' : 'Submit Logistics Quote'}
        </h3>
        <p className="text-xs text-[#8899AA] mt-0.5">
          Provide shipping details and freight cost
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-5">

        {/* Transport Mode */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Transport Mode *</label>
          <select
            {...register('transportMode')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors`}
          >
            {TRANSPORT_MODE.map((mode) => (
              <option key={mode.value} value={mode.value} className="bg-[#0F1C2E]">
                {mode.label}
              </option>
            ))}
          </select>
          {errors.transportMode && (
            <p className="text-xs text-red-400 mt-1">{errors.transportMode.message}</p>
          )}
        </div>

        {/* Container Type — only shown for sea freight */}
        {showContainerType && (
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Container Type</label>
            <select
              {...register('containerType')}
              style={{ backgroundImage: selectChevronUrl }}
              className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors`}
            >
              <option value="" className="bg-[#0F1C2E]">Select container type...</option>
              {CONTAINER_TYPE.map((ct) => (
                <option key={ct.value} value={ct.value} className="bg-[#0F1C2E]">
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Freight Cost + Currency row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Total Freight Cost *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('freightCost', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-green-500/50 transition-colors"
            />
            {errors.freightCost && (
              <p className="text-xs text-red-400 mt-1">{errors.freightCost.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Currency *</label>
            <select
              {...register('currency')}
              style={{ backgroundImage: selectChevronUrl }}
              className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors`}
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
        </div>

        {/* Transit Days */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Estimated Transit Days *</label>
          <input
            type="number"
            step="1"
            min="1"
            {...register('estimatedTransitDays', { valueAsNumber: true })}
            placeholder="e.g. 14"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-green-500/50 transition-colors"
          />
          {errors.estimatedTransitDays && (
            <p className="text-xs text-red-400 mt-1">{errors.estimatedTransitDays.message}</p>
          )}
        </div>

        {/* Loading + Arrival Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Loading Date</label>
            <Controller
              name="loadingDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={new Date().toISOString().split('T')[0]}
                  placeholder="Loading date..."
                  accentColor="green"
                />
              )}
            />
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Estimated Arrival</label>
            <Controller
              name="estimatedArrival"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={new Date().toISOString().split('T')[0]}
                  placeholder="Arrival date..."
                  accentColor="green"
                  error={errors.estimatedArrival?.message}
                />
              )}
            />
          </div>
        </div>

        {/* Quote Validity */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Quote Validity *</label>
          <select
            {...register('validityHours', { valueAsNumber: true })}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors`}
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

        {/* Capability Tags */}
        <div>
          <label className="block text-xs font-medium text-[#8899AA] mb-2">
            Capability Tags (optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CAPABILITY_TAGS.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 p-2 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors text-xs"
              >
                <input
                  type="checkbox"
                  value={tag}
                  {...register('capabilityTags')}
                  className="w-3.5 h-3.5 accent-green-400"
                />
                <span className="text-[#C0D0E0]">{tag}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">
            Notes / Special Conditions (optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any special conditions, equipment requirements, or additional notes..."
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-green-500/50 transition-colors resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={actions?.loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default QuoteFormLogistics;
