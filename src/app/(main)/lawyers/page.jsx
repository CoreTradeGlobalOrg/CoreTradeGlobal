/**
 * Lawyers Directory Page
 *
 * URL: /lawyers
 * Access: authenticated users
 *
 * Browse and filter available legal professionals.
 * Phase 5: Legal Consulting - Plan 03
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { LawyerDirectory } from '@/presentation/components/features/legal/LawyerDirectory/LawyerDirectory';
import { LEGAL_SUPPORT_ENABLED } from '@/core/constants/featureFlags';

function LawyersPageContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  // Feature paused — bounce anyone landing here (bookmark, external link)
  // back to the homepage instead of exposing an in-progress screen.
  useEffect(() => {
    if (!LEGAL_SUPPORT_ENABLED) {
      router.replace('/');
    }
  }, [router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!LEGAL_SUPPORT_ENABLED) return;
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/lawyers');
    }
  }, [authLoading, isAuthenticated, router]);

  if (!LEGAL_SUPPORT_ENABLED) return null;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-radial-navy">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto" />
          <p className="mt-4 text-[#A0A0A0]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <LawyerDirectory dealId={dealId} />;
}

export default function LawyersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-radial-navy">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto" />
            <p className="mt-4 text-[#A0A0A0]">Loading...</p>
          </div>
        </div>
      }
    >
      <LawyersPageContent />
    </Suspense>
  );
}
