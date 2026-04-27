/**
 * DealFormSidebar Component
 *
 * Insurance preference section and expiry/notes footer fields of the deal form.
 * Separated from main fields to keep DealFormFields under 300 lines.
 *
 * Props: register, errors, loading, selectedIncoterm, selectedIncotermData,
 *        insurancePreference, watchedValues
 */

'use client';

import { INSURANCE_PREFERENCE } from '@/core/constants/dealConstants';

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

export function DealFormSidebar({
  register,
  errors,
  loading,
  selectedIncoterm,
  selectedIncotermData,
  insurancePreference,
  watchedValues,
}) {
  return (
    <>
      {/* ── Insurance Preference ── */}
      <div>
        <FieldLabel required>Insurance Preference</FieldLabel>
        <div className="flex flex-wrap gap-3">
          {Object.values(INSURANCE_PREFERENCE).map((pref) => (
            <label
              key={pref}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer
                transition-all duration-150 text-sm font-medium
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[rgba(255,255,255,0.3)]'}
                ${insurancePreference === pref
                  ? 'border-[#FFD700] bg-[rgba(255,215,0,0.08)] text-[#FFD700]'
                  : 'border-[rgba(255,255,255,0.1)] text-[#94a3b8]'}
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

      {/* ── Offer Expiry ── */}
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
            onFocus={e => e.target.select()}
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

      {/* ── Notes ── */}
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
    </>
  );
}

export default DealFormSidebar;
