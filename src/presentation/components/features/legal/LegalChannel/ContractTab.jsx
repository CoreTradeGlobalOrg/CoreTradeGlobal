'use client';

import { useRef } from 'react';
import { FileText, Download, Upload, Check, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'MMM d, yyyy');
}

function VersionBadge({ version, isLatest }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
        isLatest
          ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
          : 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[#8899AA]'
      }`}
    >
      v{version}
    </span>
  );
}

/**
 * ContractTab - Latest contract draft with download and upload controls.
 */
export function ContractTab({ drafts, onUploadDraft, onApproveDraft, approveLoading, isLawyer, isReadOnly }) {
  const fileInputRef = useRef(null);
  const latestDraft = drafts.length > 0 ? drafts[drafts.length - 1] : null;

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await onUploadDraft?.(file);
  };

  if (!latestDraft) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
          <FileText size={20} className="text-[#4A5B6E]" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">No contract drafts yet</p>
          <p className="text-xs text-[#8899AA] mt-1">
            {isLawyer ? 'Upload the first draft to get started.' : 'Waiting for the lawyer to upload a draft.'}
          </p>
        </div>
        {isLawyer && !isReadOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload size={14} />
              Upload Draft
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Latest draft card */}
      <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-purple-300 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate min-w-0">{latestDraft.fileName}</span>
          </div>
          <VersionBadge version={latestDraft.version} isLatest={true} />
        </div>
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#4A5B6E]">Uploaded by</span>
            <span className="text-[#8899AA]">{latestDraft.uploaderName || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#4A5B6E]">Date</span>
            <span className="text-[#8899AA]">{formatDate(latestDraft.createdAt)}</span>
          </div>
          {latestDraft.fileSize && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4A5B6E]">Size</span>
              <span className="text-[#8899AA]">{formatFileSize(latestDraft.fileSize)}</span>
            </div>
          )}
        </div>
        <a
          href={latestDraft.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white text-xs font-medium transition-colors"
        >
          <Download size={13} />
          Download Draft
        </a>

        {/* Approve button — client only, active engagement, not yet approved */}
        {!isLawyer && !isReadOnly && !latestDraft.approvedAt && (
          <button
            onClick={() => onApproveDraft?.(latestDraft.id)}
            disabled={approveLoading}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Check size={13} />
            {approveLoading ? 'Approving...' : 'Approve & Apply to Deal'}
          </button>
        )}

        {/* Approved badge */}
        {latestDraft.approvedAt && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-green-400">
            <CheckCircle size={13} />
            Approved &amp; applied to deal
          </div>
        )}
      </div>

      {/* Upload new draft button (lawyer only) */}
      {isLawyer && !isReadOnly && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-purple-500/40 hover:bg-purple-500/10 text-[#8899AA] hover:text-white text-sm transition-colors"
          >
            <Upload size={14} />
            Upload New Draft (v{latestDraft.version + 1})
          </button>
        </>
      )}
    </div>
  );
}
