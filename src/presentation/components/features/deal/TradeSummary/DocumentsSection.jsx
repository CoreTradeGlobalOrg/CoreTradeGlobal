/**
 * DocumentsSection
 *
 * Shows contract PDF download link and placeholder slots for future documents.
 * Placeholder documents (Insurance Certificate, Bill of Lading, etc.)
 * are informational only — no upload functionality.
 */

'use client';

import { FileText, Download, FileX } from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder document slot
// ─────────────────────────────────────────────────────────────────────────────

function PlaceholderDoc({ name }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50 last:border-0">
      <div className="w-8 h-8 rounded flex items-center justify-center bg-[#2A3B52] flex-shrink-0">
        <FileX size={14} className="text-[#8899AA]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#8899AA] truncate">{name}</p>
        <p className="text-[10px] text-[#8899AA]/60">Not yet available</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentsSection
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_DOCS = [
  'Insurance Certificate',
  'Bill of Lading',
  'Commercial Invoice',
  'Packing List',
];

/**
 * @param {{
 *   deal: import('@/domain/entities/Deal').Deal,
 *   contract: import('@/domain/entities/Contract').Contract|null,
 * }} props
 */
export function DocumentsSection({ deal, contract }) {
  if (!deal) return null;

  return (
    <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-[#FFD700]" />
        <h3 className="text-sm font-semibold text-white">Documents</h3>
      </div>

      {/* Contract PDF */}
      <div className="mb-3">
        <p className="text-[10px] text-[#8899AA] uppercase tracking-wider font-medium mb-2">
          Trade Contract
        </p>
        {contract ? (
          <Link
            href={`/deals/${deal.id}/contract`}
            className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50 group"
          >
            <div className="w-8 h-8 rounded flex items-center justify-center bg-[#FFD700]/10 border border-[#FFD700]/30 flex-shrink-0">
              <FileText size={14} className="text-[#FFD700]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white group-hover:text-[#FFD700] transition-colors truncate">
                Trade Contract
              </p>
              <p className="text-[10px] text-[#8899AA]">Signed by both parties</p>
            </div>
            <Download size={14} className="text-[#8899AA] group-hover:text-[#FFD700] transition-colors flex-shrink-0" />
          </Link>
        ) : (
          <div className="flex items-center gap-3 py-2 border-b border-[#2A3B52]/50">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-[#2A3B52] flex-shrink-0">
              <FileText size={14} className="text-[#8899AA]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#8899AA]">Trade Contract</p>
              <p className="text-[10px] text-[#8899AA]/60">Pending contract approval</p>
            </div>
          </div>
        )}
      </div>

      {/* Placeholder document slots */}
      <div>
        <p className="text-[10px] text-[#8899AA] uppercase tracking-wider font-medium mb-2">
          Supporting Documents
        </p>
        {PLACEHOLDER_DOCS.map((name) => (
          <PlaceholderDoc key={name} name={name} />
        ))}
      </div>
    </div>
  );
}

export default DocumentsSection;
