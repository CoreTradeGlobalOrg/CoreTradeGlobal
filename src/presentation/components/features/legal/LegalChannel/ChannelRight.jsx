/**
 * ChannelRight Component
 *
 * Right panel for the legal channel with 3 tabs:
 *   Contract  - Latest contract draft with download and upload new
 *   Revisions - Full version history timeline
 *   Risks     - Risk analysis cards with CRUD operations
 *
 * Props:
 *   drafts            - Contract draft objects array
 *   riskItems         - Risk item objects array
 *   onUploadDraft     - Upload new draft handler (file)
 *   onAddRisk         - Add risk item handler (riskData)
 *   onToggleRiskStatus - Toggle risk open/resolved
 *   isLawyer          - Whether current user is the lawyer
 *   isReadOnly        - Whether the channel is completed
 */

'use client';

import { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Upload,
  Clock,
  AlertTriangle,
  Plus,
  Check,
  CheckCircle,
  Circle,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { RISK_SEVERITY, RISK_STATUS } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Version badge
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Severity badge
// ─────────────────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const configs = {
    [RISK_SEVERITY.HIGH]: 'bg-red-500/20 border border-red-500/30 text-red-400',
    [RISK_SEVERITY.MEDIUM]: 'bg-amber-500/20 border border-amber-500/30 text-amber-400',
    [RISK_SEVERITY.LOW]: 'bg-green-500/20 border border-green-500/30 text-green-400',
  };
  const labels = {
    [RISK_SEVERITY.HIGH]: 'High',
    [RISK_SEVERITY.MEDIUM]: 'Medium',
    [RISK_SEVERITY.LOW]: 'Low',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${configs[severity] || ''}`}
    >
      {labels[severity] || severity}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract tab
// ─────────────────────────────────────────────────────────────────────────────

function ContractTab({ drafts, onUploadDraft, onApproveDraft, approveLoading, isLawyer, isReadOnly }) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Revisions tab
// ─────────────────────────────────────────────────────────────────────────────

function RevisionsTab({ drafts }) {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
        <Clock size={32} className="text-[#4A5B6E]" />
        <p className="text-sm text-[#8899AA]">No revision history yet</p>
      </div>
    );
  }

  // Sort descending by version (latest first)
  const sortedDrafts = [...drafts].sort((a, b) => b.version - a.version);
  const latestVersion = sortedDrafts[0].version;

  return (
    <div className="p-4">
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3.5 top-4 bottom-4 w-px bg-[rgba(255,255,255,0.08)]" />

        <div className="space-y-4">
          {sortedDrafts.map((draft) => {
            const isLatest = draft.version === latestVersion;
            return (
              <div key={draft.id} className="flex gap-3">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    isLatest
                      ? 'bg-purple-600 border-purple-500'
                      : 'bg-[#1A283B] border-[rgba(255,255,255,0.12)]'
                  }`}
                >
                  <span className="text-[9px] font-bold text-white">v{draft.version}</span>
                </div>

                {/* Draft info */}
                <div className={`flex-1 min-w-0 rounded-lg p-3 ${isLatest ? 'border border-purple-500/20 bg-purple-500/5' : 'border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate min-w-0">{draft.fileName}</p>
                    {isLatest && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#4A5B6E]">
                      {draft.uploaderName} · {formatDate(draft.createdAt)}
                    </span>
                    <a
                      href={draft.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#8899AA] hover:text-[#FFD700] transition-colors flex items-center gap-1"
                    >
                      <Download size={10} />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add risk form
// ─────────────────────────────────────────────────────────────────────────────

function AddRiskForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(RISK_SEVERITY.MEDIUM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), severity, status: RISK_STATUS.OPEN });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-400" />
          <span className="text-xs font-medium text-white">New Risk Item</span>
        </div>
        <button type="button" onClick={onCancel} className="text-[#4A5B6E] hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Risk title (required)"
        required
        className="w-full px-2.5 py-1.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white placeholder-[#4A5B6E] focus:outline-none focus:border-amber-500/60"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (required)"
        required
        rows={2}
        className="w-full px-2.5 py-1.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white placeholder-[#4A5B6E] focus:outline-none focus:border-amber-500/60 resize-none"
      />
      <div className="flex gap-2">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="flex-1 px-2.5 py-1.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/60"
        >
          <option value={RISK_SEVERITY.LOW}>Low</option>
          <option value={RISK_SEVERITY.MEDIUM}>Medium</option>
          <option value={RISK_SEVERITY.HIGH}>High</option>
        </select>
        <button
          type="submit"
          disabled={!title.trim() || !description.trim()}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#0F1C2E] font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Risks tab
// ─────────────────────────────────────────────────────────────────────────────

function RisksTab({ riskItems, onAddRisk, onToggleRiskStatus, isLawyer, isReadOnly }) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddRisk = async (riskData) => {
    setShowAddForm(false);
    await onAddRisk?.(riskData);
  };

  // Risk counts by severity
  const highCount = riskItems.filter((r) => r.severity === RISK_SEVERITY.HIGH).length;
  const mediumCount = riskItems.filter((r) => r.severity === RISK_SEVERITY.MEDIUM).length;
  const lowCount = riskItems.filter((r) => r.severity === RISK_SEVERITY.LOW).length;

  return (
    <div className="p-4 space-y-3">
      {/* Summary */}
      {riskItems.length > 0 && (
        <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-[#8899AA]">
            <span className="text-white font-medium">{riskItems.length}</span> risk
            {riskItems.length !== 1 ? 's' : ''} identified
            {highCount > 0 && (
              <span className="text-red-400 font-medium"> ({highCount} high</span>
            )}
            {mediumCount > 0 && (
              <span className="text-amber-400 font-medium">{highCount > 0 ? ', ' : ' ('}{mediumCount} medium</span>
            )}
            {lowCount > 0 && (
              <span className="text-green-400 font-medium">
                {highCount > 0 || mediumCount > 0 ? ', ' : ' ('}
                {lowCount} low
              </span>
            )}
            {(highCount > 0 || mediumCount > 0 || lowCount > 0) && ')'}
          </p>
        </div>
      )}

      {/* Add risk form */}
      {showAddForm && (
        <AddRiskForm onSubmit={handleAddRisk} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Add risk button */}
      {isLawyer && !isReadOnly && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] hover:border-amber-500/40 hover:bg-amber-500/5 text-[#8899AA] hover:text-amber-400 text-xs transition-colors"
        >
          <Plus size={13} />
          Add Risk Item
        </button>
      )}

      {/* Risk cards */}
      {riskItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <AlertTriangle size={28} className="text-[#4A5B6E]" />
          <p className="text-xs text-[#8899AA]">No risk items identified yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {riskItems.map((risk) => {
            const isResolved = risk.status === RISK_STATUS.RESOLVED;
            return (
              <div
                key={risk.id}
                className={`p-3 rounded-xl border transition-colors ${
                  isResolved
                    ? 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] opacity-70'
                    : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className={`text-xs font-medium ${isResolved ? 'line-through text-[#8899AA]' : 'text-white'}`}>
                    {risk.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <SeverityBadge severity={risk.severity} />
                    {/* Toggle resolved/open (lawyer only) */}
                    {isLawyer && !isReadOnly && (
                      <button
                        onClick={() => onToggleRiskStatus?.(risk.id, risk.status)}
                        title={isResolved ? 'Mark as open' : 'Mark as resolved'}
                        className="text-[#4A5B6E] hover:text-white transition-colors"
                      >
                        {isResolved ? (
                          <Circle size={14} className="text-[#4A5B6E]" />
                        ) : (
                          <CheckCircle size={14} className="text-green-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-[#8899AA] leading-relaxed">{risk.description}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isResolved
                        ? 'bg-[rgba(255,255,255,0.06)] text-[#4A5B6E]'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {isResolved ? 'Resolved' : 'Open'}
                  </span>
                  {risk.createdAt && (
                    <span className="text-[10px] text-[#4A5B6E]">
                      {formatDate(risk.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChannelRight
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'contract', label: 'Contract', Icon: FileText },
  { id: 'revisions', label: 'Revisions', Icon: Clock },
  { id: 'risks', label: 'Risks', Icon: AlertTriangle },
];

/**
 * @param {Object} props
 * @param {Object[]} props.drafts
 * @param {Object[]} props.riskItems
 * @param {Function} props.onUploadDraft
 * @param {Function} props.onAddRisk
 * @param {Function} props.onToggleRiskStatus
 * @param {Function} props.onApproveDraft
 * @param {boolean} props.approveLoading
 * @param {boolean} props.isLawyer
 * @param {boolean} props.isReadOnly
 */
export function ChannelRight({
  drafts,
  riskItems,
  onUploadDraft,
  onAddRisk,
  onToggleRiskStatus,
  onApproveDraft,
  approveLoading,
  isLawyer,
  isReadOnly,
}) {
  const [activeTab, setActiveTab] = useState('contract');

  return (
    <div className="flex flex-col h-full">
      {/* Tab headers */}
      <div className="flex-shrink-0 flex border-b border-[rgba(255,255,255,0.08)]">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          // Add count badges
          const count =
            id === 'revisions'
              ? drafts.length
              : id === 'risks'
              ? riskItems.length
              : null;

          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-white border-purple-500'
                  : 'text-[#4A5B6E] border-transparent hover:text-[#8899AA] hover:border-[rgba(255,255,255,0.1)]'
              }`}
            >
              <Icon size={13} />
              {label}
              {count != null && count > 0 && (
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                    isActive ? 'bg-purple-500/30 text-purple-200' : 'bg-[rgba(255,255,255,0.08)] text-[#8899AA]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contract' && (
          <ContractTab
            drafts={drafts}
            onUploadDraft={onUploadDraft}
            onApproveDraft={onApproveDraft}
            approveLoading={approveLoading}
            isLawyer={isLawyer}
            isReadOnly={isReadOnly}
          />
        )}
        {activeTab === 'revisions' && <RevisionsTab drafts={drafts} />}
        {activeTab === 'risks' && (
          <RisksTab
            riskItems={riskItems}
            onAddRisk={onAddRisk}
            onToggleRiskStatus={onToggleRiskStatus}
            isLawyer={isLawyer}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    </div>
  );
}

export default ChannelRight;
