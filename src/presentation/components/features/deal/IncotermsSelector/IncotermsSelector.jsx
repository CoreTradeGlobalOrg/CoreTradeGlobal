/**
 * IncotermsSelector Component
 *
 * Renders all 11 Incoterms 2020 as selectable pill buttons with tooltips.
 * Selected pill has a filled/active style; unselected pills use an outline style.
 *
 * Props:
 *   value    {string}   - Currently selected Incoterm code (e.g. 'FOB')
 *   onChange {Function} - Called with the selected code string
 *   disabled {boolean}  - Disables all pills when true
 *   error    {boolean}  - Shows error ring when true
 */

'use client';

import { useState } from 'react';
import { INCOTERMS_2020 } from '@/core/constants/incoterms';

export function IncotermsSelector({ value, onChange, disabled = false, error = false }) {
  const [tooltip, setTooltip] = useState(null); // { code, x, y }

  const handleSelect = (code) => {
    if (disabled) return;
    onChange(code);
  };

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap gap-2 p-3 rounded-xl border transition-all duration-200 ${
          error
            ? 'border-red-500 bg-[rgba(239,68,68,0.05)]'
            : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]'
        }`}
      >
        {INCOTERMS_2020.map((term) => {
          const isSelected = value === term.code;
          return (
            <div key={term.code} className="relative group">
              <button
                type="button"
                onClick={() => handleSelect(term.code)}
                disabled={disabled}
                aria-pressed={isSelected}
                title={`${term.label} — ${term.description}`}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-offset-1
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
                  ${
                    isSelected
                      ? 'bg-[#FFD700] border-[#FFD700] text-[#0F1B2B] shadow-[0_0_12px_rgba(255,215,0,0.4)] focus:ring-[#FFD700]'
                      : 'bg-transparent border-[rgba(255,255,255,0.2)] text-[#94a3b8] hover:border-[#FFD700] hover:text-[#FFD700] focus:ring-[rgba(255,215,0,0.4)]'
                  }
                `}
              >
                {term.code}
              </button>

              {/* Tooltip — shown on hover via CSS group */}
              <div
                className="
                  pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  w-56 p-2.5 rounded-lg
                  bg-[#0F1B2B] border border-[rgba(255,255,255,0.15)]
                  shadow-xl text-xs text-white
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-150 z-50
                  whitespace-normal text-center
                "
                role="tooltip"
              >
                <p className="font-bold text-[#FFD700] mb-1">{term.label}</p>
                <p className="text-[#94a3b8] leading-snug">{term.description}</p>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F1B2B]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected label */}
      {value && (
        <p className="text-xs text-[#94a3b8]">
          Selected:{' '}
          <span className="text-[#FFD700] font-semibold">
            {INCOTERMS_2020.find((t) => t.code === value)?.label}
          </span>
        </p>
      )}
    </div>
  );
}

export default IncotermsSelector;
