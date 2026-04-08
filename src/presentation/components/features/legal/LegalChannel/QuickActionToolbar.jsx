/**
 * QuickActionToolbar Component
 *
 * Role-aware quick-action buttons rendered above the chat input area.
 * Shows different buttons for lawyers vs clients based on QUICK_ACTIONS constants.
 *
 * Special handling:
 *   - "Attach File" action: triggers the file picker
 *   - "Send Draft" action (lawyer): opens file picker filtered to DOCX/PDF
 *   - "Flag Risk" action (lawyer): shows inline form for risk details
 *
 * Props:
 *   isLawyer       - Whether current user is the lawyer
 *   onAction       - Called when a quick action is triggered (action object)
 *   onAttachFile   - Triggers general file picker
 *   onUploadDraft  - Triggers draft upload flow
 *   onAddRisk      - Called with risk data to add a risk item
 *   isReadOnly     - Whether channel is read-only (completed)
 */

'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { riskItemSchema } from '@/core/validation/riskItemSchema';
import {
  CheckCircle,
  HelpCircle,
  Edit,
  Paperclip,
  FileText,
  AlertTriangle,
  CheckSquare,
  X,
} from 'lucide-react';
import { QUICK_ACTIONS, ALLOWED_LEGAL_FILE_TYPES, RISK_SEVERITY } from '@/core/constants/legalConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Icon mapper
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP = {
  CheckCircle,
  HelpCircle,
  Edit,
  Paperclip,
  FileText,
  AlertTriangle,
  CheckSquare,
};

function ActionIcon({ iconName, size = 14 }) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon size={size} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline risk form
// ─────────────────────────────────────────────────────────────────────────────

function RiskInlineForm({ onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(riskItemSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      title: '',
      description: '',
      severity: RISK_SEVERITY.MEDIUM,
    },
  });

  const handleFormSubmit = (data) => {
    onSubmit({ title: data.title, description: data.description || '', severity: data.severity, status: 'open' });
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="absolute bottom-full left-0 right-0 mb-2 bg-[#1A283B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 shadow-2xl z-10"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-white">Flag Risk</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[#4A5B6E] hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <input
            type="text"
            {...register('title')}
            placeholder="Risk title (required)"
            className={`w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border rounded-lg text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-purple-500/60 ${errors.title ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
          />
          {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <textarea
            {...register('description')}
            placeholder="Description (optional)"
            rows={2}
            className={`w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border rounded-lg text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-purple-500/60 resize-none ${errors.description ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <select
              {...register('severity')}
              className={`w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/60 ${errors.severity ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
            >
              <option value={RISK_SEVERITY.LOW}>Low severity</option>
              <option value={RISK_SEVERITY.MEDIUM}>Medium severity</option>
              <option value={RISK_SEVERITY.HIGH}>High severity</option>
            </select>
            {errors.severity && <p className="text-xs text-red-400 mt-1">{errors.severity.message}</p>}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#0F1C2E] font-semibold rounded-lg text-sm transition-colors"
          >
            Add Risk
          </button>
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickActionToolbar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {boolean} props.isLawyer
 * @param {Function} props.onAction - Called with action object for quick_action messages
 * @param {Function} props.onAttachFile - Trigger file picker for general attachments
 * @param {Function} props.onUploadDraft - Trigger draft file picker and upload
 * @param {Function} props.onAddRisk - Called with risk data { title, description, severity, status }
 * @param {boolean} props.isReadOnly
 */
export function QuickActionToolbar({
  isLawyer,
  onAction,
  onAttachFile,
  onUploadDraft,
  onAddRisk,
  isReadOnly,
}) {
  const [showRiskForm, setShowRiskForm] = useState(false);
  const draftFileInputRef = useRef(null);

  if (isReadOnly) return null;

  // Filter actions by role
  const roleKey = isLawyer ? 'lawyer' : 'client';
  const actions = Object.values(QUICK_ACTIONS).filter((a) => a.role === roleKey);

  const handleActionClick = (action) => {
    const actionId = action.id;

    // Attach file — trigger file picker
    if (actionId === 'attach_file') {
      onAttachFile?.();
      return;
    }

    // Send draft (lawyer only) — trigger draft file picker
    if (actionId === 'send_draft') {
      draftFileInputRef.current?.click();
      return;
    }

    // Flag risk (lawyer only) — show inline form
    if (actionId === 'flag_risk') {
      setShowRiskForm((v) => !v);
      return;
    }

    // All other actions: send as quick_action message
    onAction?.(action);
  };

  const handleDraftFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await onUploadDraft?.(file);
  };

  const handleRiskSubmit = async (riskData) => {
    setShowRiskForm(false);
    await onAddRisk?.(riskData);
  };

  return (
    <div className="relative flex items-center gap-1 px-3 py-1.5 border-t border-[rgba(255,255,255,0.06)]">
      {/* Hidden draft file input */}
      <input
        ref={draftFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleDraftFileSelected}
      />

      {/* Risk form popup */}
      {showRiskForm && (
        <RiskInlineForm
          onSubmit={handleRiskSubmit}
          onCancel={() => setShowRiskForm(false)}
        />
      )}

      {/* Action buttons */}
      {actions.map((action) => (
        <button
          key={`${action.role}-${action.id}`}
          onClick={() => handleActionClick(action)}
          title={action.label}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
            ${
              action.id === 'flag_risk' && showRiskForm
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-[#8899AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
            }
          `}
        >
          <ActionIcon iconName={action.icon} size={13} />
          <span className="hidden sm:inline">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export default QuickActionToolbar;
