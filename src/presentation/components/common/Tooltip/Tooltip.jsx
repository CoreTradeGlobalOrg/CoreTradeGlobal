'use client';

/**
 * Tooltip Component
 *
 * A simple info-icon tooltip that shows/hides on hover and click.
 * Hover opens (for desktop), click toggles (for mobile).
 * Popup is positioned above the trigger icon.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.content - Text or JSX to show in the tooltip
 * @param {React.ReactNode} [props.children] - Trigger element; defaults to <Info size={13} />
 */

import { useState } from 'react';
import { Info } from 'lucide-react';

export function Tooltip({ content, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center text-[#4A5B6E] hover:text-[#8899AA] transition-colors focus:outline-none"
        aria-label="More information"
      >
        {children ?? <Info size={13} />}
      </button>

      {/* Popup — absolute positioned above trigger */}
      {open && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 pointer-events-none"
          role="tooltip"
        >
          <span className="block bg-[#1A283B] border border-[#2A3B52] rounded-lg p-2.5 text-xs text-[#8899AA] shadow-xl leading-relaxed">
            {content}
          </span>
          {/* Caret pointing down */}
          <span
            className="block w-0 h-0 mx-auto"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #2A3B52',
            }}
          />
        </span>
      )}
    </span>
  );
}

export default Tooltip;
