/**
 * Notifications Page Route
 *
 * URL: /notifications
 * Protected route - requires authentication (see middleware.js)
 * Thin shell loading the full NotificationCenterPage component.
 */

'use client';

import dynamic from 'next/dynamic';

const NotificationCenterPage = dynamic(
  () =>
    import(
      '@/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterPage'
    ).then((mod) => mod.NotificationCenterPage),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[rgba(255,215,0,0.3)] border-t-[#FFD700] rounded-full animate-spin" />
      </div>
    ),
  }
);

export default function NotificationsPage() {
  return <NotificationCenterPage />;
}
