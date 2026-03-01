/**
 * ContractSidebar Component
 *
 * Sticky sidebar displaying:
 * 1. Financial Summary — unit price, quantity, total value, Incoterms, currency
 * 2. Required Documents — Incoterm-driven checklist
 * 3. Estimated Additional Costs — Phase 4 placeholder
 * 4. Download PDF button — triggers window.print()
 */

'use client';

import { FileText, Download } from 'lucide-react';
import { INCOTERM_REQUIRED_DOCUMENTS } from '@/core/constants/contractConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Financial Summary Card
// ─────────────────────────────────────────────────────────────────────────────

function SidebarRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-t border-white/5">
      <span className="text-xs text-[#8899AA] flex-shrink-0 pr-2">{label}</span>
      <span className="text-xs text-white font-medium text-right">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContractSidebar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/Deal').Deal} props.deal
 * @param {import('@/domain/entities/Contract').Contract} props.contract
 * @param {boolean} props.isBuyer
 */
export function ContractSidebar({ deal, contract, isBuyer }) {
  // ── Extract financial data from contract clauses ──────────────────────────
  const clauses = contract?.clauses || [];
  const priceClause = clauses.find((c) => c.id === 'price');
  const quantityClause = clauses.find((c) => c.id === 'quantity');
  const totalClause = clauses.find((c) => c.id === 'total_value');
  const incotermClause = clauses.find((c) => c.id === 'incoterm');
  const namedPlaceClause = clauses.find((c) => c.id === 'named_place');

  // Extract the Incoterm code for document lookup
  // incotermClause.value is like "FOB — Free on Board"
  const incotermCode = incotermClause?.value?.split('—')[0]?.trim()
    || incotermClause?.value?.split(' ')[0]?.trim()
    || deal?.incoterm
    || null;

  const requiredDocs = incotermCode ? (INCOTERM_REQUIRED_DOCUMENTS[incotermCode] || []) : [];

  // ── PDF export ────────────────────────────────────────────────────────────
  function handleDownloadPDF() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <div className="lg:sticky lg:top-[120px] space-y-3">

      {/* Financial Summary card */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Financial Summary</h3>
        <p className="text-xs text-[#8899AA] mb-2">Contract value breakdown</p>
        <div className="space-y-0">
          <SidebarRow label="Unit Price" value={priceClause?.value || 'N/A'} />
          <SidebarRow label="Quantity" value={quantityClause?.value || 'N/A'} />
          <SidebarRow label="Total Value" value={totalClause?.value || 'N/A'} />
          <SidebarRow
            label="Incoterms"
            value={incotermCode || 'N/A'}
          />
          {namedPlaceClause?.value && (
            <SidebarRow label="Named Place" value={namedPlaceClause.value} />
          )}
        </div>
      </div>

      {/* Required Documents card */}
      {requiredDocs.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-white mb-1">Required Documents</h3>
          <p className="text-xs text-[#8899AA] mb-3">
            Based on {incotermCode} delivery terms
          </p>
          <ul className="space-y-2">
            {requiredDocs.map((doc) => (
              <li key={doc} className="flex items-start gap-2">
                <FileText size={12} className="text-[#FFD700] mt-0.5 flex-shrink-0" />
                <span className="text-xs text-[#8899AA]">{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estimated Costs placeholder — Phase 4 */}
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 opacity-60">
        <h3 className="text-sm font-semibold text-white mb-1">Estimated Additional Costs</h3>
        <p className="text-xs text-[#8899AA] mb-3">
          Costs will be available after provider quotes (Phase 4)
        </p>
        <ul className="space-y-2">
          <li className="flex items-start justify-between">
            <span className="text-xs text-[#8899AA]">Insurance premium</span>
            <span className="text-xs text-[#4A5B6E] italic">TBD</span>
          </li>
          <li className="flex items-start justify-between">
            <span className="text-xs text-[#8899AA]">Logistics cost</span>
            <span className="text-xs text-[#4A5B6E] italic">TBD</span>
          </li>
        </ul>
      </div>

      {/* Download PDF button */}
      <button
        type="button"
        onClick={handleDownloadPDF}
        className="print-hide w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-sm text-[#8899AA] hover:text-white hover:border-white/20 transition-colors"
      >
        <Download size={14} />
        Download PDF
      </button>
    </div>
  );
}

export default ContractSidebar;
