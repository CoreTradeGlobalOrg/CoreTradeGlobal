/**
 * InstrumentationStack
 *
 * Client-only wrapper that lazy-loads the five pieces of the analytics /
 * observability / toast stack. All are pure telemetry or on-demand UI —
 * none contribute to first paint or to LCP element rendering, so they
 * belong outside the initial JS bundle.
 *
 * `dynamic({ ssr: false })` requires a client-component parent, which is
 * why this file exists as a thin shim above the server-component
 * src/app/layout.js. The shim itself is tiny (a few hundred bytes) so
 * static-importing it from layout.js is fine; the payload sits inside
 * each lazy chunk and only fetches after hydration.
 *
 * WebVitals sends CWV metrics up — deferred to after hydration is fine
 * (Web Vitals API queues events from the moment the page loads, not
 * from the moment this component mounts).
 *
 * Toaster is only needed once a toast fires; keeping it out of the
 * initial bundle saves react-hot-toast's ~7 KiB gzip.
 */

'use client';

import dynamic from 'next/dynamic';

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => ({ default: m.SpeedInsights })),
  { ssr: false }
);

const Analytics = dynamic(
  () => import('@vercel/analytics/next').then((m) => ({ default: m.Analytics })),
  { ssr: false }
);

const WebVitals = dynamic(
  () =>
    import('@/presentation/components/common/WebVitals/WebVitals').then((m) => ({
      default: m.WebVitals,
    })),
  { ssr: false }
);

const AnalyticsTracker = dynamic(
  () =>
    import('@/presentation/components/common/AnalyticsTracker/AnalyticsTracker').then((m) => ({
      default: m.AnalyticsTracker,
    })),
  { ssr: false }
);

const Toaster = dynamic(
  () => import('react-hot-toast').then((m) => ({ default: m.Toaster })),
  { ssr: false }
);

export function InstrumentationHead() {
  return (
    <>
      <WebVitals />
      <SpeedInsights />
      <Analytics />
    </>
  );
}

export function InstrumentationTail() {
  return (
    <>
      <AnalyticsTracker />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: {
            duration: 3000,
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </>
  );
}
