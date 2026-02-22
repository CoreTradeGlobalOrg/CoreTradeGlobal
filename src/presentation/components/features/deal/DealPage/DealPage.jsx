/**
 * DealPage Component
 *
 * Main deal negotiation layout orchestrating all sub-components.
 * Desktop: two-column (main ~70%, sidebar ~30%).
 * Mobile: single column (stacks vertically).
 *
 * Structure:
 *   ProductHero (full width, top)
 *   CountdownTimer (below hero)
 *   [Main column] OfferTimeline + CounterOfferForm
 *   [Right sidebar] DealSidebar
 */

'use client';

import { ProductHero } from '../ProductHero/ProductHero';
import { OfferTimeline } from '../OfferTimeline/OfferTimeline';
import { CounterOfferForm } from '../CounterOfferForm/CounterOfferForm';
import { DealSidebar } from '../DealSidebar/DealSidebar';
import { CountdownTimer } from '../CountdownTimer/CountdownTimer';
import { DEAL_STATUS } from '@/core/constants/dealConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Terminal State Banner
// ─────────────────────────────────────────────────────────────────────────────

function TerminalBanner({ status }) {
  const configs = {
    [DEAL_STATUS.ACCEPTED]: {
      label: 'Deal Accepted',
      sub: 'Both parties have agreed on the terms. Contract generation is in progress.',
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-700/50',
      text: 'text-emerald-400',
    },
    [DEAL_STATUS.REJECTED]: {
      label: 'Deal Rejected',
      sub: 'This deal was rejected. No further actions are available.',
      bg: 'bg-red-900/20',
      border: 'border-red-700/50',
      text: 'text-red-400',
    },
    [DEAL_STATUS.EXPIRED]: {
      label: 'Deal Expired',
      sub: 'The offer expired without a response.',
      bg: 'bg-[#1A283B]',
      border: 'border-[#2A3B52]',
      text: 'text-[#8899AA]',
    },
    [DEAL_STATUS.WITHDRAWN]: {
      label: 'Deal Withdrawn',
      sub: 'An offer was withdrawn. This deal is now closed.',
      bg: 'bg-[#1A283B]',
      border: 'border-[#2A3B52]',
      text: 'text-[#8899AA]',
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
      <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</p>
      <p className="text-xs text-[#8899AA] mt-0.5">{cfg.sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DealPage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DealPage
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Offer').Offer[]} props.offers
 * @param {string} props.currentUserUid
 * @param {{ submitCounterOffer: Function, acceptOffer: Function, rejectOffer: Function, withdrawOffer: Function, loading: boolean }} props.actions
 * @param {boolean} [props.otherPartyViewing]
 */
export function DealPage({ deal, offers, currentUserUid, actions, otherPartyViewing }) {
  if (!deal) return null;

  const isTerminal = deal.isTerminal?.() ?? [
    DEAL_STATUS.ACCEPTED,
    DEAL_STATUS.REJECTED,
    DEAL_STATUS.EXPIRED,
    DEAL_STATUS.WITHDRAWN,
  ].includes(deal.status);

  // Latest offer for pre-fill and sidebar summary
  const latestOffer = offers.length > 0 ? offers[offers.length - 1] : null;

  // Other party info for counter-offer waiting message
  const isBuyer = deal.buyerId === currentUserUid;
  const otherPartyUid = isBuyer ? deal.sellerId : deal.buyerId;

  return (
    <div className="min-h-screen bg-[#0F1C2E] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Product Hero — full width */}
        <ProductHero deal={deal} />

        {/* Countdown timer */}
        {latestOffer?.expiresAt && !isTerminal && (
          <CountdownTimer expiresAt={latestOffer.expiresAt} />
        )}

        {/* Terminal banner (when deal is closed) */}
        {isTerminal && <TerminalBanner status={deal.status} />}

        {/* Main content + sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Offer Timeline */}
            <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">
                Negotiation History
                <span className="ml-2 text-xs text-[#8899AA] font-normal">
                  {offers.length} round{offers.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <OfferTimeline
                offers={offers}
                deal={deal}
                currentUserUid={currentUserUid}
                actions={actions}
              />
            </div>

            {/* Counter-Offer Form (or waiting message) */}
            {!isTerminal && (
              <CounterOfferForm
                deal={deal}
                latestOffer={latestOffer}
                currentUserUid={currentUserUid}
                actions={actions}
                otherPartyData={null}
              />
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <DealSidebar
              deal={deal}
              latestOffer={latestOffer}
              currentUserUid={currentUserUid}
              otherPartyViewing={otherPartyViewing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealPage;
