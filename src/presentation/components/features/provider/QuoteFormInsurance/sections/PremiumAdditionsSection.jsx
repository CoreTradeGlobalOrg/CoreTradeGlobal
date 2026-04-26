/**
 * PremiumAdditionsSection
 *
 * Renders premium additions fields: rate % input and payment terms dropdown.
 * Both fields are optional.
 *
 * Field prefix: premiumAdditions.*
 * Props: { register, errors }
 */

'use client';

import { PREMIUM_PAYMENT_TERMS } from '@/core/constants/quoteConstants';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ─────────────────────────────────────────────────────────────────────────────
// PremiumAdditionsSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PremiumAdditionsSection
 *
 * @param {{ register: Function, errors: Object }} props
 */
export function PremiumAdditionsSection({ register, errors }) {
  return (
    <div className="border-t border-[#2A3B52] pt-4 mt-4">
      <h4 className="text-sm font-semibold text-white mb-3">Premium Additions</h4>

      {/* Rate % + Payment Terms — 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">
            Premium Rate (% of insured value)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('premiumAdditions.ratePercent', { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {errors?.premiumAdditions?.ratePercent && (
            <p className="text-xs text-red-400 mt-1">
              {errors.premiumAdditions.ratePercent.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-[#8899AA] mb-1">
            Payment Terms
          </label>
          <select
            {...register('premiumAdditions.paymentTerms')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
          >
            <option value="" className="bg-[#0F1C2E]">Select terms...</option>
            {PREMIUM_PAYMENT_TERMS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0F1C2E]">
                {opt.label}
              </option>
            ))}
          </select>
          {errors?.premiumAdditions?.paymentTerms && (
            <p className="text-xs text-red-400 mt-1">
              {errors.premiumAdditions.paymentTerms.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PremiumAdditionsSection;
