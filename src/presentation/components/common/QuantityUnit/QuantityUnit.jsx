'use client';

import { getUnitByCode, getUnitNamePluralized } from '@/core/constants/units';

/**
 * QuantityUnit
 *
 * Renders a quantity + unit pair as "500 Pallets [PX]", where the human
 * name is primary and the UNECE code is shown as a small muted chip so
 * B2B users who need the exact code (customs docs, freight quotes) can
 * still see it. Falls back gracefully if the unit code is unknown.
 *
 * Props:
 *  - quantity: number | string — the numeric value
 *  - unit:     string          — UNECE code (e.g. "PX", "PCE", "KGM")
 *  - showCode: boolean         — default true; set false to hide the chip
 *  - className / codeClassName — style overrides
 *  - separator: string         — text between name and chip (default ' ')
 */
export function QuantityUnit({
  quantity,
  unit,
  showCode = true,
  className = '',
  codeClassName = '',
  separator = ' ',
}) {
  if (quantity === null || quantity === undefined || quantity === '') {
    return null;
  }

  const name = getUnitNamePluralized(quantity, unit);
  const hasKnownUnit = !!getUnitByCode(unit);

  return (
    <span className={className}>
      {quantity}
      {name ? ` ${name}` : ''}
      {showCode && hasKnownUnit && (
        <>
          {separator}
          <span
            className={
              codeClassName ||
              'inline-block ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold text-[#A0A0A0] bg-white/5 border border-white/10 align-middle'
            }
          >
            {unit}
          </span>
        </>
      )}
    </span>
  );
}

export default QuantityUnit;
