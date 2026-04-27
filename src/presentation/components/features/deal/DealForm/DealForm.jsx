/**
 * DealForm Component
 *
 * Orchestrator for the deal offer form. Owns form state via react-hook-form
 * and delegates rendering to DealFormFields.
 *
 * Props:
 *   defaultValues  {Object}   - Pre-fill values (from product or previous offer)
 *   productCurrency{string}   - Base currency of the product (to detect conversion rate need)
 *   onSubmit       {Function} - async (data) => void — called with validated form data
 *   loading        {boolean}  - Disables form and shows spinner on submit button
 *   submitLabel    {string}   - Label on submit button (default: "Submit Offer")
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { offerSchema } from '@/core/validation/offerSchema';
import {
  DEAL_UNITS,
  INSURANCE_PREFERENCE,
  EXPIRY_DEFAULT_HOURS,
} from '@/core/constants/dealConstants';
import { getIncotermByCode } from '@/core/constants/incoterms';
import { DealFormFields } from './DealFormFields';
import { DealFormSidebar } from './DealFormSidebar';

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
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
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
  const { price, quantity, currency, incoterm: selectedIncoterm, insurancePreference } = watchedValues;

  // Auto-set insurance preference when incoterm changes
  useEffect(() => {
    if (!selectedIncoterm) return;
    const term = getIncotermByCode(selectedIncoterm);
    if (term?.insuranceDefault) {
      setValue('insurancePreference', term.insuranceDefault, { shouldValidate: true });
    }
  }, [selectedIncoterm, setValue]);

  // Computed values
  const estimatedTotal = price && quantity ? parseFloat(price) * parseFloat(quantity) : 0;
  const showConversionRate = currency && currency !== productCurrency;
  const selectedIncotermData = selectedIncoterm ? getIncotermByCode(selectedIncoterm) : null;

  const handleFormSubmit = async (data) => {
    if (!showConversionRate) {
      data.conversionRate = null;
    }
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <DealFormFields
        register={register}
        control={control}
        errors={errors}
        loading={loading}
        productCurrency={productCurrency}
        showConversionRate={showConversionRate}
        estimatedTotal={estimatedTotal}
        selectedIncoterm={selectedIncoterm}
        selectedIncotermData={selectedIncotermData}
        watchedValues={watchedValues}
      />

      <DealFormSidebar
        register={register}
        errors={errors}
        loading={loading}
        selectedIncoterm={selectedIncoterm}
        selectedIncotermData={selectedIncotermData}
        insurancePreference={insurancePreference}
        watchedValues={watchedValues}
      />

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
