/**
 * Lawyer Deal Review - Placeholder
 *
 * URL: /lawyer/deals
 * Access: lawyer, admin (enforced by middleware)
 *
 * Full implementation in Phase 5.
 */

'use client';

import Link from 'next/link';
import { FileSearch, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { RoleBadge } from '@/presentation/components/common/RoleBadge/RoleBadge';

export default function LawyerDealsPage() {
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
          <h1 className="text-3xl font-bold text-white">Deal Review</h1>
          {user && <RoleBadge role={user.role} size="md" />}
        </div>

        {/* Placeholder */}
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
            <FileSearch className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Coming in Phase 5</h2>
          <p className="text-[#A0A0A0] text-sm max-w-md mx-auto">
            Deal review — reviewing trade deals and providing legal analysis for clients — will be available in Phase 5.
          </p>
        </div>

      </div>
    </div>
  );
}
