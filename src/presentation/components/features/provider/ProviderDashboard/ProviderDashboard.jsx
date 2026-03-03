/**
 * ProviderDashboard Component
 *
 * Kanban-style layout with 4 columns: New Requests, Quoted, Declined, Selected.
 * When a card is selected, shows QuoteDetailView side-by-side with deal info and quote form.
 *
 * Per design: shared layout for both insurance and logistics providers.
 * Only the quote form fields differ per provider type.
 */

'use client';

import { useState } from 'react';
import { LayoutGrid, Shield, Truck } from 'lucide-react';
import { RequestKanbanCard } from '@/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard';
import { QuoteDetailView } from '@/presentation/components/features/provider/QuoteDetailView/QuoteDetailView';
import { useQuoteForRequest } from '@/presentation/hooks/quote/useQuoteForRequest';
import { ROLES } from '@/core/constants/roles';

/**
 * Kanban column configuration
 */
const COLUMNS = [
  {
    key: 'newRequests',
    label: 'New Requests',
    dotColor: 'bg-yellow-400',
    emptyText: 'No new requests',
  },
  {
    key: 'quoted',
    label: 'Quoted',
    dotColor: 'bg-blue-400',
    emptyText: 'No quoted requests',
  },
  {
    key: 'declined',
    label: 'Declined',
    dotColor: 'bg-gray-400',
    emptyText: 'No declined requests',
  },
  {
    key: 'selected',
    label: 'Selected',
    dotColor: 'bg-green-400',
    emptyText: 'No selected requests',
  },
];

/**
 * Skeleton card placeholder for loading state
 */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1628] p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-[rgba(255,255,255,0.07)] rounded w-3/4" />
      <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-1/2" />
      <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-2/3" />
      <div className="h-6 bg-[rgba(255,255,255,0.05)] rounded-full w-24" />
    </div>
  );
}

/**
 * Wrapper that loads the provider's existing quote for the selected request.
 * Extracted as a component so useQuoteForRequest hook is always called
 * unconditionally (React hooks rules).
 */
function QuoteDetailWithExistingQuote({ request, providerType, providerUid, onBack }) {
  const { quote: existingQuote, loading: quoteLoading } = useQuoteForRequest(
    request.id,
    providerUid
  );

  return (
    <QuoteDetailView
      request={request}
      providerType={providerType}
      onBack={onBack}
      existingQuote={quoteLoading ? null : existingQuote}
    />
  );
}

/**
 * ProviderDashboard
 *
 * @param {Object} props
 * @param {{ newRequests: QuoteRequest[], quoted: QuoteRequest[], declined: QuoteRequest[], selected: QuoteRequest[] }} props.columns
 * @param {boolean} props.loading
 * @param {'insurance'|'logistics'} props.providerType
 * @param {string} props.providerUid
 */
export function ProviderDashboard({ columns, loading, providerType, providerUid }) {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const isInsurance = providerType === 'insurance';

  // If a request is selected, show the detail/quote form view
  if (selectedRequest) {
    return (
      <QuoteDetailWithExistingQuote
        request={selectedRequest}
        providerType={providerType}
        providerUid={providerUid}
        onBack={() => setSelectedRequest(null)}
      />
    );
  }

  const totalCount = Object.values(columns).reduce((sum, col) => sum + col.length, 0);

  return (
    <main className="min-h-screen bg-radial-navy pt-[100px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-[#FFD700]" />
              Provider Dashboard
            </h1>
            <p className="text-[#A0A0A0] mt-1 text-sm">
              {loading
                ? 'Loading your quote requests...'
                : `${totalCount} quote request${totalCount !== 1 ? 's' : ''} across all columns`}
            </p>
          </div>
          {/* Provider type badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
            isInsurance
              ? 'bg-orange-900/20 border-orange-700/40 text-orange-400'
              : 'bg-green-900/20 border-green-700/40 text-green-400'
          }`}>
            {isInsurance ? (
              <Shield className="w-4 h-4" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            {isInsurance ? 'Insurance Provider' : 'Logistics Provider'}
          </div>
        </div>

        {/* Kanban Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const cards = columns[col.key] || [];
            const count = cards.length;

            return (
              <div key={col.key} className="flex flex-col gap-3">
                {/* Column Header */}
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`} />
                  <span className="text-sm font-semibold text-white">{col.label}</span>
                  <span className={`ml-auto text-xs font-bold rounded-full px-2 py-0.5 ${
                    count > 0
                      ? 'bg-[#1E2D3D] text-[#A0B0C0] border border-[#2A3B52]'
                      : 'bg-[#0D1822] text-[#4A5B6E]'
                  }`}>
                    {count}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex flex-col gap-2 min-h-[120px]">
                  {loading ? (
                    // Loading skeletons
                    <>
                      <SkeletonCard />
                      <SkeletonCard />
                    </>
                  ) : count === 0 ? (
                    // Empty state
                    <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-[#1E2D3D] text-xs text-[#4A5B6E]">
                      {col.emptyText}
                    </div>
                  ) : (
                    // Request cards
                    cards.map((request) => (
                      <RequestKanbanCard
                        key={request.id}
                        request={request}
                        onClick={() => setSelectedRequest(request)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}

export default ProviderDashboard;
