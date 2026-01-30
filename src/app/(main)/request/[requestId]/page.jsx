/**
 * Request Details Page
 *
 * Displays full details of an RFQ.
 * Public with view limits - guests can view up to 3 requests
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Package, DollarSign, Building } from 'lucide-react';
import { ViewLimitGuard } from '@/presentation/components/common/ViewLimitGuard/ViewLimitGuard';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { SubmitQuoteDialog } from '@/presentation/components/features/request/SubmitQuoteDialog/SubmitQuoteDialog';
import { QuotesSection } from '@/presentation/components/features/request/QuotesSection/QuotesSection';
import toast from 'react-hot-toast';

export default function RequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!params.requestId) return;

      try {
        setLoading(true);
        const firestoreDS = container.getFirestoreDataSource();
        const requestData = await firestoreDS.getById('requests', params.requestId);

        if (!requestData) {
          toast.error('Request not found');
          router.push('/requests');
          return;
        }

        setRequest(requestData);

        // Fetch author details
        if (requestData.userId) {
          const authorData = await firestoreDS.getById('users', requestData.userId);
          setAuthor(authorData);
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        toast.error('Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [params.requestId, router]);

  // Scroll to quotes section if hash is present
  useEffect(() => {
    if (!loading && request && window.location.hash === '#quotes') {
      const quotesElement = document.getElementById('quotes');
      if (quotesElement) {
        setTimeout(() => {
          quotesElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [loading, request]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading request details...</p>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!request) return null;

  // Helper to get Country info from ISO code
  const getCountryName = (countryCode) => {
    if (!countryCode) return 'Global';
    const country = COUNTRIES.find(c => c.value === countryCode);
    if (country) {
      return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
    }
    return countryCode;
  };

  const countryCode = request.targetCountry || request.country;
  const countryName = getCountryName(countryCode);

  const handleQuoteClick = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/request/' + request.id);
      return;
    }
    setQuoteDialogOpen(true);
  };

  return (
    <ViewLimitGuard itemId={params.requestId} itemType="request">
    <main className="min-h-screen pt-[120px] pb-20 px-6 bg-radial-navy">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#A0A0A0] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Requests</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="glass-card p-8">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${request.status === 'active' ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30' : 'bg-gray-700 text-gray-400'}`}>
                  {request.status === 'active' ? (request.badge || 'Active') : 'Closed'}
                </span>
                <span className="text-sm text-[#A0A0A0] flex items-center gap-1.5">
                  <Calendar size={14} />
                  {request.deadline ? `Deadline: ${request.deadline}` : 'Posted recently'}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                {request.productName || request.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2 border border-[rgba(255,255,255,0.1)]">
                  <span className="block text-xs text-[#A0A0A0] mb-1">Quantity/Volume</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Package size={16} className="text-[#FFD700]" />
                    {request.quantity} {request.unit}
                  </div>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2 border border-[rgba(255,255,255,0.1)]">
                  <span className="block text-xs text-[#A0A0A0] mb-1">Target Budget</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <DollarSign size={16} className="text-[#FFD700]" />
                    {request.budget || 'Negotiable'}
                  </div>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2 border border-[rgba(255,255,255,0.1)]">
                  <span className="block text-xs text-[#A0A0A0] mb-1">Destination</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <MapPin size={16} className="text-[#FFD700]" />
                    <CountryFlag countryCode={countryCode} size={18} />
                    {countryName}
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                <p className="text-[#A0A0A0] leading-relaxed whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {request.description || 'No detailed description provided.'}
                </p>
              </div>
            </div>

            {/* Additional Details */}
            {(request.requirements || request.paymentTerms) && (
              <div className="glass-card p-8">
                <h3 className="text-xl font-bold text-white mb-4">Specific Requirements</h3>
                <div className="space-y-4">
                  {request.requirements && (
                    <div className="overflow-hidden">
                      <span className="text-[#FFD700] font-semibold block mb-1">Technical Specs:</span>
                      <p className="text-[#A0A0A0] break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{request.requirements}</p>
                    </div>
                  )}
                  {request.paymentTerms && (
                    <div className="overflow-hidden">
                      <span className="text-[#FFD700] font-semibold block mb-1">Payment Terms:</span>
                      <p className="text-[#A0A0A0] break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{request.paymentTerms}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quotes/Offers Section - Only visible to RFQ owner */}
            <div id="quotes">
              <QuotesSection
                request={request}
                isOwner={user?.uid === request.userId}
              />
            </div>
          </div>

          {/* Sidebar (Buyer Info) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 border-t-4 border-t-[#FFD700]">
              <h3 className="text-lg font-bold text-white mb-4">Buyer Information</h3>

              <div className="flex items-center gap-4 mb-6">
                {author?.companyLogo ? (
                  <img src={author.companyLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-[rgba(255,255,255,0.1)]" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-3xl border border-[rgba(255,255,255,0.1)]">
                    🏭
                  </div>
                )}
                <div>
                  <p className="font-bold text-white">{author?.companyName || 'Verified Buyer'}</p>
                  <p className="text-xs text-[#A0A0A0] flex items-center gap-1 mt-1">
                    <CountryFlag countryCode={countryCode} size={14} />
                    {countryName}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0A0A0]">Member Since</span>
                  <span className="text-white">2023</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0A0A0]">Verified Status</span>
                  <span className="text-[#34d399] font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#34d399]"></span> Verified
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0A0A0]">Response Rate</span>
                  <span className="text-white">High (90%+)</span>
                </div>
              </div>

              <button
                onClick={handleQuoteClick}
                className="w-full py-3 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_14px_rgba(255,215,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,215,0,0.4)] hover:transform hover:-translate-y-0.5 transition-all"
              >
                Submit Quote
              </button>
              {!isAuthenticated && (
                <p className="text-xs text-center text-[#A0A0A0] mt-3">
                  You must be logged in to quote.
                </p>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Safety Tips</h3>
              <ul className="space-y-2 text-sm text-[#A0A0A0]">
                <li className="flex gap-2">
                  <span className="text-[#FFD700]">•</span> Verify buyer identity before shipping.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FFD700]">•</span> Use secure payment methods (LC/Escrow).
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FFD700]">•</span> Report suspicious behavior instantly.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Quote Dialog */}
      <SubmitQuoteDialog
        isOpen={quoteDialogOpen}
        onClose={() => setQuoteDialogOpen(false)}
        request={request}
      />
    </main>
    </ViewLimitGuard>
  );
}
