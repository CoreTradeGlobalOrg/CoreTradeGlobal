'use client';

/**
 * PoliticalRiskSection
 *
 * Body content for the Political Risk accordion (optional, toggled by parent).
 * Receives react-hook-form props from the parent QuoteFormInsurance orchestrator.
 * All field names use the `politicalRisk.` prefix.
 */

import { POLITICAL_PERILS } from '@/core/constants/quoteConstants';
import { CURRENCIES } from '@/core/constants/currencies';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/**
 * @param {{ register: Function, errors: object, watch: Function }} props
 */
export function PoliticalRiskSection({ register, errors, watch }) {
  const politicalErrors = errors.politicalRisk || {};

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
            {...register('politicalRisk.coverageLimit', { valueAsNumber: true })}
            onFocus={e => e.target.select()}
            placeholder="0.00"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {politicalErrors.coverageLimit && (
            <p className="text-xs text-red-400 mt-1">{politicalErrors.coverageLimit.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Currency *</label>
          <select
            {...register('politicalRisk.currency')}
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
          {politicalErrors.currency && (
            <p className="text-xs text-red-400 mt-1">{politicalErrors.currency.message}</p>
          )}
        </div>
      </div>

      {/* % of Loss Covered */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">% of Loss Covered</label>
        <input
          type="number"
          step="1"
          min="0"
          max="100"
          {...register('politicalRisk.lossCoveredPct', { valueAsNumber: true })}
          onFocus={e => e.target.select()}
          placeholder="90"
          className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
        />
        {politicalErrors.lossCoveredPct && (
          <p className="text-xs text-red-400 mt-1">{politicalErrors.lossCoveredPct.message}</p>
        )}
      </div>

      {/* Political Perils checkboxes */}
      <div>
        <label className="block text-xs font-medium text-[#8899AA] mb-2">
          Political Perils Covered * <span className="text-[#4A5B6E]">(select at least one)</span>
        </label>
        <div className="space-y-2">
          {POLITICAL_PERILS.map((peril) => (
            <label
              key={peril.value}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors"
            >
              <input
                type="checkbox"
                value={peril.value}
                {...register('politicalRisk.perils')}
                className="w-4 h-4 accent-orange-400"
              />
              <span className="text-sm text-white">{peril.label}</span>
            </label>
          ))}
        </div>
        {politicalErrors.perils && (
          <p className="text-xs text-red-400 mt-1">{politicalErrors.perils.message}</p>
        )}
      </div>

    </div>
  );
}

export default PoliticalRiskSection;
