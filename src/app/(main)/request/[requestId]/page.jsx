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
import { ArrowLeft, Calendar, MapPin, Package, DollarSign, Building, Pencil } from 'lucide-react';
import { RestrictedCard } from '@/presentation/components/common/RestrictedCard/RestrictedCard';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { SubmitQuoteDialog } from '@/presentation/components/features/request/SubmitQuoteDialog/SubmitQuoteDialog';
import { QuotesSection } from '@/presentation/components/features/request/QuotesSection/QuotesSection';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { Modal } from '@/components/ui/Modal';
import { useUpdateRequest } from '@/presentation/hooks/request/useUpdateRequest';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import toast from 'react-hot-toast';

export default function RequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { categories } = useCategories();
  const { updateRequest } = useUpdateRequest();

  // Admin / ownership checks
  const isAdmin = user?.role === 'admin';
  const isOwnRequest = user?.uid === request?.userId || isAdmin;

  // Resolve category name
  const category = categories?.find(c => c.value === request?.categoryId);
  const categoryName = category?.name || request?.category || '';

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

  // Format date helper
  const formatPostedDate = (timestamp) => {
    if (!timestamp) return 'Posted recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted yesterday';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Get member year
  const getMemberYear = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.getFullYear();
  };

  const handleQuoteClick = () => {
    setQuoteDialogOpen(true);
  };

  const refetchRequest = async () => {
    const firestoreDS = container.getFirestoreDataSource();
    const updated = await firestoreDS.getById('requests', params.requestId);
    if (updated) setRequest(updated);
  };

  const handleEditSubmit = async (data) => {
    try {
      await updateRequest(params.requestId, request.userId, data, { isAdmin });
      await refetchRequest();
      setEditModalOpen(false);
      toast.success('Request updated successfully!');
    } catch (error) {
      console.error('Request update error:', error);
      toast.error('Failed to update request');
    }
  };

  return (
    <main className="pt-[120px] px-6 bg-radial-navy min-h-screen">
      <div className="max-w-4xl mx-auto pb-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#A0A0A0] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Requests</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-stretch">
          {/* Main Content */}
          <div className="lg:col-span-2 flex">
            {/* Header Card with Description */}
            <div className="glass-card p-8 w-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${request.status === 'active' ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30' : 'bg-gray-700 text-gray-400'}`}>
                    {request.status === 'active' ? (request.badge || 'Active') : 'Closed'}
                  </span>
                  {request.createdByAdmin && user?.role === 'admin' && (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">
                      Admin Created
                    </span>
                  )}
                </div>
                <span className="text-sm text-[#A0A0A0] flex items-center gap-1.5 flex-shrink-0">
                  <Calendar size={14} />
                  {formatPostedDate(request.updatedAt || request.createdAt)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
                  {request.productName || request.title}
                </h1>
                {isOwnRequest && (
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="flex-shrink-0 p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-[#FFD700] hover:border-[#FFD700]/30 transition-all"
                    title="Edit Request"
                  >
                    <Pencil size={18} />
                  </button>
                )}
              </div>
              {categoryName && (
                <p className="text-lg text-[#3b82f6] font-bold mb-6">{categoryName}</p>
              )}

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2 border border-[rgba(255,255,255,0.1)]">
                  <span className="block text-xs text-[#A0A0A0] mb-1">Quantity/Volume</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Package size={16} className="text-[#3B82F6]" />
                    {request.quantity} {request.unit}
                  </div>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2 border border-[rgba(255,255,255,0.1)]">
                  <span className="block text-xs text-[#A0A0A0] mb-1">Target Budget</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <DollarSign size={16} className="text-[#3B82F6]" />
                    {request.budget === 0 || request.budget === '0' ? 'Negotiable' : (request.budget ? `$ ${request.budget}` : 'Negotiable')}
                  </div>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2 border border-[rgba(255,255,255,0.1)]">
                  <span className="block text-xs text-[#A0A0A0] mb-1">Destination</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <MapPin size={16} className="text-[#3B82F6]" />
                    <CountryFlag countryCode={countryCode} size={18} />
                    {countryName}
                  </div>
                </div>
              </div>

              <div
                className="prose prose-invert max-w-none overflow-hidden cursor-pointer"
                onClick={() => request.description?.length > 300 && setDescriptionExpanded(!descriptionExpanded)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">Description</h3>
                  {request.description?.length > 300 && (
                    <span className="text-xs font-medium text-gray-400">
                      {descriptionExpanded ? 'Click to collapse' : 'Click to expand'}
                    </span>
                  )}
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${descriptionExpanded ? '' : 'line-clamp-6'}`}>
                  <p className="text-[#A0A0A0] leading-relaxed whitespace-pre-line">
                    {request.description || 'No detailed description provided.'}
                  </p>
                </div>
                {request.description?.length > 300 && (
                  <button
                    className="mt-3 text-[#3B82F6] font-semibold text-sm hover:text-[#60A5FA] transition-colors flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDescriptionExpanded(!descriptionExpanded);
                    }}
                  >
                    {descriptionExpanded ? (
                      <>
                        Show Less
                        <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        Read More
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar (Buyer Info) */}
          <div className="lg:col-span-1 space-y-6">
            <RestrictedCard>
              <div className="glass-card p-6 border-t-4 border-t-[#FFD700]">
                <h3 className="text-lg font-bold text-white mb-4">Buyer Information</h3>

                <Link href={`/profile/${author?.id}`} className="flex items-center gap-4 mb-6 hover:opacity-80 transition-opacity">
                  {author?.companyLogo ? (
                    <img src={author.companyLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-[rgba(255,255,255,0.1)]" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-3xl border border-[rgba(255,255,255,0.1)]">
                      🏭
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white hover:text-[#3B82F6] transition-colors">{author?.companyName || 'Verified Buyer'}</p>
                    <p className="text-xs text-[#A0A0A0] flex items-center gap-1 mt-1">
                      <CountryFlag countryCode={countryCode} size={14} />
                      {countryName}
                    </p>
                  </div>
                </Link>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A0A0A0]">Member Since</span>
                    <span className="text-white">{getMemberYear(author?.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A0A0A0]">Verified Status</span>
                    {author?.emailVerified && author?.adminApproved ? (
                      <span className="text-[#34d399] font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#34d399]"></span> Verified
                      </span>
                    ) : (
                      <span className="text-[#A0A0A0] font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#A0A0A0]"></span> Unverified
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleQuoteClick}
                  className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-bold rounded-full shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:transform hover:-translate-y-0.5 transition-all"
                >
                  Submit Quote
                </button>
              </div>
            </RestrictedCard>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Safety Tips</h3>
              <ul className="space-y-2 text-sm text-[#A0A0A0]">
                <li className="flex gap-2">
                  <span className="text-[#3B82F6]">•</span> Verify buyer identity before shipping.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#3B82F6]">•</span> Use secure payment methods (LC/Escrow).
                </li>
                <li className="flex gap-2">
                  <span className="text-[#3B82F6]">•</span> Report suspicious behavior instantly.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Details - Outside the grid */}
        {(request.requirements || request.paymentTerms) && (
          <div className="glass-card p-8 mt-6">
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

        {/* Quotes/Offers Section - Shown to owner and admin */}
        {isOwnRequest && (
          <div id="quotes" className="mt-6 pb-8">
            <QuotesSection
              request={request}
              isOwner={true}
            />
          </div>
        )}
      </div>

      {/* Submit Quote Dialog */}
      <SubmitQuoteDialog
        isOpen={quoteDialogOpen}
        onClose={() => setQuoteDialogOpen(false)}
        request={request}
      />

      {/* Edit Request Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Request"
        variant="blue"
      >
        <RequestForm
          request={request}
          categories={categories}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditModalOpen(false)}
          userId={request?.userId}
        />
      </Modal>
    </main>
  );
}
