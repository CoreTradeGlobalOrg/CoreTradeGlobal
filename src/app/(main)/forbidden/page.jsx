/**
 * Forbidden Page
 *
 * Shown when a user tries to access a route they don't have permission for.
 * Displays the user's current role so they understand why access was denied.
 */

'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { ROLE_DISPLAY_NAMES, ROLES } from '@/core/constants/roles';

export default function ForbiddenPage() {
  const { user, loading } = useAuth();

  const roleDisplay =
    user?.role
      ? ROLE_DISPLAY_NAMES[user.role] || user.role
      : ROLE_DISPLAY_NAMES[ROLES.MEMBER];

  return (
    <div className="min-h-screen bg-radial-navy flex items-center justify-center px-4">
      <div className="glass-card p-10 max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-[#A0A0A0] text-base leading-relaxed">
            You don&apos;t have permission to view this page.
          </p>
        </div>

        {/* Role context */}
        {!loading && (
          <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-5 py-4">
            <p className="text-sm text-[#A0A0A0]">
              Your current role is{' '}
              <span className="font-semibold text-white">{roleDisplay}</span>.
              This page requires a different role.
            </p>
          </div>
        )}

        {/* Return link */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#FFD700] !text-[#0F1B2B] font-bold text-sm hover:bg-white transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
