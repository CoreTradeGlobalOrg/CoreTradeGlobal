'use client';

import { useSyncExternalStore } from 'react';
import { isPageSettled, subscribePageSettled } from '@/lib/pageSettled';

/**
 * true once the page has loaded and gone quiet, or the visitor has
 * scrolled / tapped / typed. Always false during SSR and hydration.
 * See src/lib/pageSettled.js.
 */
export function usePageSettled() {
  return useSyncExternalStore(subscribePageSettled, isPageSettled, () => false);
}
