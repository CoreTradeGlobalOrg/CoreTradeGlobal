/**
 * Provider Dashboard Page
 *
 * URL: /provider/dashboard
 * Access: logistics_provider, insurance_provider, admin (enforced by middleware)
 *
 * Shows two tabs:
 *   1. "Quote Requests" — kanban board of incoming quote requests (existing behavior)
 *   2. "Active Shipments" — shipment tracking / insurance coverage confirmation (new)
 *
 * Default tab: Quote Requests (preserves existing behavior).
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Shield, Truck } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useQuoteRequests } from '@/presentation/hooks/quote/useQuoteRequests';
import { ProviderDashboard } from '@/presentation/components/features/provider/ProviderDashboard/ProviderDashboard';
import { ActiveShipmentsTab } from '@/presentation/components/features/provider/ActiveShipmentsTab';
import { InsuranceCoverageTab } from '@/presentation/components/features/provider/InsuranceCoverageTab';
import { ROLES } from '@/core/constants/roles';

const TABS = [
  { id: 'quoteRequests', label: 'Quote Requests' },
  { id: 'activeShipments', label: 'Active Shipments' },
];

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
        {/* Tab skeleton */}
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
          <div className="h-9 w-36 bg-[rgba(255,255,255,0.04)] rounded-lg animate-pulse" />
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
  const [activeTab, setActiveTab] = useState('quoteRequests');

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

  // Determine provider type from role (admin sees logistics view by default)
  const providerType = user.role === ROLES.INSURANCE_PROVIDER ? 'insurance' : 'logistics';
  const isInsurance = providerType === 'insurance';

  return (
    <main className="min-h-screen bg-radial-navy pt-[100px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-[#FFD700]" />
              Provider Dashboard
            </h1>
            <p className="text-[#A0A0A0] mt-1 text-sm">
              Manage your quote requests and active shipments
            </p>
          </div>
          {/* Provider type badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
            isInsurance
              ? 'bg-orange-900/20 border-orange-700/40 text-orange-400'
              : 'bg-green-900/20 border-green-700/40 text-green-400'
          }`}>
            {isInsurance ? (
              <Shield className="w-4 h-4" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            {isInsurance ? 'Insurance Provider' : 'Logistics Provider'}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-[#1E2D3D]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0A1628] border border-b-0 border-[#1E2D3D] text-white'
                  : 'text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'quoteRequests' && (
          <ProviderDashboard
            columns={columns}
            loading={requestsLoading}
            providerType={providerType}
            providerUid={user.uid}
            embedded
          />
        )}

        {activeTab === 'activeShipments' && (
          isInsurance ? (
            <InsuranceCoverageTab uid={user.uid} />
          ) : (
            <ActiveShipmentsTab uid={user.uid} />
          )
        )}

      </div>
    </main>
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
