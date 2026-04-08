/**
 * ChannelLeft Component
 *
 * Left panel for the legal channel. Shows:
 *   1. Lawyer Profile (photo/initials, name, specializations, availability)
 *   2. Deal Info (product, parties, Incoterms, price, status)
 *   3. Documents (attachments from messages + contract drafts)
 *   4. Consulting Status (engagement status, dates, close button)
 *
 * Each section is collapsible via a toggle chevron.
 *
 * Props:
 *   engagement     - LegalEngagement entity
 *   deal           - Deal entity or null
 *   messages       - LegalMessage[] array
 *   drafts         - Contract draft objects array
 *   isLawyer       - Whether current user is the lawyer
 *   onCloseEngagement - Handler for closing the engagement
 *   actionLoading  - Whether a close action is in progress
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Image, Download, Scale, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ENGAGEMENT_STATUS, LEGAL_MESSAGE_TYPE } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section wrapper
// ─────────────────────────────────────────────────────────────────────────────

function CollapsibleSection({ title, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[rgba(255,255,255,0.06)]">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors"
      >
        <span className="text-xs font-semibold text-[#8899AA] uppercase tracking-wider">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp size={14} className="text-[#4A5B6E]" />
        ) : (
          <ChevronDown size={14} className="text-[#4A5B6E]" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// File type icon helper
// ─────────────────────────────────────────────────────────────────────────────

function FileIcon({ mimeType, size = 14 }) {
  const isImage = mimeType?.startsWith('image/');
  if (isImage) return <Image size={size} className="text-blue-400 flex-shrink-0" />;
  return <FileText size={size} className="text-[#FFD700] flex-shrink-0" />;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
    [ENGAGEMENT_STATUS.ACTIVE]: 'bg-green-500/20 text-green-400',
    [ENGAGEMENT_STATUS.PENDING]: 'bg-amber-500/20 text-amber-400',
    [ENGAGEMENT_STATUS.COMPLETED]: 'bg-[rgba(255,255,255,0.08)] text-[#8899AA]',
  };
  const labels = {
    [ENGAGEMENT_STATUS.ACTIVE]: 'Active',
    [ENGAGEMENT_STATUS.PENDING]: 'Pending',
    [ENGAGEMENT_STATUS.COMPLETED]: 'Completed',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${configs[status] || ''}`}
    >
      {labels[status] || status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Initials avatar
// ─────────────────────────────────────────────────────────────────────────────

function InitialsAvatar({ name, size = 'md' }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center flex-shrink-0`}
    >
      <span className="font-semibold text-purple-200">{initials}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChannelLeft
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/LegalEngagement').LegalEngagement} props.engagement
 * @param {Object|null} props.deal
 * @param {import('@/domain/entities/LegalMessage').LegalMessage[]} props.messages
 * @param {Object[]} props.drafts
 * @param {boolean} props.isLawyer
 * @param {Function} props.onCloseEngagement
 * @param {boolean} props.actionLoading
 */
