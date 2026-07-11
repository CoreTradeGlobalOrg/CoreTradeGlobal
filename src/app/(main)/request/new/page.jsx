/**
 * Add Request Page
 *
 * URL: /request/new
 * Standalone replacement for the former "Create Request" modal. Requires login;
 * creates a request (RFQ) for the current user, then returns to their profile.
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { FormPageShell } from '@/presentation/components/common/FormPageShell/FormPageShell';

function NewRequestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const { createRequest } = useCreateRequest();

  // Zero-result product search → "Post an RFQ for '{query}'" CTA links
  // here with ?title={query}. Seed the form's productName field so the
  // user lands on a partly-filled RFQ instead of a blank one.
  const prefillTitle = (searchParams.get('title') || '').slice(0, 200);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?redirect=/request/new');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    );
  }

  const profileHref = `/profile/${user.uid}`;

  const handleSubmit = async (data) => {
    try {
      await createRequest(data);
      toast.success('Request created!');
      router.push(profileHref);
    } catch {
      /* hook surfaces the error */
    }
  };

  return (
    <FormPageShell title="Create New Request" backHref={profileHref} backLabel="Back to profile">
      <RequestForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(profileHref)}
        userId={user.uid}
        request={prefillTitle ? { productName: prefillTitle } : undefined}
      />
    </FormPageShell>
  );
}

// Wrapper adds the Suspense boundary Next.js requires around
// useSearchParams so the page keeps its `'use client'` semantics
// without triggering the CSR-bailout warning during static analysis.
export default function NewRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    }>
      <NewRequestPageInner />
    </Suspense>
  );
}
