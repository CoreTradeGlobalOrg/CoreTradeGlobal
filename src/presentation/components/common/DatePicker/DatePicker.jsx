/**
 * DatePicker Component
 *
 * Custom styled calendar date picker using react-day-picker v9.
 * Dark-themed popover calendar matching the app's color palette.
 *
 * Works with react-hook-form via value/onChange props (use with Controller).
 *
 * @param {Object} props
 * @param {string|Date|null} props.value - Selected date (ISO string or Date)
 * @param {(dateStr: string) => void} props.onChange - Callback with ISO date string (YYYY-MM-DD)
 * @param {string} [props.minDate] - Minimum selectable date (ISO string)
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.accentColor] - Tailwind color name: 'orange', 'green', 'blue', 'emerald'
 * @param {boolean} [props.disabled]
 * @param {string} [props.error] - Error message
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import 'react-day-picker/style.css';

const ACCENT_MAP = {
  orange: {
    selected: 'bg-orange-500 text-white',
    today: 'border-orange-400',
    focus: 'focus:border-orange-500/50',
    icon: 'text-orange-400',
    chevron: 'fill-orange-400',
  },
  green: {
    selected: 'bg-green-500 text-white',
    today: 'border-green-400',
    focus: 'focus:border-green-500/50',
    icon: 'text-green-400',
    chevron: 'fill-green-400',
  },
  blue: {
    selected: 'bg-blue-500 text-white',
    today: 'border-blue-400',
    focus: 'focus:border-blue-500/50',
    icon: 'text-blue-400',
    chevron: 'fill-blue-400',
  },
  emerald: {
    selected: 'bg-emerald-500 text-white',
    today: 'border-emerald-400',
    focus: 'focus:border-emerald-500/50',
    icon: 'text-emerald-400',
    chevron: 'fill-emerald-400',
  },
};

export function DatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select date...',
  accentColor = 'blue',
  disabled = false,
  error,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.blue;

  // Parse value to Date
  const selectedDate = value
    ? typeof value === 'string'
      ? parse(value, 'yyyy-MM-dd', new Date())
      : value
    : undefined;

  const displayValue =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, 'MMM d, yyyy')
      : '';

  const minDateObj = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : undefined;

  // Calculate dropdown position from button rect
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4 + window.scrollY,
      left: rect.left + window.scrollX,
    });
  }, []);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click (works with portal)
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleSelect(date) {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger input */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={className || `w-full flex items-center gap-2 bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-left transition-colors ${accent.focus} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#3A4B62]'
        } ${open ? 'border-[#3A4B62]' : ''}`}
      >
        <CalendarDays size={14} className={displayValue ? accent.icon : 'text-[#4A5B6E]'} />
        <span className={displayValue ? 'text-white' : 'text-[#4A5B6E]'}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Calendar dropdown — rendered via portal to avoid overflow clipping */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-xl border border-[#2A3B52] bg-[#1A283B] shadow-xl shadow-black/40 p-3"
          style={{ top: dropdownPos.top, left: dropdownPos.left, position: 'absolute' }}
        >
          <style>{`
            .ctg-calendar .rdp-root {
              --rdp-accent-color: transparent;
              --rdp-day-height: 32px;
              --rdp-day-width: 32px;
              font-size: 13px;
            }
            .ctg-calendar .rdp-month_caption {
              color: #C0D0E0;
              font-size: 13px;
              font-weight: 600;
            }
            .ctg-calendar .rdp-weekday {
              color: #4A5B6E;
              font-size: 11px;
              font-weight: 500;
            }
            .ctg-calendar .rdp-day button {
              color: #C0D0E0;
              border-radius: 8px;
              transition: all 0.15s;
            }
            .ctg-calendar .rdp-day button:hover {
              background: #2A3B52;
            }
            .ctg-calendar .rdp-day_button:disabled {
              color: #2A3B52 !important;
              cursor: not-allowed;
            }
            .ctg-calendar .rdp-today:not(.rdp-selected) .rdp-day_button {
              border: 1px solid #4A5B6E;
              font-weight: 700;
            }
            .ctg-calendar .rdp-selected .rdp-day_button {
              font-weight: 700;
            }
            .ctg-calendar .rdp-outside .rdp-day_button {
              color: #2A3B52;
            }
            .ctg-calendar .rdp-nav button {
              color: #8899AA;
              border-radius: 8px;
            }
            .ctg-calendar .rdp-nav button:hover {
              background: #2A3B52;
              color: #C0D0E0;
            }
          `}</style>
          <div className="ctg-calendar">
            <DayPicker
              mode="single"
              selected={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
              onSelect={handleSelect}
              disabled={minDateObj ? { before: minDateObj } : undefined}
              defaultMonth={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
              classNames={{
                today: accent.today,
                selected: accent.selected,
                chevron: accent.chevron,
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default DatePicker;
