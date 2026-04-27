/**
 * DealSidebar Component
 *
 * Always-visible right sidebar with three sections:
 *   1. Party Info Cards (buyer + seller)
 *   2. Progress Tracker (Negotiation -> Agreement -> Quotes -> Tracking)
 *   3. Current Offer Summary (latest terms, round, whose turn)
 */

'use client';

import { useEffect, useState } from 'react';
import { container } from '@/core/di/container';
import { BadgeCheck, MapPin, Calendar } from 'lucide-react';
import { DEAL_STATUS, PAYMENT_TERMS } from '@/core/constants/dealConstants';
import { getIncotermByCode } from '@/core/constants/incoterms';
import { OrderTimeline } from '@/presentation/components/features/deal/TradeSummary/OrderTimeline';
import { ETACountdown } from '@/presentation/components/features/deal/TradeSummary/ETACountdown';
import { CurrencyConvertPanel } from './CurrencyConvertPanel';
import { FreightEstimatorWidget } from './FreightEstimatorWidget';
import { Tooltip } from '@/presentation/components/common/Tooltip/Tooltip';

// ─────────────────────────────────────────────────────────────────────────────
// Party Info Card
// ─────────────────────────────────────────────────────────────────────────────

function PartyCard({ userData, roleLabel, isCurrentUser, isTurn }) {
  if (!userData) {
    return (
      <div className="bg-[#0F1C2E] rounded-lg p-3 border border-[#2A3B52] animate-pulse">
        <div className="h-3 bg-[#2A3B52] rounded w-24 mb-2" />
        <div className="h-2 bg-[#2A3B52] rounded w-16" />
      </div>
    );
  }

  const name = userData.companyName || userData.displayName || 'Unknown';
  const country = userData.country || userData.location || null;
  const createdAt = userData.createdAt
    ? new Date(userData.createdAt?.toDate?.() || userData.createdAt).getFullYear()
    : null;
  const isVerified = userData.isVerified || userData.verified || false;

  return (
    <div className={`rounded-lg p-3 border transition-colors ${
      isCurrentUser
        ? 'bg-[#FFD700]/5 border-[#FFD700]/30'
        : 'bg-[#0F1C2E] border-[#2A3B52]'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium uppercase tracking-wide ${
              isCurrentUser ? 'text-[#FFD700]' : 'text-[#8899AA]'
            }`}>
              {roleLabel}
            </span>
            {isVerified && <BadgeCheck size={12} className="text-blue-400 flex-shrink-0" />}
            {isTurn && (
              <span className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 px-1.5 py-0.5 rounded-full">
                Their turn
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{name}</p>
        </div>
        {isCurrentUser && (
          <span className="flex-shrink-0 text-xs text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-1.5 py-0.5 rounded-full">
            You
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        {country && (
          <div className="flex items-center gap-1.5 text-xs text-[#8899AA]">
            <MapPin size={10} />
            <span>{country}</span>
          </div>
        )}
        {createdAt && (
          <div className="flex items-center gap-1.5 text-xs text-[#8899AA]">
            <Calendar size={10} />
            <span>Member since {createdAt}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Tracker
// ─────────────────────────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { id: 'negotiation', label: 'Negotiation', description: 'Exchange offers' },
  { id: 'agreement', label: 'Agreement', description: 'Sign contract' },
  { id: 'quotes', label: 'Quotes', description: 'Shipping & insurance' },
  { id: 'tracking', label: 'Tracking', description: 'Delivery tracking' },
];

function ProgressTracker({ dealStatus }) {
  const isTerminal = [
    DEAL_STATUS.ACCEPTED,
    DEAL_STATUS.REJECTED,
    DEAL_STATUS.EXPIRED,
    DEAL_STATUS.WITHDRAWN,
    DEAL_STATUS.CONTRACT_APPROVED,
    DEAL_STATUS.PROVIDERS_SELECTED,
  ].includes(dealStatus);

  const getActiveStep = (status) => {
    if (status === DEAL_STATUS.PROVIDERS_SELECTED) return 'tracking';
    if (status === DEAL_STATUS.CONTRACT_APPROVED) return 'quotes';
    if (status === DEAL_STATUS.ACCEPTED) return 'agreement';
    return 'negotiation';
  };
  const activeStep = getActiveStep(dealStatus);

  return (
    <div className="relative">
      {PROGRESS_STEPS.map((step, index) => {
        const isActive = step.id === activeStep;
        const isPast = index < PROGRESS_STEPS.findIndex((s) => s.id === activeStep);
        const isLast = index === PROGRESS_STEPS.length - 1;

        return (
          <div key={step.id} className="flex gap-3">
            {/* Connector */}
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                isPast
                  ? 'bg-emerald-600 border-emerald-600'
                  : isActive
                  ? 'bg-[#FFD700] border-[#FFD700]'
                  : 'bg-[#0F1C2E] border-[#2A3B52]'
              }`}>
                {isPast ? (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0F1C2E]' : 'bg-[#3A4B62]'}`} />
                )}
              </div>
              {!isLast && (
                <div className={`w-px flex-1 my-0.5 ${isPast ? 'bg-emerald-600' : 'bg-[#2A3B52]'}`} style={{ minHeight: '20px' }} />
              )}
            </div>

            {/* Step info */}
            <div className="pb-4">
              <p className={`text-xs font-medium ${
                isActive ? 'text-[#FFD700]' : isPast ? 'text-emerald-400' : 'text-[#4A5B6E]'
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-[#4A5B6E]">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Current Offer Summary
// ─────────────────────────────────────────────────────────────────────────────

function OfferSummary({ deal, latestOffer }) {
  if (!latestOffer && !deal?.latestOfferSnapshot) return null;

  const snapshot = latestOffer || deal?.latestOfferSnapshot;
  const currency = snapshot?.currency || 'USD';

  function fmt(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  }

  const incotermMeta = getIncotermByCode(snapshot?.incoterm);
  const paymentLabel = PAYMENT_TERMS.find((p) => p.value === snapshot?.paymentTerms)?.label || snapshot?.paymentTerms || '—';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899AA]">Round</span>
        <span className="text-xs font-semibold text-white">Round {deal?.round || 1}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899AA]">Estimated Total</span>
        <span className="text-sm font-bold text-[#FFD700]">
          {fmt(snapshot?.estimatedTotal ?? (snapshot?.price * snapshot?.quantity))}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899AA]">Price × Qty</span>
        <span className="text-xs text-white">
          {fmt(snapshot?.price)} × {snapshot?.quantity}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-[#8899AA]">
          Incoterm
          <Tooltip content="Incoterms define which party bears the cost and risk of shipping. Common terms: FOB (seller delivers to port), CIF (seller covers insurance + freight), DAP (seller delivers to destination)." />
        </span>
        <span className="text-xs text-white">{snapshot?.incoterm || '—'}</span>
      </div>
      {snapshot?.namedPlace && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8899AA]">{incotermMeta?.namedPlaceLabel || 'Named Place'}</span>
          <span className="text-xs text-white truncate max-w-[120px]">{snapshot.namedPlace}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899AA]">Payment</span>
        <span className="text-xs text-white">{paymentLabel}</span>
      </div>

      {/* Whose turn */}
      {deal?.status === DEAL_STATUS.NEGOTIATING && (
        <div className="mt-2 pt-2 border-t border-[#2A3B52]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse" />
            <span className="text-xs text-[#FFD700]">
              {deal.currentTurnUid === deal.buyerId ? 'Buyer' : 'Seller'}&rsquo;s turn to respond
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DealSidebar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DealSidebar
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Offer').Offer|null} props.latestOffer
 * @param {string} props.currentUserUid
 * @param {boolean} [props.otherPartyViewing] - Presence indicator
 * @param {import('@/domain/entities/ShipmentUpdate').ShipmentUpdate[]} [props.shipmentUpdates] - Optional pre-fetched shipment updates
 */
export function DealSidebar({ deal, latestOffer, currentUserUid, otherPartyViewing, shipmentUpdates: propShipmentUpdates }) {
  const [buyerData, setBuyerData] = useState(null);
  const [sellerData, setSellerData] = useState(null);
  const [ownShipmentUpdates, setOwnShipmentUpdates] = useState([]);

  // Determine if this sidebar needs to show the timeline
  const showTimeline = deal && [
    DEAL_STATUS.CONTRACT_APPROVED,
    DEAL_STATUS.PROVIDERS_SELECTED,
    DEAL_STATUS.DELIVERED,
  ].includes(deal.status);

  // Use prop-provided updates if available; otherwise self-subscribe when timeline is visible
  const shipmentUpdates = propShipmentUpdates ?? ownShipmentUpdates;

  useEffect(() => {
    if (!deal) return;

    const userRepo = container.getUserRepository();

    // Fetch both parties' data
    Promise.all([
      userRepo.getById(deal.buyerId),
      userRepo.getById(deal.sellerId),
    ]).then(([buyer, seller]) => {
      setBuyerData(buyer);
      setSellerData(seller);
    }).catch((err) => {
      console.error('DealSidebar: failed to fetch party data', err);
    });
  }, [deal?.buyerId, deal?.sellerId]);

  // Self-subscribe to shipment updates when showing timeline and no prop data provided
  useEffect(() => {
    if (!showTimeline || propShipmentUpdates !== undefined || !deal?.id) return;

    const shipmentRepo = container.getShipmentRepository();
    const unsub = shipmentRepo.subscribeToShipmentUpdates(deal.id, currentUserUid, (updates) => {
      setOwnShipmentUpdates(updates);
    });
    return () => unsub();
  }, [showTimeline, propShipmentUpdates, deal?.id, currentUserUid]);

  if (!deal) return null;

  const isBuyer = deal.buyerId === currentUserUid;
  const isSeller = deal.sellerId === currentUserUid;

  const buyerTurn = deal.currentTurnUid === deal.buyerId && deal.status === DEAL_STATUS.NEGOTIATING;
  const sellerTurn = deal.currentTurnUid === deal.sellerId && deal.status === DEAL_STATUS.NEGOTIATING;

  // Other party data for presence label
  const otherPartyData = isBuyer ? sellerData : buyerData;
  const otherPartyName = otherPartyData?.companyName || otherPartyData?.displayName || 'other party';

  return (
    <div className="space-y-4">
      {/* Presence indicator */}
      {otherPartyViewing && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/10 border border-emerald-700/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-xs text-emerald-400">{otherPartyName} is viewing this deal</span>
        </div>
      )}

      {/* Party Info Cards */}
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wide mb-3">Parties</h4>
        <div className="space-y-2">
          <PartyCard
            userData={buyerData}
            roleLabel="Buyer"
            isCurrentUser={isBuyer}
            isTurn={buyerTurn && !isBuyer}
          />
          <PartyCard
            userData={sellerData}
            roleLabel="Seller"
            isCurrentUser={isSeller}
            isTurn={sellerTurn && !isSeller}
          />
        </div>
      </div>

      {/* Progress Tracker / Order Timeline */}
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
        {showTimeline ? (
          <>
            <h4 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wide mb-3">Order Timeline</h4>
            <OrderTimeline deal={deal} shipmentUpdates={shipmentUpdates} dealId={deal.id} />
            {deal.shipmentEtaDate && (
              <div className="mt-3">
                <ETACountdown etaDate={deal.shipmentEtaDate} />
              </div>
            )}
          </>
        ) : (
          <>
            <h4 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wide mb-3">Progress</h4>
            <ProgressTracker dealStatus={deal.status} />
          </>
        )}
      </div>

      {/* Current Offer Summary */}
      <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-[#8899AA] uppercase tracking-wide mb-3">Current Terms</h4>
        <OfferSummary deal={deal} latestOffer={latestOffer} />
      </div>

      {/* Currency Conversion */}
      {(() => {
        const snapshot = latestOffer || deal?.latestOfferSnapshot;
        return (
          <CurrencyConvertPanel
            price={snapshot?.price}
            currency={snapshot?.currency}
            quantity={snapshot?.quantity}
            estimatedTotal={snapshot?.estimatedTotal ?? (snapshot?.price * snapshot?.quantity)}
          />
        );
      })()}

      {/* Freight Estimator */}
      <FreightEstimatorWidget deal={deal} latestOffer={latestOffer} />
    </div>
  );
}

export default DealSidebar;
