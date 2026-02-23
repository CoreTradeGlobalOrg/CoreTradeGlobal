/**
 * DealForm Component
 *
 * Full offer form for creating or submitting a counter-offer.
 * Uses react-hook-form + Zod (offerSchema) for validation.
 * Pre-fills from product data when provided.
 *
 * Fields: price, currency, conversionRate, quantity, unit,
 *         incoterm (pills), namedPlace (autocomplete),
 *         deliveryDeadline, paymentTerms, insurancePreference (auto-set),
 *         expiryHours, notes, attachments.
 *
 * Props:
 *   defaultValues  {Object}   - Pre-fill values (from product or previous offer)
 *   productCurrency{string}   - Base currency of the product (to detect conversion rate need)
 *   onSubmit       {Function} - async (data) => void  — called with validated form data
 *   loading        {boolean}  - Disables form and shows spinner on submit button
 *   submitLabel    {string}   - Label on submit button (default: "Submit Offer")
 */

'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { offerSchema } from '@/core/validation/offerSchema';
import {
  DEAL_UNITS,
  PAYMENT_TERMS,
  INSURANCE_PREFERENCE,
  EXPIRY_DEFAULT_HOURS,
} from '@/core/constants/dealConstants';
import { INCOTERMS_2020, getIncotermByCode } from '@/core/constants/incoterms';
import { CURRENCIES } from '@/core/constants/currencies';
import { IncotermsSelector } from '@/presentation/components/features/deal/IncotermsSelector/IncotermsSelector';
import { NamedPlaceInput } from '@/presentation/components/features/deal/NamedPlaceInput/NamedPlaceInput';

// Insurance preference display labels
const INSURANCE_LABELS = {
  [INSURANCE_PREFERENCE.SELLER_PROVIDES]: 'Seller Provides',
  [INSURANCE_PREFERENCE.BUYER_PROVIDES]: 'Buyer Provides',
  [INSURANCE_PREFERENCE.NONE]: 'No Insurance',
};

// Insurance notes linked to Incoterm selection
const INSURANCE_INCOTERM_NOTES = {
  CIF: 'CIF requires seller to provide minimum insurance coverage.',
  CIP: 'CIP requires seller to provide comprehensive insurance coverage.',
};

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
      {children}
      {required && <span className="ml-1 text-[#FFD700]">*</span>}
    </label>
  );
}

// Shared className for <select> elements: appearance-none + custom chevron with proper padding
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// Minimum date string (today) for the delivery deadline input
function getTodayISODate() {
  return new Date().toISOString().split('T')[0];
}

