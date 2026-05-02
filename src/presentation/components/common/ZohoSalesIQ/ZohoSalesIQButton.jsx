'use client';

/**
 * ZohoSalesIQButton Component
 *
 * Standalone floating chat button shown on public pages where the FAB
 * MessagesWidget is not present (i.e., unauthenticated visitors).
 *
 * Only renders when NEXT_PUBLIC_ZOHO_WIDGET_KEY is configured.
 * Calls window.$zoho.salesiq.floatwindow.visible('show') on click.
 */

import { Headphones } from 'lucide-react';

const ZOHO_WIDGET_KEY = process.env.NEXT_PUBLIC_ZOHO_WIDGET_KEY;

export function ZohoSalesIQButton() {
  // Don't render if widget key is not configured
  if (!ZOHO_WIDGET_KEY) {
    return null;
  }

  const handleClick = () => {
    if (typeof window === 'undefined') return;

    if (window.$zoho?.salesiq) {
      window.$zoho.salesiq.floatwindow.visible('show');
    } else {
      // Zoho script hasn't loaded yet — show a gentle hint
      // Use a native browser toast-like notification since we don't have
      // a toast library available at this level without adding a dependency
      console.warn('[ZohoSalesIQ] Chat not ready yet. Please try again.');
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Open support chat"
      className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] !text-black shadow-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] flex items-center justify-center transition-all duration-300 hover:scale-105"
    >
      <Headphones className="w-6 h-6" />
    </button>
  );
}

export default ZohoSalesIQButton;
