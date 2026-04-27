/**
 * Lawyer Deal Review Page
 *
 * URL: /lawyer/deals
 * Access: lawyer, admin (enforced by middleware)
 *
 * Shows all confirmed (active + completed) engagements in a deal-centric list.
 * Pending engagements are excluded — they have not been accepted yet.
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { LawyerDeals } from '@/presentation/components/features/legal/LawyerDeals/LawyerDeals';
import { ROLES } from '@/core/constants/roles';

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton (page-level)
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[var(--navbar-height)] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-36 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
            <div className="h-3 w-52 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-36 bg-[rgba(255,255,255,0.06)] rounded" />
                  <div className="h-2 w-24 bg-[rgba(255,255,255,0.04)] rounded" />
                </div>
              </div>
              <div className="h-2 w-32 bg-[rgba(255,255,255,0.04)] rounded" />
              <div className="h-7 w-28 bg-[rgba(255,255,255,0.06)] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner content — uses hooks requiring Suspense context
// ─────────────────────────────────────────────────────────────────────────────

function LawyerDealsContent() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/lawyer/deals');
    }
  }, [authLoading, isAuthenticated, router]);

  // Role guard: redirect to forbidden if not a lawyer or admin
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user &&
      user.role !== ROLES.LAWYER &&
      user.role !== ROLES.ADMIN
    ) {
      router.push('/forbidden');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Show skeleton while auth is loading
  if (authLoading || !isAuthenticated || !user) {
    return <PageSkeleton />;
  }

  // Access denied state (will redirect, but show fallback while navigating)
  if (user.role !== ROLES.LAWYER && user.role !== ROLES.ADMIN) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] pt-[var(--navbar-height)] flex items-center justify-center">
        <p className="text-[#8899AA] text-sm">Access denied. Redirecting...</p>
      </div>
    );
  }

  return <LawyerDeals />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — Suspense boundary for app router compatibility
// ─────────────────────────────────────────────────────────────────────────────

export default function LawyerDealsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LawyerDealsContent />
    </Suspense>
  );
}