export function DealForm({
  defaultValues = {},
  productCurrency = 'USD',
  onSubmit,
  loading = false,
  submitLabel = 'Submit Offer',
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      price: defaultValues.price || '',
      quantity: defaultValues.quantity || 1,
      unit: defaultValues.unit || DEAL_UNITS[0].value,
      currency: defaultValues.currency || productCurrency || 'USD',
      conversionRate: defaultValues.conversionRate || null,
      incoterm: defaultValues.incoterm || '',
      namedPlace: defaultValues.namedPlace || '',
      deliveryDeadline: defaultValues.deliveryDeadline || null,
      paymentTerms: defaultValues.paymentTerms || '',
      insurancePreference:
        defaultValues.insurancePreference || INSURANCE_PREFERENCE.BUYER_PROVIDES,
      notes: defaultValues.notes || '',
      expiryHours: defaultValues.expiryHours || EXPIRY_DEFAULT_HOURS,
    },
  });

  const watchedValues = watch();
  const {
    price,
    quantity,
    currency,
    incoterm: selectedIncoterm,
    insurancePreference,
  } = watchedValues;

  // Auto-set insurance preference when incoterm changes
  useEffect(() => {
    if (!selectedIncoterm) return;
    const term = getIncotermByCode(selectedIncoterm);
    if (term?.insuranceDefault) {
      setValue('insurancePreference', term.insuranceDefault, {
        shouldValidate: true,
      });
    }
  }, [selectedIncoterm, setValue]);

  // Computed values
  const estimatedTotal =
    price && quantity ? parseFloat(price) * parseFloat(quantity) : 0;
  const showConversionRate = currency && currency !== productCurrency;
  const selectedIncotermData = selectedIncoterm
    ? getIncotermByCode(selectedIncoterm)
    : null;

  const handleFormSubmit = async (data) => {
    // Clean null conversionRate if not shown
    if (!showConversionRate) {
      data.conversionRate = null;
    }
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

      {/* ── Row 1: Price + Currency ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Price per Unit</FieldLabel>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('price', { valueAsNumber: true })}
            disabled={loading}
            placeholder="0.00"
            className={`w-full px-3 py-3 rounded-xl border text-white text-sm bg-[#0A1628] placeholder:text-[#4a5568]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.price
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <FieldError message={errors.price?.message} />
        </div>

        <div>
          <FieldLabel required>Currency</FieldLabel>
          <select
            {...register('currency')}
            disabled={loading}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full px-3 pr-10 py-3 rounded-xl border text-white text-sm bg-[#0A1628]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.currency
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#0F1B2B]">
                {c.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.currency?.message} />
        </div>
      </div>

      {/* ── Conversion Rate (shown only when currency differs) ── */}
      {showConversionRate && (
        <div>
          <FieldLabel>Conversion Rate</FieldLabel>
          <input
            type="number"
            step="0.000001"
            min="0"
            {...register('conversionRate', { valueAsNumber: true })}
            disabled={loading}
            placeholder="e.g. 1.08"
            className={`w-full md:w-1/2 px-3 py-3 rounded-xl border text-white text-sm bg-[#0A1628] placeholder:text-[#4a5568]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.conversionRate
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <p className="mt-1 text-xs text-[#64748b]">
            1 {productCurrency} = ? {currency}
          </p>
          <FieldError message={errors.conversionRate?.message} />
        </div>
      )}

      {/* ── Estimated Total ── */}
      {estimatedTotal > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.15)]">
          <span className="text-[#94a3b8] text-sm">Estimated Total</span>
          <span className="text-[#FFD700] font-bold text-lg">
            {currency} {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[#64748b] text-xs">
            ({price} × {quantity} {DEAL_UNITS.find((u) => u.value === watchedValues.unit)?.label || ''})
          </span>
        </div>
      )}

      {/* ── Row 2: Quantity + Unit ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Quantity</FieldLabel>
          <input
            type="number"
            min="0"
            step="any"
            {...register('quantity', { valueAsNumber: true })}
            disabled={loading}
            placeholder="1"
            className={`w-full px-3 py-3 rounded-xl border text-white text-sm bg-[#0A1628] placeholder:text-[#4a5568]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.quantity
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <FieldError message={errors.quantity?.message} />
        </div>

        <div>
          <FieldLabel required>Unit</FieldLabel>
          <select
            {...register('unit')}
            disabled={loading}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full px-3 pr-10 py-3 rounded-xl border text-white text-sm bg-[#0A1628]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.unit
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {DEAL_UNITS.map((u) => (
              <option key={u.value} value={u.value} className="bg-[#0F1B2B]">
                {u.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.unit?.message} />
        </div>
      </div>

      {/* ── Row 3: Incoterms Selector ── */}
      <div>
        <FieldLabel required>Incoterms 2020</FieldLabel>
        <Controller
          name="incoterm"
          control={control}
          render={({ field }) => (
            <IncotermsSelector
              value={field.value}
              onChange={field.onChange}
              disabled={loading}
              error={!!errors.incoterm}
            />
          )}
        />
        <FieldError message={errors.incoterm?.message} />
      </div>

      {/* ── Row 4: Named Place ── */}
      <div>
        <FieldLabel required>
          {selectedIncotermData?.namedPlaceLabel || 'Named Place'}
        </FieldLabel>
        <Controller
          name="namedPlace"
          control={control}
          render={({ field }) => (
            <NamedPlaceInput
              value={field.value}
              onChange={field.onChange}
              incoterm={selectedIncotermData}
              disabled={loading || !selectedIncoterm}
              error={!!errors.namedPlace}
            />
          )}
        />
        {!selectedIncoterm && (
          <p className="mt-1 text-xs text-[#64748b]">
            Select an Incoterm above to enable this field.
          </p>
        )}
        <FieldError message={errors.namedPlace?.message} />
      </div>

      {/* ── Row 5: Delivery Deadline + Payment Terms ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Delivery Deadline</FieldLabel>
          <style>{`
            input[type="date"].deal-date::-webkit-calendar-picker-indicator {
              filter: invert(83%) sepia(40%) saturate(1000%) hue-rotate(360deg) brightness(103%) contrast(104%);
              cursor: pointer;
            }
          `}</style>
          <input
            type="date"
            min={getTodayISODate()}
            {...register('deliveryDeadline')}
            disabled={loading}
            className={`deal-date w-full px-3 pr-10 py-3 rounded-xl border text-white text-sm bg-[#0A1628]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.deliveryDeadline
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <FieldError message={errors.deliveryDeadline?.message} />
        </div>

        <div>
          <FieldLabel required>Payment Terms</FieldLabel>
          <select
            {...register('paymentTerms')}
            disabled={loading}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full px-3 pr-10 py-3 rounded-xl border text-white text-sm bg-[#0A1628]
              focus:outline-none focus:ring-2 transition-all duration-200
              ${errors.paymentTerms
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="" className="bg-[#0F1B2B]">
              Select payment terms
            </option>
            {PAYMENT_TERMS.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#0F1B2B]">
                {p.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.paymentTerms?.message} />
        </div>
      </div>

      {/* ── Row 6: Insurance Preference ── */}
      <div>
        <FieldLabel required>Insurance Preference</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {Object.values(INSURANCE_PREFERENCE).map((pref) => (
            <label
              key={pref}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer
                transition-all duration-150 text-sm font-medium
                ${
                  loading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-[rgba(255,255,255,0.3)]'
                }
                ${
                  insurancePreference === pref
                    ? 'border-[#FFD700] bg-[rgba(255,215,0,0.08)] text-[#FFD700]'
                    : 'border-[rgba(255,255,255,0.1)] text-[#94a3b8]'
                }
              `}
            >
              <input
                type="radio"
                {...register('insurancePreference')}
                value={pref}
                disabled={loading}
                className="sr-only"
              />
              {INSURANCE_LABELS[pref]}
            </label>
          ))}
        </div>
        {/* Auto-set note */}
        {selectedIncoterm && INSURANCE_INCOTERM_NOTES[selectedIncoterm] && (
          <p className="mt-1.5 text-xs text-[#94a3b8] flex items-center gap-1">
            <span className="text-[#FFD700]">i</span>
            {INSURANCE_INCOTERM_NOTES[selectedIncoterm]}
          </p>
        )}
        {selectedIncoterm && !INSURANCE_INCOTERM_NOTES[selectedIncoterm] && selectedIncotermData && (
          <p className="mt-1.5 text-xs text-[#64748b]">
            Auto-set based on {selectedIncoterm}: {INSURANCE_LABELS[selectedIncotermData.insuranceDefault]}
          </p>
        )}
        <FieldError message={errors.insurancePreference?.message} />
      </div>

      {/* ── Row 7: Offer Expiry ── */}
      <div>
        <FieldLabel>
          Offer Expires In{' '}
          <span className="text-[#64748b] text-xs font-normal">(hours)</span>
        </FieldLabel>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="720"
            {...register('expiryHours', { valueAsNumber: true })}
            disabled={loading}
            className={`w-32 px-3 py-3 rounded-xl border text-white text-sm bg-[#0A1628]
              focus:outline-none focus:ring-2 transition-all duration-200
              border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <span className="text-[#94a3b8] text-sm">
            hours{' '}
            {watchedValues.expiryHours > 0 && (
              <span className="text-[#64748b]">
                ({Math.round(watchedValues.expiryHours / 24 * 10) / 10} days)
              </span>
            )}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#64748b]">Default is 72 hours (3 days)</p>
        <FieldError message={errors.expiryHours?.message} />
      </div>

      {/* ── Row 8: Notes ── */}
      <div>
        <FieldLabel>
          Notes{' '}
          <span className="text-[#64748b] text-xs font-normal">(optional)</span>
        </FieldLabel>
        <textarea
          {...register('notes')}
          rows={3}
          disabled={loading}
          placeholder="Additional details, specifications, or terms..."
          maxLength={2000}
          className={`w-full px-3 py-3 rounded-xl border text-white text-sm bg-[#0A1628] placeholder:text-[#4a5568]
            focus:outline-none focus:ring-2 transition-all duration-200 resize-none
            ${errors.notes
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <div className="flex justify-between mt-1">
          <FieldError message={errors.notes?.message} />
          <span className="text-xs text-[#64748b] ml-auto">
            {(watchedValues.notes || '').length}/2000
          </span>
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className={`
            w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFD700]/50
            ${loading
              ? 'opacity-60 cursor-not-allowed bg-[#FFD700] text-[#0F1B2B]'
              : 'bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] hover:scale-[1.01] active:scale-[0.99]'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#0F1B2B] border-t-transparent rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

export default DealForm;
