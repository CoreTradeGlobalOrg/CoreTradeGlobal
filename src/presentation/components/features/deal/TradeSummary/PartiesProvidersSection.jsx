/**
 * PartiesProvidersSection
 *
 * Shows buyer/seller info and selected insurance/logistics providers.
 * Sections fill progressively — shows 'Pending provider selection' when not yet available.
 */

'use client';

import { Users, Shield, Truck, Clock, MessageCircle } from 'lucide-react';
import { useMessages } from '@/presentation/contexts/MessagesContext';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ChatButton — opens the FAB messaging widget for a given conversation.
 * Disabled (with tooltip) when no conversationId is available.
 */
function ChatButton({ conversationId, label }) {
  const { openConversation } = useMessages();
  return (
    <button
      type="button"
      onClick={() => conversationId && openConversation(conversationId)}
      disabled={!conversationId}
      className="inline-flex items-center gap-1 text-xs text-[#8899AA] hover:text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      title={conversationId ? `Message ${label}` : 'No conversation started yet'}
    >
      <MessageCircle size={12} />
      Chat
    </button>
  );
}

function PartyCard({ role, uid, label, conversationId }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-[#2A3B52] flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#8899AA]">
          {(label || role)?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white truncate">{label || 'Unknown'}</p>
        <p className="text-[10px] text-[#8899AA]">{role}</p>
      </div>
      <ChatButton conversationId={conversationId ?? null} label={label || role} />
    </div>
  );
}

function ProviderCard({ icon: Icon, title, quote, conversationId }) {
  if (!quote) {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50 last:border-0">
        <div className="w-8 h-8 rounded-full bg-[#1A283B] border border-[#2A3B52] flex items-center justify-center flex-shrink-0">
          <Clock size={14} className="text-[#8899AA]" />
        </div>
        <div>
          <p className="text-xs font-medium text-[#8899AA]">{title}</p>
          <p className="text-[10px] text-[#8899AA]/70">Pending provider selection</p>
        </div>
      </div>
    );
  }

  const currency = quote.currency || 'USD';

  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#2A3B52]/50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-[#FFD700]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white">{title}</p>
          <ChatButton conversationId={conversationId ?? null} label={title} />
        </div>

        {/* Insurance-specific details */}
        {quote.providerType === 'insurance' && (
          <div className="mt-1 space-y-0.5">
            {quote.iccCoverage && (
              <p className="text-[10px] text-[#8899AA]">
                Coverage: <span className="text-white">ICC {quote.iccCoverage}</span>
              </p>
            )}
            {quote.premiumAmount != null && (
              <p className="text-[10px] text-[#8899AA]">
                Premium: <span className="text-[#FFD700] font-medium">
                  {currency} {Number(quote.premiumAmount).toLocaleString()}
                </span>
              </p>
            )}
            {quote.validUntil && (
              <p className="text-[10px] text-[#8899AA]">
                Valid until: <span className="text-white">
                  {new Date(quote.validUntil).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Logistics-specific details */}
        {quote.providerType === 'logistics' && (
          <div className="mt-1 space-y-0.5">
            {quote.transportMode && (
              <p className="text-[10px] text-[#8899AA]">
                Mode: <span className="text-white capitalize">{quote.transportMode}</span>
              </p>
            )}
            {quote.freightCost != null && (
              <p className="text-[10px] text-[#8899AA]">
                Cost: <span className="text-[#FFD700] font-medium">
                  {currency} {Number(quote.freightCost).toLocaleString()}
                </span>
              </p>
            )}
            {quote.estimatedTransitDays != null && (
              <p className="text-[10px] text-[#8899AA]">
                Transit: <span className="text-white">{quote.estimatedTransitDays} days</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PartiesProvidersSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   deal: import('@/domain/entities/Deal').Deal,
 *   selectedInsuranceQuote: import('@/domain/entities/Quote').Quote|null,
 *   selectedLogisticsQuote: import('@/domain/entities/Quote').Quote|null,
 *   buyerName: string|null,
 *   sellerName: string|null,
 * }} props
 */
export function PartiesProvidersSection({ deal, selectedInsuranceQuote, selectedLogisticsQuote, buyerName, sellerName }) {
  if (!deal) return null;

  // Deterministic provider conversation IDs (providerquote_${dealId}_${providerId})
  const insuranceConversationId = selectedInsuranceQuote?.providerUid
    ? `providerquote_${deal.id}_${selectedInsuranceQuote.providerUid}`
    : null;
  const logisticsConversationId = selectedLogisticsQuote?.providerUid
    ? `providerquote_${deal.id}_${selectedLogisticsQuote.providerUid}`
    : null;

  // Buyer/seller conversations are not deterministic — button is disabled (no conversation ID)
  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-[#FFD700]" />
        <h3 className="text-sm font-semibold text-white">Parties & Providers</h3>
      </div>

      {/* Parties */}
      <div className="mb-4">
        <p className="text-[10px] text-[#8899AA] uppercase tracking-wider font-medium mb-2">
          Trade Parties
        </p>
        <PartyCard role="Buyer" uid={deal.buyerId} label={buyerName || 'Buyer'} conversationId={null} />
        <PartyCard role="Seller" uid={deal.sellerId} label={sellerName || 'Seller'} conversationId={null} />
      </div>

      {/* Providers */}
      <div>
        <p className="text-[10px] text-[#8899AA] uppercase tracking-wider font-medium mb-2">
          Selected Providers
        </p>
        <ProviderCard
          icon={Shield}
          title="Insurance Provider"
          quote={selectedInsuranceQuote}
          conversationId={insuranceConversationId}
        />
        <ProviderCard
          icon={Truck}
          title="Logistics Provider"
          quote={selectedLogisticsQuote}
          conversationId={logisticsConversationId}
        />
      </div>
    </div>
  );
}

export default PartiesProvidersSection;
