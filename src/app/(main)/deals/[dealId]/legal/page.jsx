/**
 * Legal Channel Page
 *
 * URL: /deals/[dealId]/legal
 * Auth-protected: redirects to /login if not authenticated.
 * Access check: only engagement participants (client or lawyer) may access.
 *
 * For member (client): uses engagementId = subscribeToEngagementForDeal(dealId, currentUser.uid)
 * For lawyer: uses subscribeToEngagementsForLawyer filtered by dealId
 *
 * Renders the LegalChannel 3-panel layout for active/completed engagements.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { LegalChannel } from '@/presentation/components/features/legal/LegalChannel/LegalChannel';
import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';
import { Scale, ShieldOff, Clock, ArrowLeft } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LegalChannelSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[80px] animate-pulse">
      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-64 bg-[#1A283B] border-r border-[rgba(255,255,255,0.08)]" />
        <div className="flex-1 bg-[#0F1C2E]" />
        <div className="w-64 bg-[#1A283B] border-l border-[rgba(255,255,255,0.08)]" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legal Channel Page (inner — uses useParams)
// ─────────────────────────────────────────────────────────────────────────────

function LegalChannelPageInner() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId;

  const { user, isAuthenticated, loading: authLoading, role } = useAuth();
  const currentUser = user;
  const isLawyerRole = role === 'lawyer';

  const [deal, setDeal] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Load deal and engagement ─────────────────────────────────────────────────
  useEffect(() => {
    if (!dealId || !currentUser?.uid) return;

    setLoadingData(true);

    const dealRepo = container.getDealRepository();
    const legalRepo = container.getLegalEngagementRepository();

    let dealUnsub = null;
    let engagementUnsub = null;

    // Load deal
    dealRepo.getById(dealId).then((dealData) => {
      setDeal(dealData);
    });

    if (isLawyerRole) {
      // Lawyer: subscribe to engagements for this lawyer, filter by dealId
      engagementUnsub = legalRepo.subscribeToEngagementsForLawyer(
        currentUser.uid,
        (engagements) => {
          const match = engagements.find((e) => e.dealId === dealId);
          setEngagement(match || null);
          setLoadingData(false);
        }
      );
    } else {
      // Member (client): deterministic engagement via dealId + currentUser.uid
      engagementUnsub = legalRepo.subscribeToEngagementForDeal(
        dealId,
        currentUser.uid,
        (engagementData) => {
          setEngagement(engagementData);
          setLoadingData(false);
        }
      );
    }

    return () => {
      if (dealUnsub) dealUnsub();
      if (engagementUnsub) engagementUnsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, currentUser?.uid, isLawyerRole]);

  // ── Loading states ─────────────────────────────────────────────────────────
  if (authLoading || (loadingData && !engagement)) {
    return <LegalChannelSkeleton />;
  }

  if (!isAuthenticated) {
    return null; // Redirect in progress
  }

  // ── No engagement found ────────────────────────────────────────────────────
  if (!loadingData && !engagement) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Scale size={48} className="text-[#4A5B6E] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">No Legal Engagement Found</h1>
          <p className="text-sm text-[#8899AA] mb-6">
            There is no legal engagement associated with this deal for your account.
          </p>
          <button
            onClick={() => router.push(`/deals/${dealId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] font-semibold rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Deal
          </button>
        </div>
      </div>
    );
  }

  // ── Pending engagement ─────────────────────────────────────────────────────
  if (engagement && engagement.isPending()) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Clock size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Awaiting Lawyer Acceptance</h1>
          <p className="text-sm text-[#8899AA] mb-2">
            Your hire request has been sent to{' '}
            <span className="text-white font-medium">
              {engagement.lawyerDisplayName || 'the lawyer'}
            </span>
            .
          </p>
          <p className="text-sm text-[#8899AA] mb-6">
            The channel will open once they accept your request.
          </p>
          <button
            onClick={() => router.push(`/deals/${dealId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Deal
          </button>
        </div>
      </div>
    );
  }

  // ── Access guard for non-participants ──────────────────────────────────────
  if (engagement && currentUser?.uid && !engagement.isParticipant(currentUser.uid)) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <ShieldOff size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-[#8899AA] mb-6">
            You are not a participant in this legal engagement.
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

  const isLawyer = engagement ? engagement.isLawyer(currentUser?.uid) : false;
  const isReadOnly = engagement ? engagement.isCompleted() : false;

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <LegalChannel
      engagement={engagement}
      deal={deal}
      currentUser={currentUser}
      isLawyer={isLawyer}
      isReadOnly={isReadOnly}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported page with Suspense boundary (required for useParams in app router)
// ─────────────────────────────────────────────────────────────────────────────

export default function LegalChannelPageRoute() {
  return (
    <Suspense fallback={<LegalChannelSkeleton />}>
      <LegalChannelPageInner />
    </Suspense>
  );
}
