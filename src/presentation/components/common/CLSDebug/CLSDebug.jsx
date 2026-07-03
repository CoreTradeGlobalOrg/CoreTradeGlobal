/**
 * CLS Debug — temporary diagnostic component.
 *
 * Attaches a PerformanceObserver for the `layout-shift` entry type and logs
 * every shift with the affected DOM nodes and shift score. Intended to run
 * only in production preview while we chase the stubborn 0.4 CLS attributed
 * to <footer>. Remove after diagnosis.
 */

'use client';

import { useEffect } from 'react';

export function CLSDebug() {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    let total = 0;
    const shifts = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        total += entry.value;
        const sources = (entry.sources || []).map((s) => {
          const node = s.node;
          if (!node) return { desc: '(no node)' };
          const tag = node.tagName?.toLowerCase() || 'text';
          const cls = node.className && typeof node.className === 'string' ? '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
          const id = node.id ? `#${node.id}` : '';
          const preview = (node.innerText || node.textContent || '').trim().slice(0, 60);
          return {
            desc: `${tag}${id}${cls}`,
            preview,
            prevRect: s.previousRect ? `${Math.round(s.previousRect.x)},${Math.round(s.previousRect.y)} ${Math.round(s.previousRect.width)}x${Math.round(s.previousRect.height)}` : null,
            currRect: s.currentRect ? `${Math.round(s.currentRect.x)},${Math.round(s.currentRect.y)} ${Math.round(s.currentRect.width)}x${Math.round(s.currentRect.height)}` : null,
          };
        });
        shifts.push({ value: entry.value, sources });

        // eslint-disable-next-line no-console
        console.groupCollapsed(
          `%c[CLS] shift ${entry.value.toFixed(4)} · running total ${total.toFixed(4)}`,
          'color:#FFD700;font-weight:bold;'
        );
        // eslint-disable-next-line no-console
        console.log('startTime:', Math.round(entry.startTime), 'ms');
        for (const s of sources) {
          // eslint-disable-next-line no-console
          console.log('  ', s.desc, '  prev:', s.prevRect, '  curr:', s.currRect);
          if (s.preview) console.log('    text:', JSON.stringify(s.preview));
        }
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    });

    try {
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Browser doesn't support layout-shift observer.
      return;
    }

    // Flush a summary after the load event stabilises.
    const summarise = () => {
      // eslint-disable-next-line no-console
      console.log(
        `%c[CLS SUMMARY] total=${total.toFixed(4)} shifts=${shifts.length}`,
        'color:#FFD700;font-weight:bold;font-size:14px;'
      );
      const sorted = shifts
        .map((s, i) => ({ i, value: s.value, first: s.sources[0]?.desc || '(?)' }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      // eslint-disable-next-line no-console
      console.table(sorted);
    };

    const t = setTimeout(summarise, 6000);

    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, []);

  return null;
}

export default CLSDebug;
