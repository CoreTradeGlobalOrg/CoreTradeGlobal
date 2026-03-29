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

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Package } from 'lucide-react';
import { ProductHero } from '../ProductHero/ProductHero';
import { OfferTimeline } from '../OfferTimeline/OfferTimeline';
import { CounterOfferForm } from '../CounterOfferForm/CounterOfferForm';
import { DealSidebar } from '../DealSidebar/DealSidebar';
import { CountdownTimer } from '../CountdownTimer/CountdownTimer';
import { TradeSummaryTab } from '../TradeSummary/TradeSummaryTab';
import { DEAL_STATUS } from '@/core/constants/dealConstants';
import { LegalBanner } from '@/presentation/components/features/legal/LegalBanner/LegalBanner';

// ─────────────────────────────────────────────────────────────────────────────
// Terminal State Banner
// ─────────────────────────────────────────────────────────────────────────────

function TerminalBanner({ status }) {
  const configs = {
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
    [DEAL_STATUS.PROVIDERS_SELECTED]: {
      label: 'Providers Selected',
      sub: 'Insurance and logistics providers have been confirmed for this deal.',
      bg: 'bg-blue-900/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
    [DEAL_STATUS.DELIVERED]: {
      label: 'Trade Delivered',
      sub: 'Shipment has been delivered. This trade is complete.',
      bg: 'bg-green-900/20',
      border: 'border-green-700/50',
      text: 'text-green-400',
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
  const router = useRouter();
  const prevStatusRef = useRef(null);

  // Tab state: 'negotiation' | 'summary'
  const [activeTab, setActiveTab] = useState('negotiation');

  // Auto-navigate when deal status transitions to next stage
  useEffect(() => {
    if (!deal) return;

    // Skip first render — don't redirect on initial page load
    if (prevStatusRef.current === null) {
      prevStatusRef.current = deal.status;
      return;
    }

    // Skip if status hasn't changed
    if (prevStatusRef.current === deal.status) return;

    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = deal.status;

    if (deal.status === DEAL_STATUS.ACCEPTED && prevStatus === DEAL_STATUS.NEGOTIATING) {
      const timer = setTimeout(() => router.push(`/deals/${deal.id}/contract`), 2000);
      return () => clearTimeout(timer);
    }
    if (deal.status === DEAL_STATUS.CONTRACT_APPROVED) {
      const timer = setTimeout(() => router.push(`/deals/${deal.id}/quotes`), 2000);
      return () => clearTimeout(timer);
    }
  }, [deal?.status, deal?.id, router]);

  // Show summary tab for deals that are past the negotiation stage
  const showSummaryTab = deal
    ? [
        DEAL_STATUS.CONTRACT_APPROVED,
        DEAL_STATUS.PROVIDERS_SELECTED,
        DEAL_STATUS.DELIVERED,
        DEAL_STATUS.ACCEPTED,
      ].includes(deal.status)
    : false;

  // Auto-switch to summary tab for statuses where tracking is the primary concern
  useEffect(() => {
    if (!deal) return;
    if (
      deal.status === DEAL_STATUS.PROVIDERS_SELECTED ||
      deal.status === DEAL_STATUS.DELIVERED
    ) {
      setActiveTab('summary');
    }
  }, [deal?.status]);

  if (!deal) return null;

  const isTerminal = deal.isTerminal?.() ?? [
    DEAL_STATUS.REJECTED,
    DEAL_STATUS.EXPIRED,
    DEAL_STATUS.WITHDRAWN,
    DEAL_STATUS.CONTRACT_APPROVED,
    DEAL_STATUS.PROVIDERS_SELECTED,
    DEAL_STATUS.DELIVERED,
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

        {/* Contract banner — only for accepted (awaiting approval) */}
        {deal.status === DEAL_STATUS.ACCEPTED && (
          <div className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-[#FFD700]" />
              <p className="text-sm font-semibold text-[#FFD700]">
                Deal Accepted — Contract Ready
              </p>
            </div>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Both parties agreed on terms. Review and approve the contract to proceed.
            </p>
            <Link
              href={`/deals/${deal.id}/contract`}
              className="mt-2 inline-block text-xs font-semibold text-[#FFD700] hover:text-[#FFE44D] underline transition-colors"
            >
              View Contract &rarr;
            </Link>
          </div>
        )}

        {/* Quotes banner — only for contract_approved (next step is selecting providers) */}
        {deal.status === DEAL_STATUS.CONTRACT_APPROVED && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-900/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} className="text-blue-400" />
              <p className="text-sm font-semibold text-blue-400">
                Insurance and Logistics Quotes Available
              </p>
            </div>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Quote requests have been sent to all registered providers. Review and select your providers.
            </p>
            <Link
              href={`/deals/${deal.id}/quotes`}
              className="mt-2 inline-block text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
            >
              Compare Quotes
            </Link>
          </div>
        )}

        {/* Terminal banner (when deal is closed) */}
        {isTerminal && <TerminalBanner status={deal.status} />}

        {/* Legal banner — visible at ALL deal stages; manages its own show/hide logic */}
        <LegalBanner dealId={deal.id} currentUserUid={currentUserUid} />

        {/* Tab switcher — only shown when summary tab is available */}
        {showSummaryTab && (
          <div className="flex border-b border-[#2A3B52] no-print">
            <button
              type="button"
              onClick={() => setActiveTab('negotiation')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'negotiation'
                  ? 'border-[#FFD700] text-[#FFD700]'
                  : 'border-transparent text-[#8899AA] hover:text-white'
              }`}
            >
              Negotiation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'summary'
                  ? 'border-[#FFD700] text-[#FFD700]'
                  : 'border-transparent text-[#8899AA] hover:text-white'
              }`}
            >
              Trade Summary
            </button>
          </div>
        )}

        {/* Trade Summary tab content */}
        {showSummaryTab && activeTab === 'summary' ? (
          <div className="trade-summary-print">
            <TradeSummaryTab dealId={deal.id} currentUserUid={currentUserUid} />
          </div>
        ) : (
          /* Main content + sidebar (Negotiation tab) */
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
        )}
      </div>
    </div>
  );
}

export default DealPage;
