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
 *   onApproveDraft    - Approve latest draft handler
 *   approveLoading    - Whether approval is in progress
 *   isLawyer          - Whether current user is the lawyer
 *   isReadOnly        - Whether the channel is completed
 */

'use client';

import { useState } from 'react';
import { FileText, Clock, AlertTriangle } from 'lucide-react';
import { ContractTab } from './ContractTab';
import { RevisionsTab } from './RevisionsTab';
import { RisksTab } from './RisksTab';

const TABS = [
  { id: 'contract', label: 'Contract', Icon: FileText },
  { id: 'revisions', label: 'Revisions', Icon: Clock },
  { id: 'risks', label: 'Risks', Icon: AlertTriangle },
];

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
          const count =
            id === 'revisions' ? drafts.length : id === 'risks' ? riskItems.length : null;

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
