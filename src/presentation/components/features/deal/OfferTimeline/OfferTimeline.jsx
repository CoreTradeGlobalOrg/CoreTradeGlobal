/**
 * OfferTimeline Component
 *
 * Card-based offer history displayed in chronological order (round ascending).
 * Features:
 *   - Buyer (green) / Seller (gold) / System (dashed) card types
 *   - Changed-field highlighting (compare each offer to the previous)
 *   - Collapse logic: if > 4 offers, show last 3 expanded; earlier collapsed with toggle
 *   - System event cards for deal initiation and terminal states
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OfferCard, SystemCard } from '../OfferCard/OfferCard';
import { DEAL_STATUS } from '@/core/constants/dealConstants';

const COLLAPSE_THRESHOLD = 4;  // Start collapsing when > 4 offers
const VISIBLE_RECENT = 3;       // Always show last 3 expanded

/**
 * OfferTimeline
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Offer').Offer[]} props.offers - Sorted by round ascending
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {string} props.currentUserUid
 * @param {{ acceptOffer: Function, rejectOffer: Function, withdrawOffer: Function, loading: boolean }} props.actions
 * @param {Object} [props.buyerData]
 * @param {Object} [props.sellerData]
 */
export function OfferTimeline({
  offers,
  deal,
  currentUserUid,
  actions,
  buyerData,
  sellerData,
}) {
  const [showEarlier, setShowEarlier] = useState(false);

  if (!deal) return null;

  const totalOffers = offers.length;
  const shouldCollapse = totalOffers > COLLAPSE_THRESHOLD;
  const collapseCount = shouldCollapse ? totalOffers - VISIBLE_RECENT : 0;

  // Determine which offers are "visible" when collapsed
  function isVisible(index) {
    if (!shouldCollapse || showEarlier) return true;
    return index >= totalOffers - VISIBLE_RECENT;
  }

  // Terminal state card type
  const terminalType =
    deal.status === DEAL_STATUS.ACCEPTED ? 'accepted'
    : deal.status === DEAL_STATUS.REJECTED ? 'rejected'
    : deal.status === DEAL_STATUS.EXPIRED ? 'expired'
    : deal.status === DEAL_STATUS.WITHDRAWN ? 'withdrawn'
    : null;

  return (
    <div className="space-y-3">
      {/* Deal Initiated system card */}
      <SystemCard type="initiated" timestamp={deal.createdAt} />

      {/* Collapse toggle — shown above earlier offers */}
      {shouldCollapse && !showEarlier && (
        <button
          onClick={() => setShowEarlier(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#8899AA] hover:text-white border border-dashed border-[#2A3B52] rounded-lg hover:border-[#3A4B62] transition-colors"
        >
          <ChevronDown size={14} />
          Show earlier offers ({collapseCount})
        </button>
      )}

      {/* Hide earlier button */}
      {shouldCollapse && showEarlier && (
        <button
          onClick={() => setShowEarlier(false)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#8899AA] hover:text-white border border-dashed border-[#2A3B52] rounded-lg hover:border-[#3A4B62] transition-colors"
        >
          <ChevronUp size={14} />
          Hide earlier offers
        </button>
      )}

      {/* Offer cards */}
      {offers.map((offer, index) => {
        if (!isVisible(index)) return null;

        const previousOffer = index > 0 ? offers[index - 1] : null;
        const isLatest = index === totalOffers - 1;

        return (
          <div key={offer.id} className="relative">
            {/* Connector line between cards (except before first) */}
            {index > 0 && isVisible(index - 1) && (
              <div className="absolute left-6 -top-3 w-px h-3 bg-[#2A3B52]" />
            )}
            <OfferCard
              offer={offer}
              previousOffer={previousOffer}
              deal={deal}
              currentUserUid={currentUserUid}
              isLatest={isLatest}
              actions={actions}
              buyerData={buyerData}
              sellerData={sellerData}
            />
          </div>
        );
      })}

      {/* Terminal state card (deal outcome) */}
      {terminalType && (
        <div className="relative">
          <div className="absolute left-6 -top-3 w-px h-3 bg-[#2A3B52]" />
          <SystemCard
            type={terminalType}
            timestamp={deal.updatedAt}
          />
        </div>
      )}
    </div>
  );
}

export default OfferTimeline;
