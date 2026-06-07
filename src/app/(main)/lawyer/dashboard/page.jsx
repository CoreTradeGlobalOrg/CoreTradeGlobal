/**
 * Lawyer Dashboard Page
 *
 * URL: /lawyer/dashboard
 * Access: lawyer, admin (enforced by middleware)
 *
 * Shows all legal engagements grouped by status (pending, active, completed).
 * Replaces the Phase 1 placeholder page.
 */

'use client';

import { useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { ROLES } from '@/core/constants/roles';

const LawyerDashboard = dynamic(
  () => import('@/presentation/components/features/legal/LawyerDashboard/LawyerDashboard').then(m => ({ default: m.LawyerDashboard })),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[calc(var(--navbar-height)+24px)] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-44 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
            <div className="h-3 w-56 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.06)] animate-pulse flex-shrink-0" />
              <div className="space-y-1">
                <div className="h-5 w-8 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
                <div className="h-2 w-16 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Card skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-32 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-32 bg-[rgba(255,255,255,0.06)] rounded" />
                    <div className="h-2 w-20 bg-[rgba(255,255,255,0.04)] rounded" />
                  </div>
                </div>
                <div className="h-2 w-40 bg-[rgba(255,255,255,0.04)] rounded" />
                <div className="flex gap-2">
                  <div className="h-7 flex-1 bg-[rgba(255,255,255,0.06)] rounded-lg" />
                  <div className="h-7 flex-1 bg-[rgba(255,255,255,0.06)] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner content — uses hooks requiring Suspense context
// ─────────────────────────────────────────────────────────────────────────────

function LawyerDashboardContent() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/lawyer/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  // Role guard: redirect to forbidden if not a lawyer or admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role !== ROLES.LAWYER && user.role !== ROLES.ADMIN) {
      router.push('/forbidden');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Show skeleton while auth is loading
  if (authLoading || !isAuthenticated || !user) {
    return <DashboardSkeleton />;
  }

  // Access denied state (will redirect, but show fallback while navigating)
  if (user.role !== ROLES.LAWYER && user.role !== ROLES.ADMIN) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] pt-[calc(var(--navbar-height)+24px)] flex items-center justify-center">
        <p className="text-[#8899AA] text-sm">Access denied. Redirecting...</p>
      </div>
    );
  }

  return <LawyerDashboard lawyerUid={user.uid} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — Suspense boundary for app router compatibility
// ─────────────────────────────────────────────────────────────────────────────

export default function LawyerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LawyerDashboardContent />
    </Suspense>
  );
}
