/**
 * ClaimsHandlingSection
 *
 * Renders claims handling fields: jurisdiction dropdown, response time dropdown,
 * and optional contact email.
 *
 * Field prefix: claimsHandling.*
 * Props: { register, errors }
 */

'use client';

import { CLAIMS_JURISDICTION, CLAIMS_RESPONSE_TIME } from '@/core/constants/quoteConstants';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// ─────────────────────────────────────────────────────────────────────────────
// ClaimsHandlingSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ClaimsHandlingSection
 *
 * @param {{ register: Function, errors: Object }} props
 */
export function ClaimsHandlingSection({ register, errors }) {
  return (
    <div className="border-t border-[#2A3B52] pt-4 mt-4">
      <h4 className="text-sm font-semibold text-white mb-3">Claims Handling</h4>

      {/* Jurisdiction + Response Time — 2-column grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">
            Jurisdiction *
          </label>
          <select
            {...register('claimsHandling.jurisdiction')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
          >
            <option value="" className="bg-[#0F1C2E]">Select jurisdiction...</option>
            {CLAIMS_JURISDICTION.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0F1C2E]">
                {opt.label}
              </option>
            ))}
          </select>
          {errors?.claimsHandling?.jurisdiction && (
            <p className="text-xs text-red-400 mt-1">
              {errors.claimsHandling.jurisdiction.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-[#8899AA] mb-1">
            Response Time *
          </label>
          <select
            {...register('claimsHandling.responseTime')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
          >
            <option value="" className="bg-[#0F1C2E]">Select response time...</option>
            {CLAIMS_RESPONSE_TIME.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0F1C2E]">
                {opt.label}
              </option>
            ))}
          </select>
          {errors?.claimsHandling?.responseTime && (
            <p className="text-xs text-red-400 mt-1">
              {errors.claimsHandling.responseTime.message}
            </p>
          )}
        </div>
      </div>

      {/* Claims Contact Email — full width */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">
          Claims Contact Email (optional)
        </label>
        <input
          type="email"
          {...register('claimsHandling.contactEmail')}
          placeholder="claims@company.com"
          className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
        />
        {errors?.claimsHandling?.contactEmail && (
          <p className="text-xs text-red-400 mt-1">
            {errors.claimsHandling.contactEmail.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default ClaimsHandlingSection;
