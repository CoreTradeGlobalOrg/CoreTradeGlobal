/**
 * PartiesProvidersSection
 *
 * Shows buyer/seller info and selected insurance/logistics providers.
 * Sections fill progressively — shows 'Pending provider selection' when not yet available.
 */

'use client';

import { useState } from 'react';
import { Users, Shield, Truck, Clock, MessageCircle, Loader2 } from 'lucide-react';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { CreateConversationUseCase } from '@/domain/usecases/messaging/CreateConversationUseCase';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PartyChatButton — opens the FAB widget for buyer/seller (2-party direct conversation).
 */
function PartyChatButton({ conversationId, label }) {
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

/**
 * ProviderChatButton — creates conversation if needed, then opens FAB widget.
 * Same pattern as ProviderQuoteChatSidebar from Phase 13.
 */
function ProviderChatButton({ conversationId, label, providerUid, deal }) {
  const { openConversation, conversations } = useMessages();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const handleClick = async () => {
    if (!conversationId || !deal || !providerUid || !user?.uid) return;

    // Check if conversation already exists in loaded conversations
    const exists = conversations?.some(c => c.id === conversationId);
    if (exists) {
      openConversation(conversationId);
      return;
    }

    // Try to read the conversation directly — if it exists in Firestore but not loaded yet
    setCreating(true);
    try {
      const convRepo = container.getConversationRepository();
      const existing = await convRepo.getById(conversationId);
      if (existing) {
        openConversation(conversationId);
        setCreating(false);
        return;
      }
    } catch {
      // Permission error = document doesn't exist (Firestore can't evaluate rules on missing docs)
      // Fall through to create
    }

    // Create the conversation (same pattern as ProviderQuoteChatSidebar)
    try {
      const createUseCase = new CreateConversationUseCase(
        container.getConversationRepository(),
        container.getMessageRepository(),
        container.getNotificationRepository(),
        container.getUserRepository()
      );
      await createUseCase.execute({
        type: 'provider_quote',
        participantIds: [deal.buyerId, deal.sellerId, providerUid],
        creatorId: user.uid,
        metadata: { dealId: deal.id, providerId: providerUid },
      });
      openConversation(conversationId);
    } catch {
      // Already created by the other party — just open it
      openConversation(conversationId);
    } finally {
      setCreating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!conversationId || creating}
      className="inline-flex items-center gap-1 text-xs text-[#8899AA] hover:text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      title={conversationId ? `Message ${label}` : 'No conversation started yet'}
    >
      {creating ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
      Chat
    </button>
  );
}

function PartyCard({ role, label, conversationId }) {
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
      <PartyChatButton conversationId={conversationId ?? null} label={label || role} />
    </div>
  );
}

function ProviderCard({ icon: Icon, title, quote, conversationId, skipped = false, providerUid, deal }) {
  if (!quote) {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50 last:border-0">
        <div className="w-8 h-8 rounded-full bg-[#1A283B] border border-[#2A3B52] flex items-center justify-center flex-shrink-0">
          <Clock size={14} className={skipped ? 'text-amber-400' : 'text-[#8899AA]'} />
        </div>
        <div>
          <p className="text-xs font-medium text-[#8899AA]">{title}</p>
          <p className={`text-[10px] ${skipped ? 'text-amber-400 italic' : 'text-[#8899AA]/70'}`}>
            {skipped ? 'Arranging own coverage' : 'Pending provider selection'}
          </p>
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
          <ProviderChatButton conversationId={conversationId} label={title} providerUid={providerUid} deal={deal} />
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

  // Provider conversation IDs (deterministic from Phase 13)
  const insuranceConversationId = selectedInsuranceQuote?.providerUid
    ? `providerquote_${deal.id}_${selectedInsuranceQuote.providerUid}`
    : null;
  const logisticsConversationId = selectedLogisticsQuote?.providerUid
    ? `providerquote_${deal.id}_${selectedLogisticsQuote.providerUid}`
    : null;

  // Buyer/seller share the deal's original conversation
  const dealConversationId = deal.conversationId || null;

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
        <PartyCard role="Buyer" uid={deal.buyerId} label={buyerName || 'Buyer'} conversationId={dealConversationId} />
        <PartyCard role="Seller" uid={deal.sellerId} label={sellerName || 'Seller'} conversationId={dealConversationId} />
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
          skipped={!!deal.skippedInsurance}
          providerUid={selectedInsuranceQuote?.providerUid}
          deal={deal}
        />
        <ProviderCard
          icon={Truck}
          title="Logistics Provider"
          quote={selectedLogisticsQuote}
          conversationId={logisticsConversationId}
          skipped={!!deal.skippedLogistics}
          providerUid={selectedLogisticsQuote?.providerUid}
          deal={deal}
        />
      </div>
    </div>
  );
}

export default PartiesProvidersSection;
