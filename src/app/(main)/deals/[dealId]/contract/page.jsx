/**
 * Contract Review Page
 *
 * URL: /deals/[dealId]/contract
 * Auth-protected: redirects to /login if not authenticated.
 * Access check: only buyer or seller may view; others see "Access Denied".
 * Status check: only valid for 'accepted' and 'contract_approved' deals.
 *
 * Renders the ContractPage with real-time dual-party approval tracking.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useDeal } from '@/presentation/hooks/deal/useDeal';
import { useContract } from '@/presentation/hooks/contract/useContract';
import { useContractActions } from '@/presentation/hooks/contract/useContractActions';
import { ContractPage } from '@/presentation/components/features/contract/ContractPage/ContractPage';
import { DEAL_STATUS } from '@/core/constants/dealConstants';
import { ShieldOff, FileQuestion } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function ContractSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[var(--navbar-height)] p-4 sm:p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-20 bg-[#1A283B] rounded-xl" />
        <div className="h-14 bg-[#1A283B] rounded-xl" />
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <div className="h-32 bg-[#1A283B] rounded-xl" />
            <div className="h-32 bg-[#1A283B] rounded-xl" />
            <div className="h-32 bg-[#1A283B] rounded-xl" />
          </div>
          <div className="w-80 space-y-4">
            <div className="h-40 bg-[#1A283B] rounded-xl" />
            <div className="h-32 bg-[#1A283B] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract Page Route (inner — uses useParams)
// ─────────────────────────────────────────────────────────────────────────────

function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const currentUid = user?.uid ?? null;

  // Load deal + contract in parallel
  const { deal, loading: dealLoading } = useDeal(dealId, currentUid);
  const { contract, loading: contractLoading } = useContract(dealId);

  // Contract actions (clause toggle, draft save, submit)
  const actions = useContractActions(dealId, contract, currentUid, deal);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Redirect if deal status is not contract-related ────────────────────────
  useEffect(() => {
    if (
      deal &&
      deal.status !== DEAL_STATUS.ACCEPTED &&
      deal.status !== DEAL_STATUS.CONTRACT_APPROVED
    ) {
      router.replace(`/deals/${dealId}`);
    }
  }, [deal, dealId, router]);

  // ── Loading states ─────────────────────────────────────────────────────────
  if (authLoading || dealLoading) {
    return <ContractSkeleton />;
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
    <ContractPage
      deal={deal}
      contract={contract}
      currentUserUid={currentUid}
      actions={actions}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported page with Suspense boundary (required for useParams in app router)
// ─────────────────────────────────────────────────────────────────────────────

export default function ContractPageRoute() {
  return (
    <Suspense fallback={<ContractSkeleton />}>
      <ContractDetailPage />
    </Suspense>
  );
}
