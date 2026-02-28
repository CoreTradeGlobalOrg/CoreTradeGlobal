/**
 * My Deals Page
 *
 * Shows all deals where the authenticated user is buyer or seller.
 * Updates in real-time via Firestore listeners (useDeals hook).
 * Supports tab filtering: All / Active / Completed.
 *
 * Route: /deals
 * Auth: requires authenticated user
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Handshake } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useDeals } from '@/presentation/hooks/deal/useDeals';
import { DealList } from '@/presentation/components/features/deal/DealList/DealList';
import { DEAL_STATUS } from '@/core/constants/dealConstants';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES = [DEAL_STATUS.NEGOTIATING];
const COMPLETED_STATUSES = [
  DEAL_STATUS.ACCEPTED,
  DEAL_STATUS.REJECTED,
  DEAL_STATUS.EXPIRED,
  DEAL_STATUS.WITHDRAWN,
];

export default function DealsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { deals, loading: dealsLoading, error } = useDeals();
  const [activeTab, setActiveTab] = useState('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/deals');
    }
  }, [authLoading, isAuthenticated, router]);

  // Filter deals based on active tab
  const filteredDeals = (() => {
    if (activeTab === 'active') {
      return deals.filter((d) => ACTIVE_STATUSES.includes(d.status));
    }
    if (activeTab === 'completed') {
      return deals.filter((d) => COMPLETED_STATUSES.includes(d.status));
    }
    return deals;
  })();

  // Count badges
  const activeBadge = deals.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;

  // ── Loading skeleton ──
  if (authLoading || dealsLoading) {
    return (
      <main className="min-h-screen bg-radial-navy pt-[120px] pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <div className="h-8 w-32 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-radial-navy pt-[120px] pb-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Handshake className="w-7 h-7 text-[#FFD700]" />
              My Deals
            </h1>
            <p className="text-[#64748b] text-sm mt-1">
              {deals.length} deal{deals.length !== 1 ? 's' : ''} in total
            </p>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Tab Filter ── */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                flex items-center gap-2
                ${
                  activeTab === tab.key
                    ? 'bg-[#FFD700] text-[#0F1B2B] shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }
              `}
            >
              {tab.label}
              {tab.key === 'active' && activeBadge > 0 && (
                <span
                  className={`
                    text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center
                    ${activeTab === 'active' ? 'bg-[#0F1B2B] text-[#FFD700]' : 'bg-[rgba(255,215,0,0.2)] text-[#FFD700]'}
                  `}
                >
                  {activeBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Deal List or Empty State ── */}
        {filteredDeals.length > 0 ? (
          <DealList deals={filteredDeals} currentUserId={user?.uid} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.15)] flex items-center justify-center">
              <Handshake className="w-8 h-8 text-[#FFD700] opacity-60" />
            </div>

            {activeTab === 'all' ? (
              <>
                <div>
                  <p className="text-white font-semibold mb-1">No deals yet</p>
                  <p className="text-[#64748b] text-sm">
                    Start a deal from any product conversation.
                  </p>
                </div>
                <Link
                  href="/messages"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Go to Messages
                </Link>
              </>
            ) : (
              <div>
                <p className="text-white font-semibold mb-1">
                  No {activeTab} deals
                </p>
                <p className="text-[#64748b] text-sm">
                  {activeTab === 'active'
                    ? 'All your deals have been completed.'
                    : 'No completed deals found.'}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
