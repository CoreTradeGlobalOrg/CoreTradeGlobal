/**
 * QuotesPage Component
 *
 * Buyer's quotes comparison view for a deal in contract_approved status.
 * Shows insurance and logistics quote cards side-by-side for selection.
 *
 * Implemented in Plan 04-04. This is a placeholder to satisfy imports.
 */

'use client';

/**
 * QuotesPage placeholder — full implementation in Plan 04-04.
 *
 * @param {Object} props
 */
export function QuotesPage({ deal, loading }) {
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1C2E] pt-[120px] flex items-center justify-center">
        <div className="text-[#8899AA] text-sm">Loading quotes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[120px] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Provider Quotes</h1>
        <p className="text-[#8899AA] text-sm">
          Quote comparison view will be available here (implemented in Phase 4, Plan 04-04).
        </p>
      </div>
    </div>
  );
}

export default QuotesPage;
