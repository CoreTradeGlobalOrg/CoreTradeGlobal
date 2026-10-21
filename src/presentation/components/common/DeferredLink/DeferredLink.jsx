'use client';

/**
 * DeferredLink
 *
 * next/link with prefetching held back until the page has settled
 * (src/lib/pageSettled.js). Next prefetches every visible <Link> right
 * after hydration; on the homepage that was ~25 route requests plus the
 * /register and /request/new form bundles (~150 KiB) racing the page's own
 * images and data on a slow phone, and Lighthouse charged all of it to LCP.
 * Once settled the links behave exactly like next/link (viewport and hover
 * prefetch, or whatever `prefetch` was passed).
 *
 * Drop-in: `import Link from '@/presentation/components/common/DeferredLink/DeferredLink'`.
 */

import Link from 'next/link';
import { usePageSettled } from '@/presentation/hooks/usePageSettled';

export default function DeferredLink({ prefetch, ...props }) {
  const settled = usePageSettled();
  return <Link {...props} prefetch={settled ? prefetch : false} />;
}
