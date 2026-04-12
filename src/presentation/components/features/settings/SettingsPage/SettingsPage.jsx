/**
 * Settings Page Orchestrator
 *
 * Full settings page with all sections:
 *   1. SecuritySection   — password change + 2FA (Plan 02)
 *   2. NotificationsSection — 5-category email/push toggles (Plan 03)
 *   3. EmailSubscriptionsSection — marketing email opt-in/out (Plan 03)
 *   4. DangerSection     — logout + account deletion (Plan 03)
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { ArrowLeft, User } from 'lucide-react';
import { SecuritySection } from './SecuritySection';
import { NotificationsSection } from './NotificationsSection';
import { EmailSubscriptionsSection } from './EmailSubscriptionsSection';
import { DangerSection } from './DangerSection';

export function SettingsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#A0A0A0] text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-radial-navy pt-28 pb-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back to Profile link */}
        <Link
          href={`/profile/${user.uid}`}
          className="text-[#A0A0A0] hover:text-white text-sm flex items-center gap-1 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        {/* Compact user header */}
        <div className="flex items-center gap-4">
          {user.companyLogo || user.photoURL ? (
            <img
              src={user.companyLogo || user.photoURL}
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover object-center border-2 border-[#FFD700] flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-[#0F1B2B]" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {user.companyName || user.displayName}
            </h1>
            <p className="text-sm text-[#A0A0A0]">{user.email}</p>
          </div>
        </div>

        {/* 1. Security Section — password change + 2FA */}
        <SecuritySection />

        {/* 2. Notifications Section — 5-category email/push toggles */}
        <NotificationsSection />

        {/* 3. Email Subscriptions Section — marketing email opt-in/out */}
        <EmailSubscriptionsSection />

        {/* 4. Danger Zone — logout + account deletion */}
        <DangerSection />
      </div>
    </div>
  );
}

export default SettingsPage;
