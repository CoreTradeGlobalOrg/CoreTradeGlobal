/**
 * ETACountdown Component
 *
 * Displays a live countdown to an ETA date.
 * Updates every minute. Shows "Arrived" if date is in the past.
 *
 * Props:
 *   etaDate {Date|import('firebase/firestore').Timestamp|null} - ETA date
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Resolve Firestore Timestamp or plain Date to a JS Date.
 * @param {*} value
 * @returns {Date|null}
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'number' || typeof value === 'string') return new Date(value);
  return null;
}

export function ETACountdown({ etaDate }) {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    const date = toDate(etaDate);
    if (!date) return;

    function compute() {
      const now = Date.now();
      if (date.getTime() <= now) {
        setLabel('Arrived');
      } else {
        setLabel(formatDistanceToNow(date, { addSuffix: true }));
      }
    }

    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [etaDate]);

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-900/20 text-blue-400 border border-blue-700/30">
      <Clock className="w-3 h-3 flex-shrink-0" />
      ETA {label}
    </span>
  );
}

export default ETACountdown;
