'use client';

/**
 * CommercialRiskSection
 *
 * Body content for the Commercial Risk accordion (optional, toggled by parent).
 * Receives react-hook-form props from the parent QuoteFormInsurance orchestrator.
 * All field names use the `commercialRisk.` prefix.
 */

import { COMMERCIAL_COVERAGE_BASIS } from '@/core/constants/quoteConstants';
import { CURRENCIES } from '@/core/constants/currencies';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/**
 * @param {{ register: Function, errors: object, watch: Function }} props
 */
export function CommercialRiskSection({ register, errors, watch }) {
  const commercialErrors = errors.commercialRisk || {};

  return (
    <div className="space-y-4">

      {/* Coverage Limit + Currency row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Coverage Limit *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('commercialRisk.coverageLimit', { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {commercialErrors.coverageLimit && (
            <p className="text-xs text-red-400 mt-1">{commercialErrors.coverageLimit.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Currency *</label>
          <select
            {...register('commercialRisk.currency')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
          >
            <option value="" className="bg-[#0F1C2E]">Select currency...</option>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#0F1C2E]">
                {c.label}
              </option>
            ))}
          </select>
          {commercialErrors.currency && (
            <p className="text-xs text-red-400 mt-1">{commercialErrors.currency.message}</p>
          )}
        </div>
      </div>

      {/* % of Loss Covered + Coverage Basis row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">% of Loss Covered</label>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            {...register('commercialRisk.lossCoveredPct', { valueAsNumber: true })}
            placeholder="90"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {commercialErrors.lossCoveredPct && (
            <p className="text-xs text-red-400 mt-1">{commercialErrors.lossCoveredPct.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Coverage Basis *</label>
          <select
            {...register('commercialRisk.coverageBasis')}
            style={{ backgroundImage: selectChevronUrl }}
            className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
          >
            <option value="" className="bg-[#0F1C2E]">Select basis...</option>
            {COMMERCIAL_COVERAGE_BASIS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0F1C2E]">
                {opt.label}
              </option>
            ))}
          </select>
          {commercialErrors.coverageBasis && (
            <p className="text-xs text-red-400 mt-1">{commercialErrors.coverageBasis.message}</p>
          )}
        </div>
      </div>

      {/* Waiting Period */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">Waiting Period (days) *</label>
        <input
          type="number"
          step="1"
          min="1"
          {...register('commercialRisk.waitingPeriodDays', { valueAsNumber: true })}
          placeholder="30"
          className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
        />
        {commercialErrors.waitingPeriodDays && (
          <p className="text-xs text-red-400 mt-1">{commercialErrors.waitingPeriodDays.message}</p>
        )}
      </div>

    </div>
  );
}

export default CommercialRiskSection;
