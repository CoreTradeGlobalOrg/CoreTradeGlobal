/**
 * GeneratingContractOverlay Component
 *
 * Animated loading skeleton shown when the contract document has not yet
 * been generated (deal is 'accepted' but contract/main does not exist yet).
 *
 * The onDealAccepted Cloud Function has a 1.5s deliberate delay, so there
 * is always a brief window (longer on cold start) where this overlay shows.
 * No timeout error — the contract will appear via onSnapshot when ready.
 */

'use client';

import { FileText } from 'lucide-react';

export function GeneratingContractOverlay() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[calc(var(--navbar-height)+24px)] pb-6 px-4 sm:px-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header skeleton */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#1A283B]" />
            <div className="flex-1">
              <div className="h-4 bg-[#1A283B] rounded w-48 mb-2" />
              <div className="h-3 bg-[#1A283B] rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-3 bg-[#1A283B] rounded" />
            <div className="h-3 bg-[#1A283B] rounded" />
            <div className="h-3 bg-[#1A283B] rounded" />
          </div>
        </div>

        {/* Generating status banner */}
        <div className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/5 px-4 py-3 flex items-center gap-3">
          <FileText size={16} className="text-[#FFD700] animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#FFD700]">Generating contract...</p>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Preparing your contract clauses from the accepted offer terms.
            </p>
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div className="h-3 bg-[#1A283B] rounded w-24 mb-3" />
          <div className="space-y-2">
            <div className="h-2 bg-[#1A283B] rounded-full" />
            <div className="h-2 bg-[#1A283B] rounded-full w-3/4" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Clause accordion skeletons */}
          <div className="flex-1 min-w-0 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-[#1A283B] rounded w-36" />
                  <div className="h-4 w-4 bg-[#1A283B] rounded" />
                </div>
                <div className="space-y-3">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-start gap-3 py-2 border-t border-white/5">
                      <div className="h-3 bg-[#1A283B] rounded flex-1" />
                      <div className="flex gap-3">
                        <div className="w-5 h-5 bg-[#1A283B] rounded" />
                        <div className="w-5 h-5 bg-[#1A283B] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar skeleton */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="h-4 bg-[#1A283B] rounded w-32 mb-4" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center py-2 border-t border-white/5">
                  <div className="h-3 bg-[#1A283B] rounded w-24" />
                  <div className="h-3 bg-[#1A283B] rounded w-20" />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="h-4 bg-[#1A283B] rounded w-36 mb-4" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 bg-[#1A283B] rounded mb-2" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeneratingContractOverlay;
