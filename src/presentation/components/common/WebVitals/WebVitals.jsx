/**
 * Web Vitals Reporter
 *
 * Subscribes to Next.js Core Web Vitals events (LCP, INP, CLS, FCP, TTFB) and
 * logs them to the console in development. In production this component is
 * silent by default — Speed Insights already collects field data via the
 * <SpeedInsights /> component mounted alongside it in the root layout.
 */

'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
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
