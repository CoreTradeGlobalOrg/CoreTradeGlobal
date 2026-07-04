/**
 * Web Vitals Reporter
 *
 * Subscribes to Next.js Core Web Vitals events (LCP, INP, CLS, FCP, TTFB) and
 * logs them to the console in development. In production this component is
 * silent by default — Speed Insights already collects field data via the
 * <SpeedInsights /> component mounted alongside it in the root layout.
 */

'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  // Dev-only per-shift logger. useReportWebVitals gives us the aggregate
  // CLS number; this exposes each individual layout-shift entry with the
  // source element(s) that actually moved, plus previous/current rects.
  // Read the console output as: "[CLS shift] +0.087 …" — one line per
  // browser-reported shift, in time order. Remove this block once the
  // regression is chased down.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof PerformanceObserver === 'undefined') return;

    const describe = (node) => {
      if (!node) return '(no node — anonymous shift)';
      const tag = node.tagName ? node.tagName.toLowerCase() : '#text';
      const id = node.id ? `#${node.id}` : '';
      const cls = node.className && typeof node.className === 'string'
        ? '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
      return `${tag}${id}${cls}`;
    };

    const rectStr = (r) => r
      ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`
      : 'null';

    let cumulative = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        cumulative += entry.value;
        const srcLines = (entry.sources || []).map(
          (s) => `  → ${describe(s.node)}  ${rectStr(s.previousRect)}  →  ${rectStr(s.currentRect)}`
        ).join('\n');
        // eslint-disable-next-line no-console
        console.log(
          `[CLS] +${entry.value.toFixed(4)} (total ${cumulative.toFixed(4)}) @${Math.round(entry.startTime)}ms\n${srcLines || '  (no source info)'}`
        );
        // Also stash raw sources on window for easy DevTools inspection
        if (typeof window !== 'undefined') {
          window.__lastCLS = window.__lastCLS || [];
          window.__lastCLS.push({ value: entry.value, at: entry.startTime, sources: entry.sources });
        }
      }
    });

    try {
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // browser without layout-shift support — ignore
    }

    // Independent poll — logs body/document height + footer bounding rect
    // every 100ms for the first 3s. Catches the "footer sitting at y=396
    // then jumping" pattern by capturing the frames the LayoutShift API
    // fires between.
    const start = performance.now();
    const poll = setInterval(() => {
      const t = Math.round(performance.now() - start);
      const footer = document.querySelector('footer.footer-section');
      const homepage = document.querySelector('.homepage');
      const body = document.body;
      const nav = document.querySelector('nav.navbar');
      // eslint-disable-next-line no-console
      console.log(
        `[layout @${t}ms] body=${body?.offsetHeight ?? '?'} doc=${document.documentElement.scrollHeight}`,
        `nav=${nav?.offsetHeight ?? '?'}`,
        `.homepage=${homepage?.offsetHeight ?? '?'}`,
        `footer.y=${footer ? Math.round(footer.getBoundingClientRect().top + window.scrollY) : '?'}`,
        `footer.h=${footer?.offsetHeight ?? '?'}`
      );
      if (performance.now() - start > 3000) clearInterval(poll);
    }, 100);

    return () => {
      observer.disconnect();
      clearInterval(poll);
    };
  }, []);

  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[web-vitals] ${metric.name}`, {
        value: Math.round(metric.value * 100) / 100,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    }

    // TODO: forward metrics to a custom sink (e.g. an internal /api/vitals
    // endpoint, Google Analytics, Datadog RUM, or a logging pipeline).
    //
    // Example — POST as a beacon so it survives page unload:
    //
    //   const body = JSON.stringify({
    //     name: metric.name,
    //     value: metric.value,
    //     rating: metric.rating,
    //     id: metric.id,
    //     page: window.location.pathname,
    //   });
    //   if (navigator.sendBeacon) {
    //     navigator.sendBeacon('/api/vitals', body);
    //   } else {
    //     fetch('/api/vitals', { body, method: 'POST', keepalive: true });
    //   }
  });

  return null;
}

export default WebVitals;
