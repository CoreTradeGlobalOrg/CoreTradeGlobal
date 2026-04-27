/**
 * QuoteFilters Component
 *
 * Shared UI primitives for QuotesPage: SectionHeader, FilterPills, SortSelect, EmptyState.
 * These components are local to the QuotesPage feature.
 */

'use client';

import { Activity, ArrowUpDown } from 'lucide-react';

export function SectionHeader({ icon, title, count, accentColor }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentColor.bg}`}>
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {count > 0 && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accentColor.badge}`}>
          {count}
        </span>
      )}
    </div>
  );
}

export function FilterPills({ options, value, onChange, accentColor }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            value === opt.value
              ? `${accentColor.activeFilter} border-transparent`
              : 'bg-transparent border-[#2A3B52] text-[#8899AA] hover:border-[#4A5B6E] hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SortSelect({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={12} className="text-[#8899AA]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs bg-[#1A283B] border border-[#2A3B52] text-[#8899AA] rounded-lg px-2 py-1 focus:outline-none focus:border-[#4A5B6E]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="border border-dashed border-[#2A3B52] rounded-xl p-8 text-center">
      <Activity size={24} className="text-[#4A5B6E] mx-auto mb-2" />
      <p className="text-sm text-[#4A5B6E]">{message}</p>
    </div>
  );
}
