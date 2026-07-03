/**
 * Add Request Page
 *
 * URL: /request/new
 * Standalone replacement for the former "Create Request" modal. Requires login;
 * creates a request (RFQ) for the current user, then returns to their profile.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { FormPageShell } from '@/presentation/components/common/FormPageShell/FormPageShell';

export default function NewRequestPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const { createRequest } = useCreateRequest();

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
      />
    </FormPageShell>
  );
}
