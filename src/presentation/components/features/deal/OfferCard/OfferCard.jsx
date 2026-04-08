/**
 * OfferCard Component
 *
 * Single offer card in the negotiation timeline.
 * Color accent: buyer = green, seller = gold, system = dashed neutral.
 * Shows changed fields highlighted when compared to previous offer.
 * Shows Accept / Reject buttons for current turn holder.
 * Shows Withdraw button for the offer submitter.
 */

'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Undo2, ArrowRight, User, AlertCircle } from 'lucide-react';
import { PAYMENT_TERMS, DEAL_UNITS, INSURANCE_PREFERENCE, DEAL_STATUS, OFFER_STATUS } from '@/core/constants/dealConstants';
import { getIncotermByCode } from '@/core/constants/incoterms';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getPaymentTermLabel(value) {
  const found = PAYMENT_TERMS.find((p) => p.value === value);
  return found ? found.label : value || '—';
}

function getUnitLabel(value) {
  const found = DEAL_UNITS.find((u) => u.value === value);
  return found ? found.label : value || '—';
}

function getInsuranceLabel(value) {
  const map = {
    seller_provides: 'Seller Provides',
    buyer_provides: 'Buyer Provides',
    none: 'None',
  };
  return map[value] || value || '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// System Event Card (deal initiated, accepted, rejected, expired, withdrawn)
// ─────────────────────────────────────────────────────────────────────────────

function SystemCard({ type, timestamp }) {
  const configs = {
    initiated: { icon: '🤝', label: 'Deal Initiated', color: 'text-[#8899AA]', bg: 'bg-[#0F1C2E]' },
    accepted: { icon: '✅', label: 'Deal Accepted', color: 'text-emerald-400', bg: 'bg-emerald-900/10' },
    rejected: { icon: '❌', label: 'Deal Rejected', color: 'text-red-400', bg: 'bg-red-900/10' },
    expired: { icon: '⏰', label: 'Deal Expired', color: 'text-[#8899AA]', bg: 'bg-[#0F1C2E]' },
    withdrawn: { icon: '↩️', label: 'Offer Withdrawn', color: 'text-[#8899AA]', bg: 'bg-[#0F1C2E]' },
  };

  const cfg = configs[type] || configs.initiated;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-[#2A3B52] ${cfg.bg}`}>
      <span className="text-lg">{cfg.icon}</span>
      <div>
        <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
        {timestamp && (
          <p className="text-xs text-[#8899AA] mt-0.5">{formatDateTime(timestamp)}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Changed Field Indicator
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({ label, value, prevValue, changed, currency }) {
  if (!changed) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-xs text-[#8899AA] w-32 flex-shrink-0">{label}</span>
        <span className="text-xs text-white">{value || '—'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded px-2 py-1">
      <span className="text-xs text-yellow-300/70 w-32 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {prevValue != null && (
          <>
            <span className="text-xs text-[#8899AA] line-through">{prevValue}</span>
            <ArrowRight size={10} className="text-yellow-500 flex-shrink-0" />
          </>
        )}
        <span className="text-xs text-yellow-300 font-semibold">{value || '—'}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main OfferCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OfferCard
 *
 * @param {Object} props
 * @param {import('@/domain/entities/Offer').Offer} props.offer
 * @param {import('@/domain/entities/Offer').Offer|null} props.previousOffer
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {string} props.currentUserUid
 * @param {boolean} props.isLatest
 * @param {{ acceptOffer: Function, rejectOffer: Function, withdrawOffer: Function, loading: boolean }} props.actions
 * @param {Object} [props.buyerData] - Buyer user data { displayName, companyName }
 * @param {Object} [props.sellerData] - Seller user data { displayName, companyName }
 */
export function OfferCard({
  offer,
  previousOffer,
  deal,
  currentUserUid,
  isLatest,
  actions,
  buyerData,
  sellerData,
}) {
  const [confirmAction, setConfirmAction] = useState(null); // 'accept' | 'reject' | 'withdraw'

  if (!offer || !deal) return null;

  const isBuyer = offer.role === 'buyer';
  const isSeller = offer.role === 'seller';

  // Color accent per role
  let accentBg = 'bg-emerald-900/10';
  let accentBorder = 'border-emerald-700/50';
  let accentLabel = 'text-emerald-400';
  let headerBg = 'bg-emerald-900/20';
  let roleLabel = 'Buyer';

  if (isSeller) {
    accentBg = 'bg-yellow-900/10';
    accentBorder = 'border-yellow-700/50';
    accentLabel = 'text-yellow-400';
    headerBg = 'bg-yellow-900/20';
    roleLabel = 'Seller';
  }

  // Who submitted this offer
  const submitterData = isBuyer ? buyerData : sellerData;
  const submitterName = submitterData?.companyName || submitterData?.displayName || roleLabel;

  // Changed fields computation
  function isChanged(field) {
    if (!previousOffer) return false;
    const curr = offer[field];
    const prev = previousOffer[field];
    if (curr instanceof Date && prev instanceof Date) return curr.getTime() !== prev.getTime();
    return String(curr) !== String(prev);
  }

  // Formatted values for display
  const priceStr = formatCurrency(offer.price, offer.currency);
  const prevPriceStr = previousOffer ? formatCurrency(previousOffer.price, previousOffer.currency) : null;
  const qtyStr = `${offer.quantity} ${getUnitLabel(offer.unit)}`;
  const prevQtyStr = previousOffer ? `${previousOffer.quantity} ${getUnitLabel(previousOffer.unit)}` : null;
  const totalStr = formatCurrency(offer.estimatedTotal, offer.currency);
  const incotermMeta = getIncotermByCode(offer.incoterm);
  const incotermStr = offer.incoterm ? `${offer.incoterm} — ${incotermMeta?.label?.split(' — ')[1] || ''}` : '—';
  const prevIncotermStr = previousOffer?.incoterm || null;
  const deadlineStr = formatDate(offer.deliveryDeadline);
  const prevDeadlineStr = previousOffer ? formatDate(previousOffer.deliveryDeadline) : null;

  // Action visibility
  const isNegotiating = deal.status === DEAL_STATUS.NEGOTIATING;
  const isReceiver = isLatest && isNegotiating && deal.currentTurnUid === currentUserUid;
  const isSender = isLatest && isNegotiating && offer.submittedBy === currentUserUid;
  const canAcceptReject = isReceiver && offer.status === OFFER_STATUS.OPEN;
  const canWithdraw = isSender && offer.submittedBy === currentUserUid && offer.status === OFFER_STATUS.OPEN;

  const handleAction = async (action) => {
    if (!actions) return;
    setConfirmAction(null);
    if (action === 'accept') await actions.acceptOffer(deal.id, offer.id);
    if (action === 'reject') await actions.rejectOffer(deal.id, offer.id);
    if (action === 'withdraw') await actions.withdrawOffer(deal.id, offer.id);
  };

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} overflow-hidden`}>
      {/* Card header */}
      <div className={`${headerBg} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${accentLabel} uppercase tracking-wide`}>
            {roleLabel} — Round {offer.round}
          </span>
          <span className="text-xs text-[#8899AA]">by {submitterName}</span>
        </div>
        <div className="flex items-center gap-2">
          {offer.status !== OFFER_STATUS.OPEN && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              offer.status === OFFER_STATUS.ACCEPTED
                ? 'text-emerald-400 border-emerald-700 bg-emerald-900/20'
                : offer.status === OFFER_STATUS.COUNTERED
                ? 'text-[#8899AA] border-[#2A3B52] bg-[#0F1C2E]'
                : 'text-red-400 border-red-700 bg-red-900/20'
            }`}>
              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </span>
          )}
          <span className="text-xs text-[#8899AA]">{formatDateTime(offer.createdAt)}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2">
        {/* Estimated total — prominent */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-xl font-bold ${accentLabel}`}>{totalStr}</span>
          <span className="text-xs text-[#8899AA]">
            ({priceStr} × {offer.quantity} {getUnitLabel(offer.unit)})
          </span>
          {previousOffer && (isChanged('price') || isChanged('quantity')) && (
            <span className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 px-1.5 py-0.5 rounded">
              Changed
            </span>
          )}
        </div>

        {/* Offer terms grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <FieldRow
            label="Price / Unit"
            value={priceStr}
            prevValue={prevPriceStr}
            changed={isChanged('price') || isChanged('currency')}
          />
          <FieldRow
            label="Quantity"
            value={`${offer.quantity} ${getUnitLabel(offer.unit)}`}
            prevValue={prevQtyStr}
            changed={isChanged('quantity') || isChanged('unit')}
          />
          <FieldRow
            label="Incoterm"
            value={incotermStr}
            prevValue={prevIncotermStr}
            changed={isChanged('incoterm')}
          />
          <FieldRow
            label={incotermMeta?.namedPlaceLabel || 'Named Place'}
            value={offer.namedPlace}
            prevValue={previousOffer?.namedPlace}
            changed={isChanged('namedPlace')}
          />
          <FieldRow
            label="Delivery Deadline"
            value={deadlineStr}
            prevValue={prevDeadlineStr}
            changed={isChanged('deliveryDeadline')}
          />
          <FieldRow
            label="Payment Terms"
            value={getPaymentTermLabel(offer.paymentTerms)}
            prevValue={previousOffer ? getPaymentTermLabel(previousOffer.paymentTerms) : null}
            changed={isChanged('paymentTerms')}
          />
          <FieldRow
            label="Insurance"
            value={getInsuranceLabel(offer.insurancePreference)}
            prevValue={previousOffer ? getInsuranceLabel(previousOffer.insurancePreference) : null}
            changed={isChanged('insurancePreference')}
          />
          {offer.currency !== 'USD' && offer.conversionRate && (
            <FieldRow
              label="Exchange Rate"
              value={`1 USD = ${offer.conversionRate} ${offer.currency}`}
              prevValue={null}
              changed={false}
            />
          )}
        </div>

        {/* Notes */}
        {offer.notes && (
          <div className="mt-2 p-2 bg-[#0F1C2E] rounded border border-[#2A3B52]">
            <p className="text-xs text-[#8899AA] font-medium mb-0.5">Notes</p>
            <p className="text-xs text-white whitespace-pre-line">{offer.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons — only visible on latest offer for authorized parties */}
      {(canAcceptReject || canWithdraw) && (
        <div className="px-4 py-3 border-t border-[#2A3B52] bg-[#0F1C2E]/50">
          {confirmAction ? (
            <div className="flex items-center gap-3">
              <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
              <span className="text-xs text-yellow-300 flex-1">
                {confirmAction === 'withdraw'
                  ? 'Withdraw your offer? This will terminate the deal.'
                  : confirmAction === 'reject'
                  ? 'Reject this offer? This will terminate the deal.'
                  : 'Accept this offer? This confirms the deal terms.'}
              </span>
              <button
                onClick={() => handleAction(confirmAction)}
                disabled={actions?.loading}
                className="text-xs px-3 py-1.5 bg-[#FFD700] hover:bg-[#FFE44D] text-[#0F1C2E] font-semibold rounded transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="text-xs px-3 py-1.5 text-[#8899AA] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {canAcceptReject && (
                <>
                  <button
                    onClick={() => setConfirmAction('accept')}
                    disabled={actions?.loading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={12} />
                    Accept
                  </button>
                  <button
                    onClick={() => setConfirmAction('reject')}
                    disabled={actions?.loading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded transition-colors disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Reject
                  </button>
                </>
              )}
              {canWithdraw && (
                <button
                  onClick={() => setConfirmAction('withdraw')}
                  disabled={actions?.loading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1A283B] hover:bg-[#2A3B52] text-[#8899AA] hover:text-white border border-[#2A3B52] font-medium rounded transition-colors disabled:opacity-50 ml-auto"
                >
                  <Undo2 size={12} />
                  Withdraw
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { SystemCard };
export default OfferCard;
