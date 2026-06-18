/**
 * Complete Profile Page
 *
 * URL: /complete-profile
 * Shown to OAuth users (Google/LinkedIn) after first sign-in to collect the
 * required business details. Redirects away (in an effect) when there is no
 * user or the profile is already complete.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { CompleteProfileForm } from '@/presentation/components/features/auth/CompleteProfileForm/CompleteProfileForm';

export default function CompleteProfilePage() {
  const { user, loading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.push('/login');
    } else if (user.profileComplete) {
      router.push('/');
    }
  }, [user, loading, profileLoading, router]);

  if (loading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    );
  }

  if (!user || user.profileComplete) {
    return null;
  }

  return <CompleteProfileForm />;
}
