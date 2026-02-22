/**
 * Deal Negotiation Page
 *
 * URL: /deals/[dealId]
 * Auth-protected: redirects to /login if not authenticated.
 * Access check: only buyer or seller may view; others see "Access Denied".
 *
 * Renders DealPage with real-time offer timeline and counter-offer flow.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useDeal } from '@/presentation/hooks/deal/useDeal';
import { useDealActions } from '@/presentation/hooks/deal/useDealActions';
import { useDealPresence } from '@/presentation/hooks/deal/useDealPresence';
import { DealPage } from '@/presentation/components/features/deal/DealPage/DealPage';
import { ShieldOff, FileQuestion } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function DealSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] p-4 sm:p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-20 bg-[#1A283B] rounded-xl" />
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <div className="h-64 bg-[#1A283B] rounded-xl" />
            <div className="h-48 bg-[#1A283B] rounded-xl" />
          </div>
          <div className="w-80 space-y-4">
            <div className="h-40 bg-[#1A283B] rounded-xl" />
            <div className="h-32 bg-[#1A283B] rounded-xl" />
            <div className="h-24 bg-[#1A283B] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Page Route
// ─────────────────────────────────────────────────────────────────────────────

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const currentUid = user?.uid ?? null;
  const { deal, offers, loading: dealLoading, error } = useDeal(dealId, currentUid);
  const actions = useDealActions();
  const { otherPartyViewing } = useDealPresence(dealId, deal);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Loading states ─────────────────────────────────────────────────────────
  if (authLoading || dealLoading) {
    return <DealSkeleton />;
  }

  if (!isAuthenticated) {
    return null; // Redirect in progress
  }

  // ── 404 — deal not found ───────────────────────────────────────────────────
  if (!deal && !dealLoading && !error) {
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

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <ShieldOff size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Unable to Load Deal</h1>
          <p className="text-sm text-[#8899AA] mb-6">{error}</p>
          <button
            onClick={() => router.push('/deals')}
            className="px-4 py-2 bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] font-semibold rounded-lg transition-colors text-sm"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  // ── Access denied — user is neither buyer nor seller ───────────────────────
  if (deal && currentUid) {
    const isParticipant =
      deal.buyerId === currentUid || deal.sellerId === currentUid;
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

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <DealPage
      deal={deal}
      offers={offers}
      currentUserUid={currentUid}
      actions={actions}
      otherPartyViewing={otherPartyViewing}
    />
  );
}
