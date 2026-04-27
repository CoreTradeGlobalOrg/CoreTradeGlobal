/**
 * DealFormFields Component
 *
 * Core pricing, quantity, and logistics form field rows.
 * Renders rows 1-5 of the deal offer form (price, quantity, incoterm, place, delivery/payment).
 * DealFormSidebar handles insurance, expiry, and notes.
 *
 * Props: register, control, errors, loading, productCurrency,
 *        showConversionRate, estimatedTotal, selectedIncoterm, selectedIncotermData,
 *        watchedValues
 */

'use client';

import { Controller } from 'react-hook-form';
import { DEAL_UNITS, PAYMENT_TERMS } from '@/core/constants/dealConstants';
import { CURRENCIES } from '@/core/constants/currencies';
import { IncotermsSelector } from '@/presentation/components/features/deal/IncotermsSelector/IncotermsSelector';
import { NamedPlaceInput } from '@/presentation/components/features/deal/NamedPlaceInput/NamedPlaceInput';
import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';

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

const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function getTodayISODate() {
  return new Date().toISOString().split('T')[0];
}

const inputCls = (hasError, loading) =>
  `w-full px-3 py-3 rounded-xl border text-white text-sm bg-[#0A1628] placeholder:text-[#4a5568]
   focus:outline-none focus:ring-2 transition-all duration-200
   ${hasError
     ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
     : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
   } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`;

const selectCls = (hasError, loading) =>
  `${selectChevronBg} w-full px-3 pr-10 py-3 rounded-xl border text-white text-sm bg-[#0A1628]
   focus:outline-none focus:ring-2 transition-all duration-200
   ${hasError
     ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
     : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
   } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`;

export function DealFormFields({
  register,
  control,
  errors,
  loading,
  productCurrency,
  showConversionRate,
  estimatedTotal,
  selectedIncoterm,
  selectedIncotermData,
  watchedValues,
}) {
  return (
    <>
      {/* ── Row 1: Price + Currency ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Price per Unit</FieldLabel>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('price', { valueAsNumber: true })}
            onFocus={e => e.target.select()}
            disabled={loading}
            placeholder="0.00"
            className={inputCls(errors.price, loading)}
          />
          <FieldError message={errors.price?.message} />
        </div>

        <div>
          <FieldLabel required>Currency</FieldLabel>
          <select
            {...register('currency')}
            disabled={loading}
            style={{ backgroundImage: selectChevronUrl }}
            className={selectCls(errors.currency, loading)}
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

      {/* ── Conversion Rate ── */}
      {showConversionRate && (
        <div>
          <FieldLabel>Conversion Rate</FieldLabel>
          <input
            type="number"
            step="0.000001"
            min="0"
            {...register('conversionRate', { valueAsNumber: true })}
            onFocus={e => e.target.select()}
            disabled={loading}
            placeholder="e.g. 1.08"
            className={`w-full md:w-1/2 ${inputCls(errors.conversionRate, loading)}`}
          />
          <p className="mt-1 text-xs text-[#64748b]">
            1 {productCurrency} = ? {watchedValues.currency}
          </p>
          <FieldError message={errors.conversionRate?.message} />
        </div>
      )}

      {/* ── Estimated Total ── */}
      {estimatedTotal > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.15)]">
          <span className="text-[#94a3b8] text-sm">Estimated Total</span>
          <span className="text-[#FFD700] font-bold text-lg">
            {watchedValues.currency} {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[#64748b] text-xs">
            ({watchedValues.price} × {watchedValues.quantity} {DEAL_UNITS.find((u) => u.value === watchedValues.unit)?.label || ''})
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
            onFocus={e => e.target.select()}
            disabled={loading}
            placeholder="1"
            className={inputCls(errors.quantity, loading)}
          />
          <FieldError message={errors.quantity?.message} />
        </div>

        <div>
          <FieldLabel required>Unit</FieldLabel>
          <select
            {...register('unit')}
            disabled={loading}
            style={{ backgroundImage: selectChevronUrl }}
            className={selectCls(errors.unit, loading)}
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
          <Controller
            name="deliveryDeadline"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value || null}
                onChange={(dateStr) => field.onChange(dateStr || '')}
                minDate={getTodayISODate()}
                placeholder="Select delivery deadline..."
                accentColor="gold"
                disabled={loading}
                error={errors.deliveryDeadline?.message}
              />
            )}
          />
          {!errors.deliveryDeadline && <div />}
        </div>

        <div>
          <FieldLabel required>Payment Terms</FieldLabel>
          <select
            {...register('paymentTerms')}
            disabled={loading}
            style={{ backgroundImage: selectChevronUrl }}
            className={selectCls(errors.paymentTerms, loading)}
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
    </>
  );
}

export default DealFormFields;
