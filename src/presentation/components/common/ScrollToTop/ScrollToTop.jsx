'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    // Use instant scroll to avoid smooth scroll animation on page change
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
