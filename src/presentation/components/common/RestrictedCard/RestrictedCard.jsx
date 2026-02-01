/**
 * RestrictedCard Component
 *
 * Wraps a card/section with blur overlay for non-authenticated users
 * Shows register prompt overlay on top of blurred content
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import Link from 'next/link';
import { Lock, UserPlus, LogIn } from 'lucide-react';

export function RestrictedCard({
  children,
  className = '',
}) {
  const { isAuthenticated, loading } = useAuth();

  // If loading, show skeleton
  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-32 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  // If authenticated, render children normally
  if (isAuthenticated) {
    return <div className={className}>{children}</div>;
  }

  // For non-authenticated users, show blurred card with overlay
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="blur-[6px] pointer-events-none select-none opacity-60">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[#0F1B2B]/60 to-[#0F1B2B]/90 rounded-2xl">
        <div className="text-center px-6 py-8 max-w-sm">
          {/* Lock icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#FFD700]" />
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Link
              href={`/register?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
              className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] !text-black font-semibold text-sm hover:shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Create a free account
            </Link>
            <Link
              href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
              className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Already have an account? Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestrictedCard;
