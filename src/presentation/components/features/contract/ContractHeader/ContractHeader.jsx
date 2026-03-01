/**
 * ContractHeader Component
 *
 * Context header at the top of the contract review page.
 * Shows: deal ID, buyer/seller names, product, accepted date,
 * and a link back to the negotiation history.
 */

'use client';

import Link from 'next/link';
import { FileText, Users, Package, Calendar } from 'lucide-react';

/**
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Contract').Contract} props.contract
 */
export function ContractHeader({ deal, contract }) {
  // Format accepted/generated date
  const acceptedDate = contract?.generatedAt
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(contract.generatedAt)
    : deal?.updatedAt
      ? new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(new Date(deal.updatedAt?.toDate?.() ?? deal.updatedAt))
      : 'Recently';

  // Truncate deal ID for display
  const shortDealId = deal?.id
    ? `${deal.id.substring(0, 8)}...`
    : 'Unknown';

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      {/* Title row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Contract Review</h1>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Deal #{shortDealId}
            </p>
          </div>
        </div>

        {/* Link to negotiation history */}
        <Link
          href={`/deals/${deal?.id}`}
          className="text-xs font-semibold text-[#FFD700] underline hover:text-[#FFE44D] transition-colors"
        >
          View Negotiation History
        </Link>
      </div>

      {/* Deal metadata grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Parties */}
        <div className="flex items-start gap-2">
          <Users size={13} className="text-[#8899AA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-[#8899AA] mb-0.5">Parties</p>
            <p className="text-xs text-white font-medium">
              {deal?.buyerName || 'Buyer'} &rarr; {deal?.sellerName || 'Seller'}
            </p>
          </div>
        </div>

        {/* Product */}
        <div className="flex items-start gap-2">
          <Package size={13} className="text-[#8899AA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-[#8899AA] mb-0.5">Product</p>
            <p className="text-xs text-white font-medium">
              {deal?.productName || 'N/A'}
            </p>
          </div>
        </div>

        {/* Accepted date */}
        <div className="flex items-start gap-2">
          <Calendar size={13} className="text-[#8899AA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-[#8899AA] mb-0.5">Contract Generated</p>
            <p className="text-xs text-white font-medium">{acceptedDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractHeader;