export function ChannelLeft({
  engagement,
  deal,
  messages,
  drafts,
  isLawyer,
  onCloseEngagement,
  actionLoading,
}) {
  // Extract attachments from messages
  const attachmentMessages = messages.filter(
    (m) => m.type === LEGAL_MESSAGE_TYPE.ATTACHMENT && m.attachments?.length > 0
  );

  // Flatten all attachments from messages
  const allAttachments = attachmentMessages.flatMap((m) =>
    (m.attachments || []).map((att) => ({
      ...att,
      sentAt: m.createdAt,
      senderName: m.senderName,
    }))
  );

  // Combine with contract drafts for Documents section
  const allDocuments = [
    ...allAttachments.map((att) => ({
      id: att.storagePath || att.name,
      name: att.name,
      url: att.url,
      mimeType: att.type,
      size: att.size,
      date: att.sentAt,
      source: 'attachment',
    })),
    ...drafts.map((d) => ({
      id: d.id,
      name: d.fileName,
      url: d.fileUrl,
      mimeType: 'application/pdf',
      size: d.fileSize,
      date: d.createdAt,
      source: 'draft',
      version: d.version,
    })),
  ].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col h-full">
      {/* ── 1. Lawyer Profile ──────────────────────────────────────────────── */}
      <CollapsibleSection title="Lawyer" defaultOpen={true}>
        <div className="flex items-start gap-3">
          <InitialsAvatar name={engagement?.lawyerDisplayName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {engagement?.lawyerDisplayName || 'Lawyer'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Scale size={11} className="text-[#FFD700]" />
              <span className="text-xs text-[#8899AA]">Legal Counsel</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-green-400">Available</span>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 2. Deal Info ───────────────────────────────────────────────────── */}
      <CollapsibleSection title="Deal Info" defaultOpen={true}>
        {deal ? (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-[#4A5B6E]">Product</p>
              <p className="text-sm text-white font-medium truncate">
                {engagement?.dealProductName || deal?.productName || '—'}
              </p>
            </div>
            {deal?.buyerName && (
              <div>
                <p className="text-xs text-[#4A5B6E]">Buyer</p>
                <p className="text-sm text-white truncate">{deal.buyerName}</p>
              </div>
            )}
            {deal?.sellerName && (
              <div>
                <p className="text-xs text-[#4A5B6E]">Seller</p>
                <p className="text-sm text-white truncate">{deal.sellerName}</p>
              </div>
            )}
            {deal?.incoterms && (
              <div>
                <p className="text-xs text-[#4A5B6E]">Incoterms</p>
                <p className="text-sm text-white">{deal.incoterms}</p>
              </div>
            )}
            {deal?.price && (
              <div>
                <p className="text-xs text-[#4A5B6E]">Price</p>
                <p className="text-sm text-white">
                  {deal.currency || '$'} {Number(deal.price).toLocaleString()}
                </p>
              </div>
            )}
            {deal?.status && (
              <div>
                <p className="text-xs text-[#4A5B6E]">Deal Status</p>
                <p className="text-sm text-white capitalize">
                  {deal.status.replace(/_/g, ' ')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#8899AA]">Loading deal information...</p>
        )}
      </CollapsibleSection>

      {/* ── 3. Documents ───────────────────────────────────────────────────── */}
      <CollapsibleSection title={`Documents (${allDocuments.length})`} defaultOpen={true}>
        {allDocuments.length === 0 ? (
          <p className="text-xs text-[#8899AA]">No documents yet</p>
        ) : (
          <div className="space-y-2">
            {allDocuments.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] group transition-colors"
              >
                <FileIcon mimeType={doc.mimeType} size={14} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate group-hover:text-[#FFD700] transition-colors">
                    {doc.name}
                    {doc.version ? (
                      <span className="ml-1 text-[#8899AA]">v{doc.version}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[#4A5B6E]">
                    {doc.size ? formatFileSize(doc.size) : ''}
                    {doc.date
                      ? ` · ${format(doc.date instanceof Date ? doc.date : new Date(doc.date), 'MMM d')}`
                      : ''}
                  </p>
                </div>
                <Download size={12} className="text-[#4A5B6E] group-hover:text-[#FFD700] flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ── 4. Consulting Status ───────────────────────────────────────────── */}
      <CollapsibleSection title="Status" defaultOpen={true}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4A5B6E]">Status</span>
            <StatusBadge status={engagement?.status} />
          </div>
          {engagement?.createdAt && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A5B6E]">Started</span>
              <span className="text-xs text-[#8899AA]">
                {format(
                  engagement.createdAt instanceof Date
                    ? engagement.createdAt
                    : new Date(engagement.createdAt),
                  'MMM d, yyyy'
                )}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4A5B6E]">Client</span>
            <span className="text-xs text-[#8899AA] truncate max-w-[140px]">
              {engagement?.clientDisplayName || '—'}
            </span>
          </div>

          {/* Close engagement button */}
          {engagement?.isActive() && (
            <button
              onClick={onCloseEngagement}
              disabled={actionLoading}
              className="mt-3 w-full px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] text-[#8899AA] hover:text-white hover:border-red-500/40 hover:bg-red-500/10 text-xs transition-colors disabled:opacity-50"
            >
              Close Engagement
            </button>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default ChannelLeft;
