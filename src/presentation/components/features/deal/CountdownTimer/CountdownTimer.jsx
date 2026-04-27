/**
 * CountdownTimer Component
 *
 * Live countdown to deal/offer expiry.
 * Changes color based on urgency:
 *   - Normal  : neutral/green
 *   - < 4h    : yellow/warning
 *   - < 1h    : red/urgent
 *   - Expired : red badge "Expired"
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * Format milliseconds into a human-readable countdown string.
 * @param {number} ms - Remaining milliseconds
 * @returns {string}
 */
function formatCountdown(ms) {
  if (ms <= 0) return null; // Signal expired

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * CountdownTimer
 *
 * @param {Object} props
 * @param {Date|null} props.expiresAt - Expiry date (JS Date from entity)
 * @param {string} [props.className] - Extra CSS classes
 */
export function CountdownTimer({ expiresAt, className = '' }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }

    const expiryMs = expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime();

    function tick() {
      const now = Date.now();
      setRemaining(Math.max(0, expiryMs - now));
    }

    tick(); // Immediate first tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Not yet hydrated
  if (remaining === null) {
    return null;
  }

  // Expired
  if (remaining === 0) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Clock size={14} className="text-red-400" />
        <span className="text-xs font-semibold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full border border-red-700">
          Expired
        </span>
      </div>
    );
  }

  // Color thresholds
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  let colorClass = 'text-emerald-400'; // Normal
  let bgClass = 'bg-emerald-900/20 border-emerald-800';
  let iconClass = 'text-emerald-400';

  if (remaining < ONE_HOUR_MS) {
    colorClass = 'text-red-400';
    bgClass = 'bg-red-900/20 border-red-800';
    iconClass = 'text-red-400';
  } else if (remaining < FOUR_HOURS_MS) {
    colorClass = 'text-yellow-400';
    bgClass = 'bg-yellow-900/20 border-yellow-800';
    iconClass = 'text-yellow-400';
  }

  const label = formatCountdown(remaining);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Clock size={14} className={iconClass} />
      <span className={`text-xs font-semibold ${colorClass} ${bgClass} px-2 py-0.5 rounded-full border`}>
        {label} remaining
      </span>
    </div>
  );
}

export default CountdownTimer;
