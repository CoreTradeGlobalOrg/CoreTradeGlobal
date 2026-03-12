/**
 * LegalChannel Component
 *
 * 3-panel layout for the legal consulting channel:
 *   Left panel (~25%):   Lawyer profile, deal info, documents, engagement status
 *   Center panel (~50%): Encrypted chat with quick-action toolbar
 *   Right panel (~25%):  Contract drafts, revision history, risk analysis
 *
 * Mobile: center panel shown by default, left/right panels toggleable via header buttons.
 *
 * Props:
 *   engagement  - LegalEngagement entity
 *   deal        - Deal entity (may be null while loading)
 *   currentUser - Firebase auth user object
 *   isLawyer    - Whether current user is the lawyer in this engagement
 *   isReadOnly  - Whether the channel is completed (no new messages/actions)
 */

'use client';

import { useState } from 'react';
import { Lock, PanelLeft, PanelRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLegalMessages } from '@/presentation/hooks/legal/useLegalMessages';
import { useLegalChannel } from '@/presentation/hooks/legal/useLegalChannel';
import { useLegalActions } from '@/presentation/hooks/legal/useLegalActions';
import { ChannelLeft } from './ChannelLeft';
import { ChannelCenter } from './ChannelCenter';
import { ChannelRight } from './ChannelRight';
import { ENGAGEMENT_STATUS } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function EngagementStatusBadge({ status }) {
  const configs = {
    [ENGAGEMENT_STATUS.ACTIVE]: {
      label: 'Active',
      className: 'bg-green-500/20 border border-green-500/30 text-green-400',
    },
    [ENGAGEMENT_STATUS.COMPLETED]: {
      label: 'Completed',
      className:
        'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-[#8899AA]',
    },
    [ENGAGEMENT_STATUS.PENDING]: {
      label: 'Pending',
      className: 'bg-amber-500/20 border border-amber-500/30 text-amber-400',
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LegalChannel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/domain/entities/LegalEngagement').LegalEngagement} props.engagement
 * @param {Object|null} props.deal
 * @param {Object} props.currentUser
 * @param {boolean} props.isLawyer
 * @param {boolean} props.isReadOnly
 */
export function LegalChannel({ engagement, deal, currentUser, isLawyer, isReadOnly }) {
  // Mobile panel visibility
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Hooks
  const { messages, sendMessage, uploadAndSendAttachment, sending } = useLegalMessages(
    engagement?.id,
    currentUser
  );
  const { drafts, riskItems, uploadDraft, addRisk, toggleRiskStatus } = useLegalChannel(
    engagement?.id,
    currentUser
  );
  const { closeLegalEngagement, loading: actionLoading } = useLegalActions();

  const handleCloseEngagement = () => {
    if (!engagement?.id) return;
    setShowCloseDialog(true);
  };

  const confirmCloseEngagement = async () => {
    setShowCloseDialog(false);
    await closeLegalEngagement(engagement.id);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F1C2E] overflow-hidden pt-[80px]">
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#0D1927] border-b border-[rgba(255,255,255,0.08)] h-12">
        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <Link
            href={`/deals/${engagement?.dealId}`}
            className="text-[#8899AA] hover:text-white transition-colors flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Deal</span>
          </Link>
          <span className="text-[rgba(255,255,255,0.2)]">/</span>
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Encrypted &amp; Private</span>
          </div>
          <EngagementStatusBadge status={engagement?.status} />
        </div>

        {/* Right: actions + mobile panel toggles */}
        <div className="flex items-center gap-2">
          {/* Close engagement button */}
          {engagement?.isActive() && !isReadOnly && (
            <button
              onClick={handleCloseEngagement}
              disabled={actionLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#8899AA] hover:text-white text-xs transition-colors"
            >
              Close Engagement
            </button>
          )}

          {/* Mobile panel toggles */}
          <button
            onClick={() => {
              setShowLeft((v) => !v);
              setShowRight(false);
            }}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              showLeft
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-[#8899AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
            }`}
            aria-label="Toggle left panel"
          >
            <PanelLeft size={16} />
          </button>
          <button
            onClick={() => {
              setShowRight((v) => !v);
              setShowLeft(false);
            }}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              showRight
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-[#8899AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
            }`}
            aria-label="Toggle right panel"
          >
            <PanelRight size={16} />
          </button>
        </div>
      </div>

      {/* ── 3-panel layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel */}
        <div
          className={`
            flex-shrink-0 w-72 border-r border-[rgba(255,255,255,0.08)] bg-[#0D1927] overflow-y-auto
            md:block
            ${showLeft ? 'block absolute inset-y-0 left-0 z-20 top-[128px]' : 'hidden'}
          `}
        >
          <ChannelLeft
            engagement={engagement}
            deal={deal}
            messages={messages}
            drafts={drafts}
            isLawyer={isLawyer}
            onCloseEngagement={handleCloseEngagement}
            actionLoading={actionLoading}
          />
        </div>

        {/* Center panel (always visible, fills remaining space) */}
        <div
          className={`
            flex-1 flex flex-col min-w-0
            ${showLeft || showRight ? 'hidden md:flex' : 'flex'}
          `}
        >
          <ChannelCenter
            messages={messages}
            sendMessage={sendMessage}
            uploadAndSendAttachment={uploadAndSendAttachment}
            currentUser={currentUser}
            isLawyer={isLawyer}
            isReadOnly={isReadOnly}
            engagement={engagement}
            sending={sending}
            onUploadDraft={uploadDraft}
            onAddRisk={addRisk}
          />
        </div>

        {/* Right panel */}
        <div
          className={`
            flex-shrink-0 w-80 border-l border-[rgba(255,255,255,0.08)] bg-[#0D1927] overflow-y-auto
            md:block
            ${showRight ? 'block absolute inset-y-0 right-0 z-20 top-[128px]' : 'hidden'}
          `}
        >
          <ChannelRight
            drafts={drafts}
            riskItems={riskItems}
            onUploadDraft={uploadDraft}
            onAddRisk={addRisk}
            onToggleRiskStatus={toggleRiskStatus}
            isLawyer={isLawyer}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* ── Close Engagement Dialog ──────────────────────────────────────── */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A283B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Close Engagement</h3>
            <p className="text-sm text-[#8899AA] mb-6">
              Are you sure you want to close this legal engagement? The channel will become
              read-only and this action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCloseDialog(false)}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseEngagement}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Closing...' : 'Close Engagement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalChannel;
