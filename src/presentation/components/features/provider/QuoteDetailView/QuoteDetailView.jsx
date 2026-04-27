/**
 * QuoteDetailView Component
 *
 * Side-by-side layout for reviewing deal information and submitting a quote.
 * Left column: Deal details (price shown only for insurance providers).
 * Right column: Type-specific quote form (QuoteFormInsurance or QuoteFormLogistics).
 *
 * Layout stacks vertically on mobile, side-by-side (lg:grid-cols-2) on desktop.
 */

'use client';

import { ArrowLeft, Shield, Truck, Package, Calendar, MapPin, FileText, DollarSign, X, RotateCcw, Users } from 'lucide-react';
import { getIncotermByCode } from '@/core/constants/incoterms';
import { CountdownTimer } from '@/presentation/components/features/deal/CountdownTimer/CountdownTimer';
import { QuoteFormInsurance } from '@/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance';
import { QuoteFormLogistics } from '@/presentation/components/features/provider/QuoteFormLogistics/QuoteFormLogistics';
import { useQuoteActions } from '@/presentation/hooks/quote/useQuoteActions';
import { QUOTE_REQUEST_STATUS } from '@/core/constants/quoteConstants';

/**
 * Deal info row — displays a label + value pair
 */
function InfoRow({ icon: Icon, label, value, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#1E2D3D] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[#0A1628] border border-[#1E2D3D] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[#4A5B6E]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#8899AA]">{label}</p>
        <p className={`text-sm font-medium mt-0.5 truncate ${highlight ? 'text-[#FFD700]' : 'text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Derive insurance arrangement label from an Incoterm code.
 * Returns null if code is absent or unknown.
 */
function deriveInsuranceArrangement(incotermCode) {
  if (!incotermCode) return null;
  const term = getIncotermByCode(incotermCode);
  if (!term) return null;
  return term.insuranceDefault === 'seller_provides'
    ? 'Seller provides cargo insurance'
    : 'Buyer provides cargo insurance';
}

/**
 * QuoteDetailView
 *
 * @param {Object} props
 * @param {import('@/domain/entities/QuoteRequest').QuoteRequest} props.request - The quote request
 * @param {'insurance'|'logistics'} props.providerType - Provider's type
 * @param {Function} props.onBack - Callback to return to kanban view
 * @param {import('@/domain/entities/Quote').Quote|null} props.existingQuote - For edit mode pre-fill
 */
export function QuoteDetailView({ request, providerType, onBack, existingQuote }) {
  const actions = useQuoteActions();

  const { dealSnapshot, status, deadline, id: requestId } = request;
  const isInsurance = providerType === 'insurance';
  const isPending = request.isPending();
  const isQuoted = request.isQuoted();

  const productName = dealSnapshot?.productName || 'Unknown Product';
  const quantity = dealSnapshot?.quantity;
  const unit = dealSnapshot?.unit || '';
  const incoterm = dealSnapshot?.incoterm || '';
  const namedPlace = dealSnapshot?.namedPlace || '';
  const paymentTerms = dealSnapshot?.paymentTerms || '';
  const deliveryDeadline = dealSnapshot?.deliveryDeadline
    ? (dealSnapshot.deliveryDeadline instanceof Date
        ? dealSnapshot.deliveryDeadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date(dealSnapshot.deliveryDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
    : null;
  const currency = dealSnapshot?.currency || 'USD';

  // Buyer/seller identity — available for BOTH insurance and logistics providers (Plan 14-01)
  const buyerName = dealSnapshot?.buyerName || null;
  const buyerCountry = dealSnapshot?.buyerCountry || null;
  const sellerName = dealSnapshot?.sellerName || null;
  const sellerCountry = dealSnapshot?.sellerCountry || null;
  const insuranceArrangement = deriveInsuranceArrangement(incoterm);

  // Price fields — only insurance providers see these (logistics dealSnapshot has no price)
  const pricePerUnit = dealSnapshot?.price;
  const estimatedTotal = (pricePerUnit && quantity)
    ? `${currency} ${(pricePerUnit * quantity).toLocaleString()}`
    : null;

  const handleDecline = async () => {
    await actions.declineRequest(requestId);
    onBack();
  };

  const handleWithdraw = async () => {
    if (!existingQuote?.id) return;
    await actions.withdrawQuote(requestId, existingQuote.id);
    onBack();
  };

  return (
    <main className="min-h-screen bg-radial-navy pt-[var(--navbar-height)] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#8899AA] hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <span className="text-[#2A3B52]">/</span>
          <span className="text-white text-sm font-medium truncate">{productName}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left Column: Deal Information ── */}
          <div className="bg-[#0D1822] border border-[#1E2D3D] rounded-xl overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-[#1E2D3D] flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isInsurance ? 'bg-orange-900/30' : 'bg-green-900/30'
              }`}>
                {isInsurance
                  ? <Shield className="w-4 h-4 text-orange-400" />
                  : <Truck className="w-4 h-4 text-green-400" />
                }
              </div>
              <h2 className="text-sm font-semibold text-white">Deal Information</h2>
            </div>

            <div className="p-5">
              {/* Product name (prominent) */}
              <h3 className="text-lg font-bold text-white mb-4">{productName}</h3>

              {/* Deal fields */}
              <div className="space-y-0">
                {/* Buyer & Seller — shown for BOTH insurance and logistics */}
                {buyerName && (
                  <InfoRow
                    icon={Users}
                    label="Buyer"
                    value={buyerCountry ? `${buyerName} (${buyerCountry})` : buyerName}
                  />
                )}
                {sellerName && (
                  <InfoRow
                    icon={Users}
                    label="Seller"
                    value={sellerCountry ? `${sellerName} (${sellerCountry})` : sellerName}
                  />
                )}
                {quantity != null && (
                  <InfoRow
                    icon={Package}
                    label="Quantity"
                    value={`${quantity} ${unit}`}
                  />
                )}
                {incoterm && (
                  <InfoRow
                    icon={FileText}
                    label="Incoterm"
                    value={namedPlace ? `${incoterm} — ${namedPlace}` : incoterm}
                  />
                )}
                {/* Insurance Arrangement — only for insurance providers */}
                {isInsurance && insuranceArrangement && (
                  <InfoRow
                    icon={Shield}
                    label="Insurance Arrangement"
                    value={insuranceArrangement}
                  />
                )}
                {paymentTerms && (
                  <InfoRow
                    icon={FileText}
                    label="Payment Terms"
                    value={paymentTerms}
                  />
                )}
                {deliveryDeadline && (
                  <InfoRow
                    icon={Calendar}
                    label="Delivery Deadline"
                    value={deliveryDeadline}
                  />
                )}
                <InfoRow
                  icon={DollarSign}
                  label="Currency"
                  value={currency}
                />

                {/* Price — ONLY shown for insurance providers */}
                {isInsurance && pricePerUnit != null && (
                  <>
                    <InfoRow
                      icon={DollarSign}
                      label="Price per Unit"
                      value={`${currency} ${pricePerUnit.toLocaleString()}`}
                      highlight
                    />
                    {estimatedTotal && (
                      <InfoRow
                        icon={DollarSign}
                        label="Estimated Total Value"
                        value={estimatedTotal}
                        highlight
                      />
                    )}
                  </>
                )}
              </div>

              {/* Quote submission deadline countdown */}
              {deadline && (
                <div className="mt-4 pt-4 border-t border-[#1E2D3D]">
                  <p className="text-xs text-[#8899AA] mb-2">Time to respond:</p>
                  <CountdownTimer expiresAt={deadline} />
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-5 pt-4 border-t border-[#1E2D3D] space-y-2">
                {/* Decline — only for pending requests */}
                {isPending && (
                  <button
                    onClick={handleDecline}
                    disabled={actions.loading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-400 border border-red-700/40 bg-red-900/10 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Decline Request
                  </button>
                )}

                {/* Withdraw quote — only for quoted requests with an active quote */}
                {isQuoted && existingQuote?.isActive?.() && (
                  <button
                    onClick={handleWithdraw}
                    disabled={actions.loading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-yellow-400 border border-yellow-700/40 bg-yellow-900/10 rounded-lg hover:bg-yellow-900/20 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Withdraw Quote
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Quote Form ── */}
          <div>
            {/* Only show form for pending (new) or quoted (edit) requests */}
            {(isPending || isQuoted) ? (
              isInsurance ? (
                <QuoteFormInsurance
                  requestId={requestId}
                  existingQuote={existingQuote}
                  actions={actions}
                  onSuccess={onBack}
                />
              ) : (
                <QuoteFormLogistics
                  requestId={requestId}
                  existingQuote={existingQuote}
                  actions={actions}
                  onSuccess={onBack}
                />
              )
            ) : (
              // Declined or selected — show status message instead of form
              <div className="bg-[#0D1822] border border-[#1E2D3D] rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                <div className="w-12 h-12 rounded-full bg-[#1A283B] border border-[#2A3B52] flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-[#4A5B6E]" />
                </div>
                <p className="text-white font-medium">
                  {request.isDeclined() && 'Request Declined'}
                  {request.isSelected() && 'Quote Selected'}
                  {status === 'not_selected' && 'Not Selected'}
                </p>
                <p className="text-[#8899AA] text-sm mt-1">
                  {request.isDeclined() && 'You have declined this quote request.'}
                  {request.isSelected() && 'The buyer has selected your quote.'}
                  {status === 'not_selected' && 'The buyer selected another provider.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default QuoteDetailView;
