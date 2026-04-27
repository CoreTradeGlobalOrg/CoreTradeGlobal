/**
 * CounterOfferForm Component
 *
 * Form for submitting counter-offers during a deal negotiation.
 *
 * Visibility rules:
 *   - ONLY rendered when deal.currentTurnUid === currentUser.uid AND deal.status === 'negotiating'
 *   - When NOT the user's turn: shows "Waiting for [Party]..." message instead
 *
 * Pre-fill: all fields pre-filled from the latest offer
 * Validation: offerSchema (Zod via react-hook-form)
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { offerSchema } from '@/core/validation/offerSchema';
import { DEAL_STATUS, PAYMENT_TERMS, DEAL_UNITS, INSURANCE_PREFERENCE, EXPIRY_DEFAULT_HOURS } from '@/core/constants/dealConstants';
import { CURRENCIES } from '@/core/constants/currencies';
import { getIncotermByCode } from '@/core/constants/incoterms';
import { IncotermsSelector } from '../IncotermsSelector/IncotermsSelector';
import { NamedPlaceInput } from '../NamedPlaceInput/NamedPlaceInput';
import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';
import { Loader2, Clock, Send } from 'lucide-react';

// Custom chevron for select elements — matches DealForm styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ─────────────────────────────────────────────────────────────────────────────
// CounterOfferForm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CounterOfferForm
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Offer').Offer|null} props.latestOffer
 * @param {string} props.currentUserUid
 * @param {{ submitCounterOffer: Function, loading: boolean }} props.actions
 * @param {Object} [props.otherPartyData] - { displayName, companyName }
 */
