/**
 * LawyerDashboard Component
 *
 * Full dashboard for lawyers showing all legal engagements grouped by status.
 * Sections:
 *   1. Pending Requests (amber) — Accept/Decline actions
 *   2. Active Engagements (green) — Open Channel links
 *   3. Completed (gray, collapsible) — View Channel links
 *
 * Uses:
 *   - useLegalEngagements: real-time engagement subscriptions
 *   - useLegalActions: accept/decline Cloud Function calls
 */

'use client';

import { useState } from 'react';
import { Scale, Inbox, Users, CheckSquare, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useLegalEngagements } from '@/presentation/hooks/legal/useLegalEngagements';
import { useLegalActions } from '@/presentation/hooks/legal/useLegalActions';
import { EngagementCard } from './EngagementCard';

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className="text-current" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-[#8899AA]">{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, count, colorClass, collapsible, isOpen, onToggle }) {
  return (
    <div
      className={`flex items-center gap-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
      onClick={collapsible ? onToggle : undefined}
    >
      <h2 className={`text-sm font-semibold uppercase tracking-wider ${colorClass}`}>
        {title}
      </h2>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass} bg-current/10`}>
        {count}
      </span>
      {collapsible && (
        <span className="ml-auto text-[#8899AA]">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B] p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)]" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-32 bg-[rgba(255,255,255,0.06)] rounded" />
          <div className="h-2 w-20 bg-[rgba(255,255,255,0.04)] rounded" />
        </div>
        <div className="h-5 w-16 bg-[rgba(255,255,255,0.06)] rounded-full" />
      </div>
      <div className="h-2 w-40 bg-[rgba(255,255,255,0.04)] rounded" />
      <div className="flex gap-2">
        <div className="h-7 flex-1 bg-[rgba(255,255,255,0.06)] rounded-lg" />
        <div className="h-7 flex-1 bg-[rgba(255,255,255,0.06)] rounded-lg" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LawyerDashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LawyerDashboard
 *
 * @param {Object} props
 * @param {string} props.lawyerUid - UID of the current lawyer user
 */
export function LawyerDashboard({ lawyerUid }) {
  const {
    engagements,
    pendingEngagements,
    activeEngagements,
    completedEngagements,
    loading,
  } = useLegalEngagements(lawyerUid);

  const { respondToHireRequest, loading: actionLoading } = useLegalActions();

  const [completedOpen, setCompletedOpen] = useState(false);

  const handleAccept = async (engagementId) => {
    await respondToHireRequest(engagementId, 'accept');
  };

  const handleDecline = async (engagementId) => {
    await respondToHireRequest(engagementId, 'decline');
  };

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[calc(var(--navbar-height)+24px)] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
            <Scale size={20} className="text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Legal Dashboard</h1>
            <p className="text-sm text-[#8899AA]">Manage your client engagements</p>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value={engagements.length}
              icon={Users}
              colorClass="bg-[rgba(255,255,255,0.06)] text-[#8899AA]"
            />
            <StatCard
              label="Active"
              value={activeEngagements.length}
              icon={Scale}
              colorClass="bg-green-500/10 text-green-400"
            />
            <StatCard
              label="Pending"
              value={pendingEngagements.length}
              icon={Clock}
              colorClass="bg-amber-500/10 text-amber-400"
            />
            <StatCard
              label="Completed"
              value={completedEngagements.length}
              icon={CheckSquare}
              colorClass="bg-[rgba(255,255,255,0.06)] text-[#8899AA]"
            />
          </div>
        )}

        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            <div className="h-4 w-32 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Pending Requests */}
            <div className="space-y-3">
              <SectionHeader
                title="Pending Requests"
                count={pendingEngagements.length}
                colorClass="text-amber-400"
              />
              {pendingEngagements.length === 0 ? (
                <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B]/50 p-6 text-center">
                  <Inbox size={24} className="text-[#8899AA] mx-auto mb-2" />
                  <p className="text-sm text-[#8899AA]">No pending requests</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingEngagements.map((engagement) => (
                    <EngagementCard
                      key={engagement.id}
                      engagement={engagement}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Active Engagements */}
            <div className="space-y-3">
              <SectionHeader
                title="Active Engagements"
                count={activeEngagements.length}
                colorClass="text-green-400"
              />
              {activeEngagements.length === 0 ? (
                <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B]/50 p-6 text-center">
                  <Users size={24} className="text-[#8899AA] mx-auto mb-2" />
                  <p className="text-sm text-[#8899AA]">No active engagements</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeEngagements.map((engagement) => (
                    <EngagementCard
                      key={engagement.id}
                      engagement={engagement}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Completed Engagements (collapsible) */}
            <div className="space-y-3">
              <SectionHeader
                title="Completed"
                count={completedEngagements.length}
                colorClass="text-[#8899AA]"
                collapsible
                isOpen={completedOpen}
                onToggle={() => setCompletedOpen((prev) => !prev)}
              />
              {completedOpen && (
                completedEngagements.length === 0 ? (
                  <div className="rounded-xl border border-[#2A3B52] bg-[#1A283B]/50 p-6 text-center">
                    <CheckSquare size={24} className="text-[#8899AA] mx-auto mb-2" />
                    <p className="text-sm text-[#8899AA]">No completed engagements</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {completedEngagements.map((engagement) => (
                      <EngagementCard
                        key={engagement.id}
                        engagement={engagement}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default LawyerDashboard;
