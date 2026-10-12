'use client';

/**
 * Small presentational pieces for the RFQ Quotes view (Trades tab).
 */

import { Search, Filter, ChevronDown, Inbox } from 'lucide-react';

const STAT_TONES = {
  gold: { box: 'bg-[#FFD700]/5 border-[#FFD700]/20', text: 'text-white' },
  yellow: { box: 'bg-yellow-900/10 border-yellow-700/20', text: 'text-yellow-400' },
  green: { box: 'bg-green-900/10 border-green-700/20', text: 'text-green-400' },
};

export function StatCard({ value, label, tone = 'gold' }) {
  const t = STAT_TONES[tone] || STAT_TONES.gold;
  return (
    <div className={`rounded-xl p-3 border ${t.box}`}>
      <p className={`text-2xl font-bold ${t.text}`}>{value}</p>
      <p className="text-xs text-[#A0A0A0]">{label}</p>
    </div>
  );
}

export function StatusPill({ status, config }) {
  const c = config[status] || { label: status || '—', color: 'text-gray-400 bg-gray-900/20 border-gray-700/30' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 ${c.color}`}>
      {c.label}
    </span>
  );
}

export function QuotesToolbar({
  searchQuery, onSearchChange, searchPlaceholder,
  statusFilter, onStatusChange, statusOptions, totalCount,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-base sm:text-sm placeholder:text-[#64748b] focus:outline-none focus:border-[#FFD700]/50"
        />
      </div>
      <div className="relative">
        <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full sm:w-auto appearance-none pl-10 pr-9 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-base sm:text-sm focus:outline-none focus:border-[#FFD700]/50 cursor-pointer"
        >
          <option value="all">All Statuses ({totalCount})</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFD700]" />
      </div>
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="text-center py-12">
      <Inbox className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
      <p className="text-[#A0A0A0]">{text}</p>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
    </div>
  );
}
