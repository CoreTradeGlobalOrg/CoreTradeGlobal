/**
 * Settings Page Route
 *
 * URL: /settings
 * Protected route - requires authentication (see middleware.js)
 * Thin shell with Suspense boundary wrapping the main SettingsPage component
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const SettingsPage = dynamic(
  () =>
    import(
      '@/presentation/components/features/settings/SettingsPage/SettingsPage'
    ).then((mod) => mod.SettingsPage),
  { ssr: false }
);

function SettingsLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#A0A0A0] text-sm">Loading...</span>
      </div>
    </div>
  );
}

export default function SettingsPageRoute() {
  return (
    <Suspense fallback={<SettingsLoadingFallback />}>
      <SettingsPage />
    </Suspense>
  );
}
