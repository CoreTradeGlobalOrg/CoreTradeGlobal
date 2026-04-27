/**
 * ExclusionsSection
 *
 * Renders standard exclusion checkboxes from STANDARD_EXCLUSIONS constant
 * plus a free text area for deal-specific exclusions.
 *
 * Field prefix: exclusions.*
 * Props: { register, errors }
 */

'use client';

import { STANDARD_EXCLUSIONS } from '@/core/constants/quoteConstants';

// ─────────────────────────────────────────────────────────────────────────────
// ExclusionsSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ExclusionsSection
 *
 * @param {{ register: Function, errors: Object }} props
 */
export function ExclusionsSection({ register, errors }) {
  return (
    <div className="border-t border-[#2A3B52] pt-4 mt-4">
      <h4 className="text-sm font-semibold text-white mb-1">Exclusions</h4>
      <p className="text-xs text-[#8899AA] mb-3">
        Select standard exclusions that apply to this quote
      </p>

      {/* Standard exclusion checkboxes */}
      <div className="space-y-2 mb-4">
        {STANDARD_EXCLUSIONS.map((item) => (
          <label
            key={item.value}
            className="flex items-center gap-3 p-3 rounded-lg border border-[#2A3B52] bg-[#0F1C2E] cursor-pointer hover:border-[#3A4B62] transition-colors"
          >
            <input
              type="checkbox"
              value={item.value}
              {...register('exclusions.standardItems')}
              className="w-4 h-4 accent-orange-400"
            />
            <span className="text-sm text-white">{item.label}</span>
          </label>
        ))}
      </div>

      {errors?.exclusions?.standardItems && (
        <p className="text-xs text-red-400 mt-1 mb-2">
          {errors.exclusions.standardItems.message}
        </p>
      )}

      {/* Custom exclusions free text */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">
          Additional Exclusions (optional)
        </label>
        <textarea
          {...register('exclusions.customText')}
          rows={3}
          placeholder="Enter any deal-specific exclusions..."
          className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
        />
      </div>
    </div>
  );
}

export default ExclusionsSection;
