/**
 * Settings Page Orchestrator
 *
 * Shell layout for user account settings.
 * Plans 02 and 03 will replace the placeholder sections with real sub-components.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { ArrowLeft, Bell, AlertTriangle, User } from 'lucide-react';
import { SecuritySection } from './SecuritySection';

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

        {/* Security Section — password change + 2FA */}
        <SecuritySection />

        {/* Notifications Section placeholder — Plan 02 will replace */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1 h-5 bg-yellow-500 rounded-full"></span>
            <Bell className="w-5 h-5 text-[#A0A0A0]" />
            <h3 className="text-lg font-bold text-white">Notifications</h3>
          </div>
          <p className="text-[#A0A0A0] text-sm">
            Email and push notification preferences.
          </p>
        </div>

        {/* Danger Zone placeholder — Plan 03 will replace */}
        <div className="glass-card p-6 border border-red-900/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1 h-5 bg-red-500 rounded-full"></span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
          </div>
          <p className="text-[#A0A0A0] text-sm">Account deletion and logout.</p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
