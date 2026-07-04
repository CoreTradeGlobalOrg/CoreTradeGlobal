/**
 * Web Vitals Reporter
 *
 * Subscribes to Next.js Core Web Vitals events (LCP, INP, CLS, FCP, TTFB)
 * so a future sink (internal /api/vitals endpoint, Datadog RUM, custom
 * beacon, …) can forward them. Silent by default — Speed Insights
 * collects the field-data version via the <SpeedInsights /> component in
 * the root layout, so this file only needs the subscription hook.
 */

'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals(() => {
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
