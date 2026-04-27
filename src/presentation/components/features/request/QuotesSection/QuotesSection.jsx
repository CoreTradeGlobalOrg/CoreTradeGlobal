/**
 * QuotesSection Component
 *
 * Displays quotes/offers received for an RFQ.
 * Only visible to the RFQ owner.
 * Includes accept/reject functionality, messaging integration,
 * and enriched quote details with best-quote highlighting.
 */

'use client';

import { useState, useMemo } from 'react';
import { useQuotes } from '@/presentation/hooks/request/useQuotes';
import { useUpdateQuoteStatus } from '@/presentation/hooks/request/useUpdateQuoteStatus';
import { useConversations } from '@/presentation/hooks/messaging/useConversations';
import toast from 'react-hot-toast';
import { getUnitLabel } from '@/core/constants/units';
import {
  MessageCircle,
  Check,
  X,
  Clock,
  DollarSign,
  Package,
  Calendar,
  Truck,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Building2,
  ShieldCheck,
  XCircle,
  Download,
  MapPin,
  Star,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';

// Status badge styles
const statusStyles = {
  pending: 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/30',
  accepted: 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/30',
  rejected: 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/30',
};

const statusLabels = {
  pending: 'Pending Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

// Format a number as currency with thousands separators
function formatCurrency(value, currency = 'USD') {
  const num = parseFloat(value);
  if (isNaN(num)) return String(value || 'N/A');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

// Compute days until expiry from a priceValidUntil value (ISO string, Date, or Firestore Timestamp)
function getDaysUntilExpiry(priceValidUntil) {
  if (!priceValidUntil) return null;
  try {
    const expiry =
      priceValidUntil?.toDate?.() instanceof Date
        ? priceValidUntil.toDate()
        : new Date(priceValidUntil);
    if (isNaN(expiry.getTime())) return null;
    const diffMs = expiry - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function ValidityBadge({ priceValidUntil }) {
  const days = getDaysUntilExpiry(priceValidUntil);
  if (days === null) return <span className="text-white text-sm">{priceValidUntil || 'N/A'}</span>;

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[#f87171] text-sm font-medium">
        <AlertCircle size={12} />
        Expired
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-[#fbbf24] text-sm font-medium">
        <AlertCircle size={12} />
        Expires in {days}d
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-[#f59e0b] text-sm">
        <Clock size={12} />
        {days} days left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[#34d399] text-sm">
      <Check size={12} />
      Valid {days} more days
    </span>
  );
}

export function QuotesSection({ request, isOwner }) {
  const requestId = request?.id;
  const { quotes, loading, error } = useQuotes(requestId);
  const { acceptQuote, rejectQuote, loading: updatingStatus } = useUpdateQuoteStatus();
  const { startDirectConversation, creating: startingConversation } = useConversations();

  const [expandedQuotes, setExpandedQuotes] = useState({});
  const [processingQuoteId, setProcessingQuoteId] = useState(null);

  // Don't show if not owner or no request
  if (!isOwner || !request) return null;

  // Determine the best quote (lowest unit price) among non-rejected quotes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const bestQuoteId = useMemo(() => {
    const eligible = quotes.filter(
      (q) => q.status !== 'rejected' && parseFloat(q.unitPrice) > 0
    );
    if (eligible.length === 0) return null;
    const best = eligible.reduce((min, q) =>
      parseFloat(q.unitPrice) < parseFloat(min.unitPrice) ? q : min
    );
    return best.id;
  }, [quotes]);

  const toggleExpand = (quoteId) => {
    setExpandedQuotes(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
  };

  const handleAccept = async (quote) => {
    setProcessingQuoteId(quote.id);
    try {
      const productName = request.productName || request.title || 'your RFQ';

      await acceptQuote(requestId, quote.id, quote.userId, productName);

      const initialMessage = `Hello! I have accepted your offer for "${productName}". Let's discuss the details and proceed with the order. Looking forward to working with you!`;

      await startDirectConversation(
        quote.userId,
        {
          source: 'quote_accepted',
          subject: `Quote Accepted - ${productName}`,
          requestId: request.id,
          requestName: productName,
          requestQuantity: request.quantity,
          requestUnit: request.unit,
          requestBudget: request.budget,
          requestCountry: request.targetCountry || request.country,
          requestDescription: request.description?.substring(0, 500),
        },
        initialMessage
      );
    } catch (error) {
      console.error('Failed to accept quote:', error);
      toast.error(error.message || 'Failed to accept quote. Please try again.');
    } finally {
      setProcessingQuoteId(null);
    }
  };

  const handleReject = async (quote) => {
    setProcessingQuoteId(quote.id);
    try {
      const productName = request.productName || request.title || 'your RFQ';
      await rejectQuote(requestId, quote.id, quote.userId, productName);
    } catch (error) {
      console.error('Failed to reject quote:', error);
      toast.error(error.message || 'Failed to reject quote. Please try again.');
    } finally {
      setProcessingQuoteId(null);
    }
  };

  const handleStartConversation = async (quote) => {
    try {
      await startDirectConversation(quote.userId, {
        source: 'quote_response',
        subject: `Regarding your quote for RFQ`,
        requestId: request.id,
        requestName: request.productName || request.title,
        requestQuantity: request.quantity,
        requestUnit: request.unit,
        requestBudget: request.budget,
        requestCountry: request.targetCountry || request.country,
        requestDescription: request.description?.substring(0, 500),
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error(error.message || 'Failed to start conversation. Please try again.');
    }
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get label for select values
  const getPaymentTermLabel = (value) => {
    const terms = {
      tt_100: 'T/T - 100% Advance',
      tt_30_70: 'T/T - 30% / 70%',
      lc: 'L/C',
      dp: 'D/P',
      cad: 'CAD',
      oa: 'Open Account',
      escrow: 'Escrow',
    };
    return terms[value] || value;
  };

  const getShippingMethodLabel = (value) => {
    const methods = {
      sea_fcl: 'Sea (FCL)',
      sea_lcl: 'Sea (LCL)',
      air: 'Air Freight',
      express: 'Express Courier',
      road: 'Road Transport',
      rail: 'Rail Freight',
      multimodal: 'Multimodal',
    };
    return methods[value] || value;
  };

  const getWarrantyLabel = (value) => {
    const warranties = {
      none: 'No Warranty',
      '6_months': '6 Months',
      '12_months': '12 Months',
      '24_months': '24 Months',
      lifetime: 'Lifetime',
    };
    return warranties[value] || value;
  };

  // Compute estimated total price for display
  const getEstimatedTotal = (quote) => {
    const unit = parseFloat(quote.unitPrice);
    const qty = parseFloat(request?.quantity);
    if (isNaN(unit) || isNaN(qty) || unit <= 0 || qty <= 0) return null;
    return formatCurrency(unit * qty, quote.currency || 'USD');
  };

  if (loading) {
    return (
      <div className="glass-card p-6 border-t-4 border-t-[#3b82f6]">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText size={20} className="text-[#3b82f6]" />
          Received Offers
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
          <span className="ml-2 text-[#94a3b8]">Loading offers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-t-4 border-t-[#ef4444]">
        <h3 className="text-xl font-bold text-white mb-4">Received Offers</h3>
        <p className="text-red-400">Failed to load offers: {error}</p>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="glass-card p-6 border-t-4 border-t-[#3b82f6]">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText size={20} className="text-[#3b82f6]" />
          Received Offers
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
            <Package size={32} className="text-[#94a3b8]" />
          </div>
          <p className="text-[#94a3b8]">No offers received yet</p>
          <p className="text-sm text-[#64748b] mt-1">Suppliers will see your RFQ and submit their quotes here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border-t-4 border-t-[#3b82f6]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText size={20} className="text-[#3b82f6]" />
          Received Offers
          <span className="ml-2 text-sm font-normal bg-[#3b82f6]/20 text-[#60a5fa] px-2 py-0.5 rounded-full">
            {quotes.length}
          </span>
        </h3>
        {quotes.length > 1 && (
          <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
            <TrendingDown size={12} className="text-[#FFD700]" />
            <span className="text-[#FFD700] font-medium">Best offer</span>
            <span>highlighted</span>
          </span>
        )}
      </div>

      <div className="space-y-4">
        {quotes.map((quote) => {
          const isBest = quote.id === bestQuoteId && quotes.length > 1;
          const estimatedTotal = getEstimatedTotal(quote);

          return (
            <div
              key={quote.id}
              className={`rounded-xl border transition-all ${
                isBest
                  ? 'border-[#FFD700]/60 bg-[rgba(255,215,0,0.03)]'
                  : quote.status === 'accepted'
                  ? 'border-[#10b981]/50 bg-[rgba(255,255,255,0.03)]'
                  : quote.status === 'rejected'
                  ? 'border-[#ef4444]/30 bg-[rgba(255,255,255,0.02)]'
                  : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              {/* Best Offer Badge */}
              {isBest && (
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
                  <Star size={12} className="text-[#FFD700] fill-[#FFD700]" />
                  <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider">
                    Best Offer — Lowest Price
                  </span>
                </div>
              )}

              {/* Quote Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isBest ? 'bg-[rgba(255,215,0,0.1)]' : 'bg-[rgba(59,130,246,0.1)]'}`}>
                      <Building2 size={24} className={isBest ? 'text-[#FFD700]' : 'text-[#3b82f6]'} />
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {quote.userInfo?.companyName || quote.userInfo?.displayName || 'Anonymous Supplier'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {(quote.userInfo?.country || quote.originCountry) && (
                          <span className="text-xs text-[#94a3b8] flex items-center gap-1">
                            <MapPin size={11} />
                            {quote.userInfo?.country || quote.originCountry}
                          </span>
                        )}
                        <span className="text-xs text-[#64748b] flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${statusStyles[quote.status]}`}>
                    {statusLabels[quote.status]}
                  </span>
                </div>

                {/* Key Metrics — 2-row grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {/* Unit Price */}
                  <div className={`rounded-lg p-3 ${isBest ? 'bg-[rgba(255,215,0,0.07)] border border-[#FFD700]/20' : 'bg-[rgba(255,255,255,0.05)]'}`}>
                    <span className="text-xs text-[#94a3b8] block mb-1">Unit Price</span>
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} className={isBest ? 'text-[#FFD700]' : 'text-[#3b82f6]'} />
                      <span className={`font-bold text-sm leading-tight ${isBest ? 'text-[#FFD700]' : 'text-white'}`}>
                        {formatCurrency(quote.unitPrice, quote.currency || 'USD')}
                        <span className="text-xs text-[#94a3b8] font-normal">
                          /{getUnitLabel(quote.unitType)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Incoterms */}
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3">
                    <span className="text-xs text-[#94a3b8] block mb-1">Incoterms</span>
                    <div className="flex items-center gap-1">
                      <Truck size={14} className="text-[#3b82f6]" />
                      <span className="text-white font-semibold text-sm">{quote.incoterms || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Lead Time */}
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3">
                    <span className="text-xs text-[#94a3b8] block mb-1">Lead Time</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-[#10b981]" />
                      <span className="text-white font-semibold text-sm">{quote.leadTime || 'N/A'}</span>
                    </div>
                  </div>

                  {/* MOQ */}
                  <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3">
                    <span className="text-xs text-[#94a3b8] block mb-1">MOQ</span>
                    <div className="flex items-center gap-1">
                      <Package size={14} className="text-[#f59e0b]" />
                      <span className="text-white font-semibold text-sm">{quote.moq || 'Flexible'}</span>
                    </div>
                  </div>
                </div>

                {/* Estimated Total Row */}
                {estimatedTotal && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <span className="text-xs text-[#64748b]">Est. Total</span>
                    <span className="text-xs text-[#94a3b8]">
                      ({quote.currency || 'USD'} {parseFloat(quote.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })} × {request?.quantity} {request?.unit})
                    </span>
                    <span className={`ml-auto font-bold text-sm ${isBest ? 'text-[#FFD700]' : 'text-white'}`}>
                      {estimatedTotal}
                    </span>
                  </div>
                )}

                {/* Price Validity Row */}
                {quote.priceValidUntil && (
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <Clock size={12} className="text-[#94a3b8]" />
                    <span className="text-[#94a3b8]">Price valid until:</span>
                    <ValidityBadge priceValidUntil={quote.priceValidUntil} />
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleExpand(quote.id)}
                  className="flex items-center gap-2 text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                >
                  {expandedQuotes[quote.id] ? (
                    <>
                      <ChevronUp size={16} />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      View Full Details
                    </>
                  )}
                </button>

                {/* Expanded Details */}
                {expandedQuotes[quote.id] && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)] space-y-4">
                    {/* Shipping & Trade Details */}
                    <div>
                      <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">
                        Shipping &amp; Trade Details
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Shipping Method</span>
                          <span className="text-white text-sm">{getShippingMethodLabel(quote.shippingMethod) || 'N/A'}</span>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Port of Loading</span>
                          <span className="text-white text-sm">{quote.portOfLoading || 'N/A'}</span>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Payment Terms</span>
                          <span className="text-white text-sm">{getPaymentTermLabel(quote.paymentTerms) || 'N/A'}</span>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Supply Capacity</span>
                          <span className="text-white text-sm">{quote.supplyCapacity || 'N/A'}</span>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Warranty</span>
                          <span className="text-white text-sm">{getWarrantyLabel(quote.warranty) || 'N/A'}</span>
                        </div>
                        {quote.originCountry && (
                          <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                            <span className="text-xs text-[#64748b] block mb-1">Origin Country</span>
                            <span className="text-white text-sm flex items-center gap-1">
                              <MapPin size={12} className="text-[#94a3b8]" />
                              {quote.originCountry}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing Details */}
                    <div>
                      <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">
                        Pricing Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Currency</span>
                          <span className="text-white text-sm font-medium">{quote.currency || 'USD'}</span>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2.5">
                          <span className="text-xs text-[#64748b] block mb-1">Price Valid Until</span>
                          <ValidityBadge priceValidUntil={quote.priceValidUntil} />
                        </div>
                      </div>
                    </div>

                    {/* Specifications */}
                    {quote.specifications && (
                      <div>
                        <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                          Technical Specifications
                        </h4>
                        <p className="text-white text-sm bg-[rgba(255,255,255,0.04)] p-3 rounded-lg whitespace-pre-line border border-[rgba(255,255,255,0.06)]">
                          {quote.specifications}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {quote.notes && (
                      <div>
                        <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                          Additional Notes
                        </h4>
                        <p className="text-white text-sm bg-[rgba(255,255,255,0.04)] p-3 rounded-lg whitespace-pre-line border border-[rgba(255,255,255,0.06)]">
                          {quote.notes}
                        </p>
                      </div>
                    )}

                    {/* Attachments */}
                    {quote.attachments && quote.attachments.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                          Attachments
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {quote.attachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[rgba(59,130,246,0.1)] px-3 py-2 rounded-lg border border-[#3b82f6]/30 hover:bg-[rgba(59,130,246,0.2)] transition-colors"
                            >
                              <Download size={14} className="text-[#3b82f6]" />
                              <span className="text-sm text-white truncate max-w-[150px]">{attachment.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-4 py-3 bg-[rgba(0,0,0,0.2)] rounded-b-xl flex flex-wrap items-center gap-3">
                {quote.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAccept(quote)}
                      disabled={updatingStatus && processingQuoteId === quote.id}
                      className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white font-semibold rounded-full hover:bg-[#059669] transition-all disabled:opacity-50 text-sm"
                    >
                      {updatingStatus && processingQuoteId === quote.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Accept Offer
                    </button>
                    <button
                      onClick={() => handleReject(quote)}
                      disabled={updatingStatus && processingQuoteId === quote.id}
                      className="flex items-center gap-2 px-4 py-2 bg-[rgba(239,68,68,0.2)] text-[#f87171] font-semibold rounded-full hover:bg-[rgba(239,68,68,0.3)] transition-all border border-[#ef4444]/30 disabled:opacity-50 text-sm"
                    >
                      <X size={16} />
                      Decline
                    </button>
                  </>
                )}

                {quote.status === 'accepted' && (
                  <div className="flex items-center gap-2 text-[#34d399] text-sm">
                    <ShieldCheck size={16} />
                    <span>You accepted this offer</span>
                  </div>
                )}

                {quote.status === 'rejected' && (
                  <div className="flex items-center gap-2 text-[#f87171] text-sm">
                    <XCircle size={16} />
                    <span>You rejected this offer</span>
                  </div>
                )}

                <button
                  onClick={() => handleStartConversation(quote)}
                  disabled={startingConversation}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgba(59,130,246,0.2)] text-[#60a5fa] font-semibold rounded-full hover:bg-[rgba(59,130,246,0.3)] transition-all border border-[#3b82f6]/30 ml-auto text-sm"
                >
                  {startingConversation ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  Message Supplier
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuotesSection;
