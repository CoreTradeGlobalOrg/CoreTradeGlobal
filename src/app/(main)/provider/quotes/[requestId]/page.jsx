/**
 * Provider Quote Detail Page
 *
 * URL: /provider/quotes/[requestId]
 * Access: logistics_provider, insurance_provider, admin (enforced by middleware)
 *
 * Loads a single QuoteRequest by ID and renders the QuoteDetailView.
 * Enables deep linking, browser back button, and URL-based navigation.
 */

'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useQuoteRequest } from '@/presentation/hooks/quote/useQuoteRequest';
import { useQuoteForRequest } from '@/presentation/hooks/quote/useQuoteForRequest';
import { QuoteDetailView } from '@/presentation/components/features/provider/QuoteDetailView/QuoteDetailView';
import { ProviderQuoteChatSidebar } from '@/presentation/components/features/quote/ProviderQuoteChatSidebar/ProviderQuoteChatSidebar';
import { ROLES } from '@/core/constants/roles';

/**
 * Loading skeleton for the quote detail page — single-column layout.
 */
function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back nav skeleton */}
        <div className="h-5 w-40 bg-[rgba(255,255,255,0.07)] rounded animate-pulse" />
        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-[rgba(255,255,255,0.04)] rounded-xl animate-pulse border border-[rgba(255,255,255,0.06)]" />
          <div className="h-96 bg-[rgba(255,255,255,0.04)] rounded-xl animate-pulse border border-[rgba(255,255,255,0.06)]" />
        </div>
      </div>
    </main>
  );
}

/**
 * Error state when the quote request document is not found.
 */
function RequestNotFound({ onBack }) {
  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-white text-lg font-medium mb-2">Quote request not found</p>
          <p className="text-[#8899AA] text-sm mb-6">
            This quote request may have been removed or you may not have access to it.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1E2D3D] border border-[#2A3B52] rounded-lg hover:bg-[#2A3B52] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

/**
 * Inner content component — loads request data and renders QuoteDetailView.
 */
function QuoteDetailContent({ params }) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, profileLoading } = useAuth();

  // Unwrap async params using React.use() per Next.js app router convention
  const resolvedParams = React.use(params);
  const requestId = resolvedParams.requestId;

  const PROVIDER_ROLES = [ROLES.INSURANCE_PROVIDER, ROLES.LOGISTICS_PROVIDER, ROLES.ADMIN];

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/provider/quotes/${requestId}`);
    }
  }, [authLoading, isAuthenticated, router, requestId]);

  // Role guard: redirect to forbidden if not a provider or admin.
  // Waits for `profileLoading` — otherwise on hard refresh `user.role`
  // is briefly `undefined` (Firestore hydration hasn't finished) and the
  // provider/admin user gets wrongly bounced to /forbidden.
  useEffect(() => {
    if (
      !authLoading &&
      !profileLoading &&
      isAuthenticated &&
      user &&
      !PROVIDER_ROLES.includes(user.role)
    ) {
      router.push('/forbidden');
    }
  }, [authLoading, profileLoading, isAuthenticated, user, router]);

  const { request, loading: requestLoading, error: requestError } = useQuoteRequest(
    isAuthenticated && user ? requestId : null
  );

  const { quote: existingQuote, loading: quoteLoading } = useQuoteForRequest(
    isAuthenticated && user ? requestId : null,
    user ? user.uid : null
  );

  const handleBack = () => router.push('/provider/dashboard');

  // Show skeleton while auth, profile, or request data is loading — do
  // not render content while role is unresolved.
  if (authLoading || profileLoading || !isAuthenticated || !user || requestLoading) {
    return <DetailSkeleton />;
  }

  // Show error state if request not found
  if (requestError || !request) {
    return <RequestNotFound onBack={handleBack} />;
  }

  // Derive provider type from role (admin sees insurance view by default)
  const providerType = user.role === ROLES.INSURANCE_PROVIDER ? 'insurance' : 'logistics';

  // dealId, buyerId, sellerId come from the quote request
  const dealId = request?.dealId || null;
  const buyerId = request?.buyerId || null;
  const sellerId = request?.sellerId || null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main quote detail content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <QuoteDetailView
          request={request}
          providerType={providerType}
          onBack={handleBack}
          existingQuote={quoteLoading ? null : existingQuote}
        />
      </div>

      {/* Chat sidebar — only shown when we have deal context */}
      {dealId && buyerId && sellerId && (
        <div
          className="hidden xl:flex"
          style={{ paddingTop: 'var(--navbar-height)', height: '100vh', position: 'sticky', top: 0 }}
        >
          <ProviderQuoteChatSidebar
            dealId={dealId}
            buyerId={buyerId}
            sellerId={sellerId}
            providerId={user.uid}
            providerType={providerType}
            currentUserId={user.uid}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Provider Quote Detail Page
 * Wrapped in Suspense for useSearchParams compatibility with Next.js app router.
 */
export default function ProviderQuoteDetailPage({ params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <QuoteDetailContent params={params} />
    </Suspense>
  );
}
