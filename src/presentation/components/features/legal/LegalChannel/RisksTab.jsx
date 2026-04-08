'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, X, CheckCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { RISK_SEVERITY, RISK_STATUS } from '@/core/constants/legalConstants';

function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'MMM d, yyyy');
}

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${configs[severity] || ''}`}>
      {labels[severity] || severity}
    </span>
  );
}

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

/**
 * RisksTab - Risk analysis cards with CRUD operations.
 */
export function RisksTab({ riskItems, onAddRisk, onToggleRiskStatus, isLawyer, isReadOnly }) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddRisk = async (riskData) => {
    setShowAddForm(false);
    await onAddRisk?.(riskData);
  };

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
            {highCount > 0 && <span className="text-red-400 font-medium"> ({highCount} high</span>}
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
                    <span className="text-[10px] text-[#4A5B6E]">{formatDate(risk.createdAt)}</span>
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
