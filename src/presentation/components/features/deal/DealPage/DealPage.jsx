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

import Link from 'next/link';
import { FileText } from 'lucide-react';
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
    [DEAL_STATUS.CONTRACT_APPROVED]: {
      label: 'Contract Approved',
      sub: 'Both parties approved all contract clauses. Ready for insurance and logistics quotes.',
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-500/30',
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
    DEAL_STATUS.REJECTED,
    DEAL_STATUS.EXPIRED,
    DEAL_STATUS.WITHDRAWN,
    DEAL_STATUS.CONTRACT_APPROVED,
  ].includes(deal.status);

  // Latest offer for pre-fill and sidebar summary
  const latestOffer = offers.length > 0 ? offers[offers.length - 1] : null;

  // Other party info for counter-offer waiting message
  const isBuyer = deal.buyerId === currentUserUid;
  const otherPartyUid = isBuyer ? deal.sellerId : deal.buyerId;

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[120px] pb-4 px-4 sm:pb-6 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Product Hero — full width */}
        <ProductHero deal={deal} />

        {/* Countdown timer */}
        {latestOffer?.expiresAt && !isTerminal && deal.status !== DEAL_STATUS.ACCEPTED && (
          <CountdownTimer expiresAt={latestOffer.expiresAt} />
        )}

        {/* Contract ready banner — deal accepted, awaiting contract approval */}
        {deal.status === DEAL_STATUS.ACCEPTED && (
          <div className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-[#FFD700]" />
              <p className="text-sm font-semibold text-[#FFD700]">Deal Accepted — Contract Ready</p>
            </div>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Both parties agreed on terms. Review and approve the contract to proceed.
            </p>
            <Link
              href={`/deals/${deal.id}/contract`}
              className="mt-2 inline-block text-xs font-semibold text-[#FFD700] underline hover:text-[#FFE44D] transition-colors"
            >
              View Contract &rarr;
            </Link>
          </div>
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

            {/* Counter-Offer Form — only visible during active negotiation */}
            {deal.status === DEAL_STATUS.NEGOTIATING && (
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
