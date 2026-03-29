/**
 * PartiesProvidersSection
 *
 * Shows buyer/seller info and selected insurance/logistics providers.
 * Sections fill progressively — shows 'Pending provider selection' when not yet available.
 */

'use client';

import { Users, Shield, Truck, Clock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PartyCard({ role, uid, label }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-[#2A3B52] flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#8899AA]">
          {(label || role)?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white truncate">{label || 'Unknown'}</p>
        <p className="text-[10px] text-[#8899AA]">{role}</p>
      </div>
    </div>
  );
}

function ProviderCard({ icon: Icon, title, quote }) {
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
        <p className="text-xs font-semibold text-white">{title}</p>

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
 * }} props
 */
export function PartiesProvidersSection({ deal, selectedInsuranceQuote, selectedLogisticsQuote }) {
  if (!deal) return null;

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
        <PartyCard role="Buyer" uid={deal.buyerId} label="Buyer" />
        <PartyCard role="Seller" uid={deal.sellerId} label="Seller" />
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
        />
        <ProviderCard
          icon={Truck}
          title="Logistics Provider"
          quote={selectedLogisticsQuote}
        />
      </div>
    </div>
  );
}

export default PartiesProvidersSection;