export function CounterOfferForm({
  deal,
  latestOffer,
  currentUserUid,
  actions,
  otherPartyData,
}) {
  const isMyTurn =
    deal?.status === DEAL_STATUS.NEGOTIATING &&
    deal?.currentTurnUid === currentUserUid;

  // Compute pre-fill from latest offer
  const defaultValues = latestOffer
    ? {
        price: latestOffer.price,
        quantity: latestOffer.quantity,
        unit: latestOffer.unit,
        currency: latestOffer.currency || 'USD',
        conversionRate: latestOffer.conversionRate ?? null,
        incoterm: latestOffer.incoterm,
        namedPlace: latestOffer.namedPlace,
        deliveryDeadline: latestOffer.deliveryDeadline instanceof Date
          ? latestOffer.deliveryDeadline.toISOString().split('T')[0]
          : latestOffer.deliveryDeadline?.seconds
          ? new Date(latestOffer.deliveryDeadline.seconds * 1000).toISOString().split('T')[0]
          : latestOffer.deliveryDeadline
          ? new Date(latestOffer.deliveryDeadline).toISOString().split('T')[0]
          : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        paymentTerms: latestOffer.paymentTerms,
        insurancePreference: latestOffer.insurancePreference,
        notes: latestOffer.notes ?? '',
        expiryHours: EXPIRY_DEFAULT_HOURS,
      }
    : {
        price: 0,
        quantity: 0,
        unit: 'kg',
        currency: 'USD',
        conversionRate: null,
        incoterm: 'FOB',
        namedPlace: '',
        deliveryDeadline: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        paymentTerms: 'cash',
        insurancePreference: INSURANCE_PREFERENCE.BUYER_PROVIDES,
        notes: '',
        expiryHours: EXPIRY_DEFAULT_HOURS,
      };

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(offerSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues,
  });

  const watchedIncoterm = watch('incoterm');

  // Auto-set insurance preference when incoterm changes
  useEffect(() => {
    const meta = getIncotermByCode(watchedIncoterm);
    if (meta?.insuranceDefault) {
      setValue('insurancePreference', meta.insuranceDefault);
    }
  }, [watchedIncoterm, setValue]);

  const onSubmit = async (data) => {
    if (!deal?.id) return;
    await actions.submitCounterOffer(deal.id, data, deal.round);
  };

  // ─── Not my turn — show waiting message ───────────────────────────────────
  if (!isMyTurn) {
    const otherName = otherPartyData?.companyName || otherPartyData?.displayName || 'the other party';
    const lastOfferTime = latestOffer?.createdAt
      ? (latestOffer.createdAt instanceof Date
          ? latestOffer.createdAt
          : new Date(latestOffer.createdAt)).toLocaleString('en-GB', {
              hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short'
            })
      : null;

    return (
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-[#0F1C2E] border border-[#2A3B52] flex items-center justify-center mx-auto mb-3">
          <Clock size={20} className="text-[#8899AA]" />
        </div>
        <p className="text-white font-medium">Waiting for {otherName} to respond</p>
        {lastOfferTime && (
          <p className="text-xs text-[#8899AA] mt-1">
            Your offer was sent at {lastOfferTime}
          </p>
        )}
      </div>
    );
  }

  // ─── My turn — show form ──────────────────────────────────────────────────
  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#FFD700]/10 border-b border-[#FFD700]/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#FFD700]">Counter-Offer</h3>
        <p className="text-xs text-[#8899AA] mt-0.5">Modify any terms and submit your counter-offer</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Price + Currency row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-xs text-[#8899AA] mb-1">Price per Unit *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('price', { valueAsNumber: true })}
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
            />
            {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Currency *</label>
            <select
              {...register('currency')}
              style={{ backgroundImage: selectChevronUrl }}
              className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors`}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#0F1C2E]">
                  {c.label}
                </option>
              ))}
            </select>
            {errors.currency && <p className="text-xs text-red-400 mt-1">{errors.currency.message}</p>}
          </div>
        </div>

        {/* Quantity + Unit row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('quantity', { valueAsNumber: true })}
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
            />
            {errors.quantity && <p className="text-xs text-red-400 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-[#8899AA] mb-1">Unit *</label>
            <select
              {...register('unit')}
              style={{ backgroundImage: selectChevronUrl }}
              className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors`}
            >
              {DEAL_UNITS.map((u) => (
                <option key={u.value} value={u.value} className="bg-[#0F1C2E]">{u.label}</option>
              ))}
            </select>
            {errors.unit && <p className="text-xs text-red-400 mt-1">{errors.unit.message}</p>}
          </div>
        </div>

        {/* Incoterms selector */}
        <Controller
          name="incoterm"
          control={control}
          render={({ field }) => (
            <IncotermsSelector
              value={field.value}
              onChange={field.onChange}
              error={!!errors.incoterm}
            />
          )}
        />

        {/* Named place (dynamic label based on incoterm) */}
        <Controller
          name="namedPlace"
          control={control}
          render={({ field }) => (
            <NamedPlaceInput
              value={field.value}
              onChange={field.onChange}
              incoterm={getIncotermByCode(watchedIncoterm)}
              error={!!errors.namedPlace}
            />
          )}
        />

        {/* Delivery deadline */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Delivery Deadline *</label>
          <Controller
            name="deliveryDeadline"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value || null}
                onChange={(dateStr) => field.onChange(dateStr || '')}
                minDate={new Date().toISOString().split('T')[0]}
                placeholder="Select delivery deadline..."
                accentColor="gold"
                error={errors.deliveryDeadline?.message}
              />
            )}
          />
        </div>

        {/* Payment Terms */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Payment Terms *</label>
          <select
            {...register('paymentTerms')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors`}
          >
            {PAYMENT_TERMS.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#0F1C2E]">{p.label}</option>
            ))}
          </select>
          {errors.paymentTerms && <p className="text-xs text-red-400 mt-1">{errors.paymentTerms.message}</p>}
        </div>

        {/* Insurance Preference */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Insurance *</label>
          <select
            {...register('insurancePreference')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors`}
          >
            <option value={INSURANCE_PREFERENCE.SELLER_PROVIDES} className="bg-[#0F1C2E]">Seller Provides</option>
            <option value={INSURANCE_PREFERENCE.BUYER_PROVIDES} className="bg-[#0F1C2E]">Buyer Provides</option>
            <option value={INSURANCE_PREFERENCE.NONE} className="bg-[#0F1C2E]">None</option>
          </select>
          {errors.insurancePreference && <p className="text-xs text-red-400 mt-1">{errors.insurancePreference.message}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Notes (optional)</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any additional terms, conditions, or notes..."
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-[#FFD700]/50 transition-colors resize-none"
          />
          {errors.notes && <p className="text-xs text-red-400 mt-1">{errors.notes.message}</p>}
        </div>

        {/* Expiry hours */}
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Offer Expiry (hours)</label>
          <input
            type="number"
            min="1"
            max="720"
            {...register('expiryHours', { valueAsNumber: true })}
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors"
          />
          <p className="text-xs text-[#8899AA] mt-0.5">Default: 72 hours (3 days)</p>
          {errors.expiryHours && <p className="text-xs text-red-400 mt-1">{errors.expiryHours.message}</p>}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={actions?.loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actions?.loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={16} />
              Submit Counter-Offer
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default CounterOfferForm;
