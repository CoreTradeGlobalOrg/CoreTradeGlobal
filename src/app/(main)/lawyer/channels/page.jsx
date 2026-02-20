/**
 * Lawyer Client Channels - Placeholder
 *
 * URL: /lawyer/channels
 * Access: lawyer, admin (enforced by middleware)
 *
 * Full implementation in Phase 5.
 */

'use client';

import Link from 'next/link';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { RoleBadge } from '@/presentation/components/common/RoleBadge/RoleBadge';

export default function LawyerChannelsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-radial-navy pt-[100px] pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Back link */}
        <Link
          href="/lawyer"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Client Channels</h1>
          {user && <RoleBadge role={user.role} size="md" />}
        </div>

        {/* Placeholder */}
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Coming in Phase 5</h2>
          <p className="text-[#A0A0A0] text-sm max-w-md mx-auto">
            Client channels — secure communication with clients who have hired you for legal services — will be available in Phase 5.
          </p>
        </div>

      </div>
    </div>
  );
}
