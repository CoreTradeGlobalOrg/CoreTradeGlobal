'use client';

/**
 * CargoMarineSection
 *
 * Body content for the Cargo/Marine accordion (always open, required).
 * Receives react-hook-form props from the parent QuoteFormInsurance orchestrator.
 * All field names use the `cargoMarine.` prefix.
 */

import { Controller } from 'react-hook-form';
import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';
import { ICC_COVERAGE, COVERAGE_SCOPE } from '@/core/constants/quoteConstants';

// Custom chevron for select elements — matches app styling
const selectChevronBg = `appearance-none bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat`;
const selectChevronUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/**
 * @param {{ register: Function, control: object, errors: object, watch: Function }} props
 */
export function CargoMarineSection({ register, control, errors, watch }) {
  const watchedICC = watch('cargoMarine.iccCoverage');
  const cargoErrors = errors.cargoMarine || {};

  return (
    <div className="space-y-5">

      {/* ICC Coverage Type */}
      <div>
        <label className="block text-xs font-medium text-[#8899AA] mb-2">
          ICC Coverage Type *
        </label>
        <div className="space-y-2">
          {Object.values(ICC_COVERAGE).map((coverage) => (
            <label
              key={coverage.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                watchedICC === coverage.value
                  ? 'border-orange-500/50 bg-orange-900/10'
                  : 'border-[#2A3B52] bg-[#0F1C2E] hover:border-[#3A4B62]'
              }`}
            >
              <input
                type="radio"
                value={coverage.value}
                {...register('cargoMarine.iccCoverage')}
                className="mt-0.5 accent-orange-400"
              />
              <div>
                <p className={`text-sm font-medium ${watchedICC === coverage.value ? 'text-orange-300' : 'text-white'}`}>
                  {coverage.label}
                </p>
                <p className="text-xs text-[#8899AA] mt-0.5">{coverage.description}</p>
              </div>
            </label>
          ))}
        </div>
        {cargoErrors.iccCoverage && (
          <p className="text-xs text-red-400 mt-1">{cargoErrors.iccCoverage.message}</p>
        )}
      </div>

      {/* War & Strikes Clauses */}
      <div>
        <label className="block text-xs font-medium text-[#8899AA] mb-2">
          Additional Clauses
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors">
            <input
              type="checkbox"
              {...register('cargoMarine.warClause')}
              className="w-4 h-4 accent-orange-400"
            />
            <div>
              <p className="text-sm text-white font-medium">War Clause</p>
              <p className="text-xs text-[#8899AA]">Coverage for losses due to war, strikes, and civil commotion</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors">
            <input
              type="checkbox"
              {...register('cargoMarine.strikesClause')}
              className="w-4 h-4 accent-orange-400"
            />
            <div>
              <p className="text-sm text-white font-medium">Strikes Clause</p>
              <p className="text-xs text-[#8899AA]">Coverage for losses caused by strikers or labor disputes</p>
            </div>
          </label>
        </div>
      </div>

      {/* Premium + Coverage Amount + % of Loss Covered row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Premium Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('cargoMarine.premiumAmount', { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {cargoErrors.premiumAmount && (
            <p className="text-xs text-red-400 mt-1">{cargoErrors.premiumAmount.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Coverage Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('cargoMarine.coverageAmount', { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {cargoErrors.coverageAmount && (
            <p className="text-xs text-red-400 mt-1">{cargoErrors.coverageAmount.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">% of Loss Covered</label>
          <input
            type="number"
            step="1"
            min="70"
            max="110"
            {...register('cargoMarine.lossCoveredPct', { valueAsNumber: true })}
            placeholder="100"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {cargoErrors.lossCoveredPct && (
            <p className="text-xs text-red-400 mt-1">{cargoErrors.lossCoveredPct.message}</p>
          )}
        </div>
      </div>

      {/* Deductible + Claims Payment row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Deductible / Franchise %</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...register('cargoMarine.deductiblePct', { valueAsNumber: true })}
            placeholder="0"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {cargoErrors.deductiblePct && (
            <p className="text-xs text-red-400 mt-1">{cargoErrors.deductiblePct.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Claims Payment (days) *</label>
          <input
            type="number"
            step="1"
            min="1"
            {...register('cargoMarine.claimsPaymentDays', { valueAsNumber: true })}
            placeholder="30"
            className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {cargoErrors.claimsPaymentDays && (
            <p className="text-xs text-red-400 mt-1">{cargoErrors.claimsPaymentDays.message}</p>
          )}
        </div>
      </div>

      {/* Policy Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Policy Start Date</label>
          <Controller
            name="cargoMarine.policyStartDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                minDate={new Date().toISOString().split('T')[0]}
                placeholder="Start date..."
                accentColor="orange"
              />
            )}
          />
        </div>
        <div>
          <label className="block text-xs text-[#8899AA] mb-1">Policy End Date</label>
          <Controller
            name="cargoMarine.policyEndDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                minDate={new Date().toISOString().split('T')[0]}
                placeholder="End date..."
                accentColor="orange"
                error={cargoErrors.policyEndDate?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Coverage Scope */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">Coverage Scope *</label>
        <select
          {...register('cargoMarine.coverageScope')}
          style={{ backgroundImage: selectChevronUrl }}
          className={`${selectChevronBg} w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors`}
        >
          {COVERAGE_SCOPE.map((scope) => (
            <option key={scope.value} value={scope.value} className="bg-[#0F1C2E]">
              {scope.label}
            </option>
          ))}
        </select>
        {cargoErrors.coverageScope && (
          <p className="text-xs text-red-400 mt-1">{cargoErrors.coverageScope.message}</p>
        )}
      </div>

      {/* Certificate Type (optional) */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">Certificate Type (optional)</label>
        <input
          type="text"
          {...register('cargoMarine.certificateType')}
          placeholder="e.g., Marine Certificate, Open Cover"
          className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors"
        />
      </div>

    </div>
  );
}

export default CargoMarineSection;
