'use client';

/**
 * DeferredAnalytics
 *
 * Loads gtag.js (~177 KiB) and the Clarity tag once the page has settled
 * (src/lib/pageSettled.js: load + 3 s + idle, or the first scroll / tap /
 * key) instead of right after `load`, so on a slow phone they never compete
 * with the first screen. Trade-off, accepted on 2026-10-21: a visit that
 * leaves within ~3.5 s without touching the page is not recorded.
 *
 * The `gtag()` and `clarity()` queues are defined inline in the root
 * layout's <head>, so calls made before this mounts (page_view config,
 * identifyClarity) are kept and replayed when the real tags arrive.
 */

import Script from 'next/script';
import { usePageSettled } from '@/presentation/hooks/usePageSettled';

export function DeferredAnalytics({ gaId, clarityId }) {
  const settled = usePageSettled();
  if (!settled) return null;
  return (
    <>
      {gaId && (
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      )}
      {clarityId && <Script src={`https://www.clarity.ms/tag/${clarityId}`} strategy="afterInteractive" />}
    </>
  );
}
