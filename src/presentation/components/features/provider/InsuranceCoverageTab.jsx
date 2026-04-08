/**
 * InsuranceCoverageTab Component
 *
 * Displays deals where the insurance provider is selected.
 * Each deal shows a "Confirm Coverage" button that calls the
 * confirmInsuranceCoverage Cloud Function.
 *
 * After coverage is confirmed (status == COVERAGE_ACTIVE in shipmentUpdates),
 * the button changes to "Coverage Active" (disabled, green checkmark).
 *
 * Props:
 *   uid  {string} - Authenticated provider UID
 */

'use client';

import { useState } from 'react';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';
import { useActiveShipments } from '@/presentation/hooks/provider/useActiveShipments';
import { SHIPMENT_STATUS } from '@/core/constants/shipmentConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1628] p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-[rgba(255,255,255,0.07)] rounded w-3/4" />
      <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-1/2" />
      <div className="h-8 bg-[rgba(255,255,255,0.05)] rounded-lg w-36 mt-2" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoverageCard — individual deal row
// ─────────────────────────────────────────────────────────────────────────────

function CoverageCard({ shipment, onConfirm, actionLoading }) {
  const { quoteRequest, deal, shipmentUpdates } = shipment;

  const productName =
    deal?.productName ||
    quoteRequest?.dealSnapshot?.productName ||
    'Unnamed Product';

  const buyerName =
    deal?.buyerName ||
    quoteRequest?.dealSnapshot?.buyerName ||
    quoteRequest?.buyerId ||
    '—';

  const sellerName =
    deal?.sellerName ||
    quoteRequest?.dealSnapshot?.sellerName ||
    quoteRequest?.sellerId ||
    '—';

  const dealStatus = deal?.status || '—';

  // Check if coverage has already been confirmed
  const isCoverageActive = (shipmentUpdates || []).some(
    (u) => u.status === SHIPMENT_STATUS.COVERAGE_ACTIVE
  );

  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    if (isCoverageActive || actionLoading || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(quoteRequest.dealId);
    } catch {
      // toast shown by hook
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1822] p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Deal info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{productName}</p>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            {buyerName} → {sellerName}
          </p>
          <p className="text-xs text-[#6A7B8E] mt-1 capitalize">
            Deal status:{' '}
            <span className="text-[#A0A0A0]">{dealStatus.replace(/_/g, ' ')}</span>
          </p>
        </div>

        {/* Coverage action */}
        <div className="flex-shrink-0">
          {isCoverageActive ? (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/20 border border-green-700/40 text-green-400 text-sm font-medium cursor-default">
              <CheckCircle className="w-4 h-4" />
              Coverage Active
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FFD700] text-black text-sm font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Confirm Coverage
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InsuranceCoverageTab
// ─────────────────────────────────────────────────────────────────────────────

export function InsuranceCoverageTab({ uid }) {
  const { shipments, loading, error, actionLoading, confirmCoverage } = useActiveShipments(
    uid,
    'insurance'
  );

  if (error) {
    return (
      <div className="text-center py-12 text-red-400 text-sm">
        Failed to load coverage requests: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && shipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0A1628] border border-[#1E2D3D] flex items-center justify-center">
            <Shield className="w-7 h-7 text-[#4A5B6E]" />
          </div>
          <div>
            <p className="text-white font-medium">No deals requiring coverage confirmation</p>
            <p className="text-[#6A7B8E] text-sm mt-1">
              Deals appear here when a buyer selects your insurance quote.
            </p>
          </div>
        </div>
      )}

      {/* Coverage cards */}
      {!loading && shipments.length > 0 && (
        <div className="space-y-3">
          {shipments.map((s) => (
            <CoverageCard
              key={s.quoteRequest.id}
              shipment={s}
              onConfirm={confirmCoverage}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default InsuranceCoverageTab;
