'use client';

/**
 * TemplatesPanel
 *
 * Lists `emailTemplates` (loaded by EmailManager) and opens TemplateEditor
 * for a new or existing one.
 */

import { useState } from 'react';
import { FileCode2, Plus } from 'lucide-react';
import { TemplateEditor } from './TemplateEditor';

function formatDate(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TemplatesPanel({ templates, loading, senders }) {
  // null = list view; 'new' = blank editor; otherwise the template id being edited
  const [editingId, setEditingId] = useState(null);

  if (editingId) {
    const template = editingId === 'new' ? null : templates.find((t) => t.id === editingId);
    return (
      <TemplateEditor
        // Remount when switching templates so the form state starts fresh.
        key={editingId}
        template={template}
        senders={senders}
        onClose={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wide">
          Templates ({templates.length})
        </h3>
        <button
          type="button"
          onClick={() => setEditingId('new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New template
        </button>
      </div>

      {loading ? (
        <div className="h-32 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.15)] p-8 text-center text-sm text-[#A0A0A0]">
          No templates yet. Create one and paste or upload your HTML.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEditingId(t.id)}
              className="w-full text-left rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#FFD700]/40 p-4 flex items-center gap-3 transition-colors"
            >
              <FileCode2 className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{t.name || 'Untitled template'}</p>
                <p className="text-xs text-[#A0A0A0] truncate">{t.subject || 'No subject'}</p>
              </div>
              <span className="text-xs text-[#5a6a7a] flex-shrink-0">{formatDate(t.updatedAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
