/**
 * RestrictedActionButton Component
 *
 * Wraps action buttons (Contact Seller, View Profile, Submit Quote)
 * Shows blur overlay with register prompt for non-authenticated users
 * Allows full access for authenticated users
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import Link from 'next/link';
import { Lock, UserPlus, LogIn } from 'lucide-react';

export function RestrictedActionButton({
  children,
  onClick,
  className = '',
  disabled = false,
  ...props
}) {
  const { isAuthenticated, loading } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  // If authenticated, render normal button
  if (loading) {
    return (
      <button
        className={`${className} opacity-50 cursor-wait`}
        disabled
        {...props}
      >
        {children}
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        onClick={onClick}
        className={className}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  // For non-authenticated users, show restricted button with prompt
  return (
    <div className="relative">
      <button
        onClick={() => setShowPrompt(!showPrompt)}
        className={`${className} relative overflow-hidden`}
        {...props}
      >
        {/* Blur overlay on button */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-white/10 z-10 flex items-center justify-center">
          <Lock className="w-4 h-4 text-white/80" />
        </div>
        {/* Original button content (blurred behind) */}
        <div className="opacity-50">
          {children}
        </div>
      </button>

      {/* Popup prompt */}
      {showPrompt && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPrompt(false)}
          />

          {/* Prompt card */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-gradient-to-br from-[#1A283B] to-[#0F1B2B] border border-[#FFD700]/30 rounded-2xl p-5 shadow-2xl shadow-black/50">
              {/* Arrow */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1A283B] border-l border-t border-[#FFD700]/30 rotate-45" />

              {/* Content */}
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#FFD700]" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">Sign Up to Continue</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Create a free account to contact sellers and access all features
                </p>

                {/* Action buttons */}
                <div className="space-y-2">
                  <Link
                    href={`/register?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register Free
                  </Link>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Log In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RestrictedActionButton;
