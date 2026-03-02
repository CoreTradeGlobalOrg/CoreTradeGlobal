/**
 * Provider Dashboard Page
 *
 * URL: /provider/dashboard
 * Access: logistics_provider, insurance_provider, admin (enforced by middleware)
 *
 * Shows a kanban-style view of all incoming quote requests grouped by status.
 * Providers can view deal info, submit quotes, decline requests, and withdraw quotes.
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useQuoteRequests } from '@/presentation/hooks/quote/useQuoteRequests';
import { ProviderDashboard } from '@/presentation/components/features/provider/ProviderDashboard/ProviderDashboard';
import { ROLES } from '@/core/constants/roles';

/**
 * Loading skeleton for the provider dashboard.
 */
function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-radial-navy pt-[100px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
            <div className="h-4 w-80 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          </div>
          <div className="h-8 w-32 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
        </div>
        {/* Kanban skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="h-32 bg-[rgba(255,255,255,0.04)] rounded-xl animate-pulse border border-[rgba(255,255,255,0.06)]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/**
 * Inner content — uses useAuth which requires Suspense context.
 */
function ProviderDashboardContent() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const PROVIDER_ROLES = [ROLES.INSURANCE_PROVIDER, ROLES.LOGISTICS_PROVIDER, ROLES.ADMIN];

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/provider/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  // Role guard: redirect to forbidden if not a provider or admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !PROVIDER_ROLES.includes(user.role)) {
      router.push('/forbidden');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const { columns, loading: requestsLoading } = useQuoteRequests(
    isAuthenticated && user ? user.uid : null
  );

  // Show skeleton while auth or data is loading
  if (authLoading || !isAuthenticated || !user) {
    return <DashboardSkeleton />;
  }

  // Determine provider type from role (admin sees insurance view by default)
  const providerType = user.role === ROLES.INSURANCE_PROVIDER ? 'insurance' : 'logistics';

  return (
    <ProviderDashboard
      columns={columns}
      loading={requestsLoading}
      providerType={providerType}
      providerUid={user.uid}
    />
  );
}

/**
 * Provider Dashboard Page
 * Wrapped in Suspense for useSearchParams compatibility with Next.js app router.
 */
export default function ProviderDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ProviderDashboardContent />
    </Suspense>
  );
}
