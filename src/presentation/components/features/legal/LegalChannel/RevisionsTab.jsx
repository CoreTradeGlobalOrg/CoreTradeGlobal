'use client';

import { Clock, Download } from 'lucide-react';
import { format } from 'date-fns';

function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'MMM d, yyyy');
}

/**
 * RevisionsTab - Full version history timeline of contract drafts.
 */
export function RevisionsTab({ drafts }) {
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
