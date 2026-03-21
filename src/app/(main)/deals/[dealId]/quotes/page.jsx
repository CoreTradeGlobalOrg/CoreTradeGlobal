/**
 * Quotes Comparison Page
 *
 * URL: /deals/[dealId]/quotes
 * Auth-protected: redirects to /login if not authenticated.
 * Access check: only deal buyer or seller may view.
 * Status check: only valid for 'contract_approved' and 'providers_selected' deals.
 *
 * Renders the QuotesPage with real-time insurance and logistics quote comparison.
 * Both buyer and seller can view; only the buyer can select providers.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useDeal } from '@/presentation/hooks/deal/useDeal';
import { useQuotesForDeal } from '@/presentation/hooks/quote/useQuotesForDeal';
import { useQuoteActions } from '@/presentation/hooks/quote/useQuoteActions';
import { QuotesPage } from '@/presentation/components/features/quote/QuotesPage/QuotesPage';
import { DEAL_STATUS } from '@/core/constants/dealConstants';
import { ShieldOff, FileQuestion } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function QuotesSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[120px] p-4 sm:p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-20 bg-[#1A283B] rounded-xl" />
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-[#1A283B] rounded-xl w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-48 bg-[#1A283B] rounded-xl" />
              <div className="h-48 bg-[#1A283B] rounded-xl" />
            </div>
            <div className="h-8 bg-[#1A283B] rounded-xl w-48 mt-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-48 bg-[#1A283B] rounded-xl" />
              <div className="h-48 bg-[#1A283B] rounded-xl" />
            </div>
          </div>
          <div className="w-80 space-y-4">
            <div className="h-40 bg-[#1A283B] rounded-xl" />
            <div className="h-48 bg-[#1A283B] rounded-xl" />
            <div className="h-16 bg-[#1A283B] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quotes Page Route (inner — uses useParams)
// ─────────────────────────────────────────────────────────────────────────────

function QuotesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const currentUid = user?.uid ?? null;

  // Load deal data
  const { deal, loading: dealLoading } = useDeal(dealId, currentUid);

  // Load quotes data (real-time two-level subscription)
  const {
    quoteRequests,
    insuranceQuotes,
    logisticsQuotes,
    selectedInsuranceQuote,
    selectedLogisticsQuote,
    loading: quotesLoading,
  } = useQuotesForDeal(dealId, currentUid);

  // Quote action handlers
  const actions = useQuoteActions();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Deal status guard — only valid for quote-phase deals ───────────────────
  useEffect(() => {
    if (
      deal &&
      deal.status !== DEAL_STATUS.CONTRACT_APPROVED &&
      deal.status !== DEAL_STATUS.PROVIDERS_SELECTED
    ) {
      router.replace(`/deals/${dealId}`);
    }
  }, [deal, dealId, router]);

  // ── Loading states ─────────────────────────────────────────────────────────
  if (authLoading || dealLoading) {
    return <QuotesSkeleton />;
  }

  if (!isAuthenticated) {
    return null; // Redirect in progress
  }

  // ── 404 — deal not found ───────────────────────────────────────────────────
  if (!deal && !dealLoading) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <FileQuestion size={48} className="text-[#4A5B6E] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Deal Not Found</h1>
          <p className="text-sm text-[#8899AA] mb-6">
            This deal does not exist or may have been removed.
          </p>
          <button
            onClick={() => router.push('/deals')}
            className="px-4 py-2 bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] font-semibold rounded-lg transition-colors text-sm"
          >
            View My Deals
          </button>
        </div>
      </div>
    );
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (deal && currentUid) {
    const isParticipant = deal.isParticipant?.(currentUid) ??
      (deal.buyerId === currentUid || deal.sellerId === currentUid);

    if (!isParticipant) {
      return (
        <div className="min-h-screen bg-[#0F1C2E] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <ShieldOff size={48} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
            <p className="text-sm text-[#8899AA] mb-6">
              You are not a participant in this deal.
            </p>
            <button
              onClick={() => router.push('/deals')}
              className="px-4 py-2 bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] font-semibold rounded-lg transition-colors text-sm"
            >
              View My Deals
            </button>
          </div>
        </div>
      );
    }
  }

  const isBuyer = currentUid === deal?.buyerId;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <QuotesPage
      deal={deal}
      insuranceQuotes={insuranceQuotes}
      logisticsQuotes={logisticsQuotes}
      selectedInsuranceQuote={selectedInsuranceQuote}
      selectedLogisticsQuote={selectedLogisticsQuote}
      quoteRequests={quoteRequests}
      currentUserUid={currentUid}
      actions={actions}
      isBuyer={isBuyer}
      loading={quotesLoading}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported page with Suspense boundary (required for useParams in app router)
// ─────────────────────────────────────────────────────────────────────────────

export default function QuotesPageRoute() {
  return (
    <Suspense fallback={<QuotesSkeleton />}>
      <QuotesDetailPage />
    </Suspense>
  );
}
