/**
 * Edit Request Page
 *
 * URL: /request/[requestId]/edit
 * Standalone replacement for the former "Edit Request" modal. Only the request
 * owner or an admin may edit; others are redirected away.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useUpdateRequest } from '@/presentation/hooks/request/useUpdateRequest';
import { container } from '@/core/di/container';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { FormPageShell } from '@/presentation/components/common/FormPageShell/FormPageShell';

export default function EditRequestPage() {
  const router = useRouter();
  const { requestId } = useParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { updateRequest } = useUpdateRequest();

  const [request, setRequest] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=/request/${requestId}/edit`);
    }
  }, [authLoading, isAuthenticated, requestId, router]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid || !requestId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await container.getRequestRepository().getById(requestId);
        if (cancelled) return;
        if (!data) {
          toast.error('Request not found.');
          router.replace(`/profile/${user.uid}`);
          return;
        }
        const isAdmin = user.role === 'admin';
        if (data.userId !== user.uid && !isAdmin) {
          router.replace('/forbidden');
          return;
        }
        setRequest(data);
      } catch (err) {
        console.error('EditRequestPage fetch error:', err);
        toast.error('Failed to load request.');
        router.replace(`/profile/${user.uid}`);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.uid, user?.role, requestId, router]);

  if (authLoading || loadingData || !request) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    );
  }

  const ownerId = request.userId;
  const isAdmin = user.role === 'admin' && user.uid !== ownerId;
  const profileHref = `/profile/${ownerId}`;

  const handleSubmit = async (data) => {
    try {
      await updateRequest(request.id, ownerId, data, { isAdmin });
      toast.success('Request updated!');
      router.push(profileHref);
    } catch {
      /* hook surfaces the error */
    }
  };

  return (
    <FormPageShell title="Edit Request" backHref={profileHref} backLabel="Back to profile">
      <RequestForm
        request={request}
        onSubmit={handleSubmit}
        onCancel={() => router.push(profileHref)}
        userId={ownerId}
      />
    </FormPageShell>
  );
}
