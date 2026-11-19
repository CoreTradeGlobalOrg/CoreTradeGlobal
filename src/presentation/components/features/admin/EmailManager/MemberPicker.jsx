'use client';

/**
 * MemberPicker
 *
 * Filter registered accounts and tick the ones to email. Admins, banned,
 * deleted and suspended accounts are not listed (the server drops them too).
 * Segments come from the analytics segmentation and load on demand, since
 * computing them reads every product, RFQ and conversation.
 */

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Users } from 'lucide-react';
import { COUNTRIES } from '@/core/constants/countries';
import { ROLES, ROLE_DISPLAY_NAMES } from '@/core/constants/roles';

const selectClass =
  'bg-[#1a2a3a] border border-[rgba(255,255,255,0.15)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50';

function countryLabel(code) {
  return COUNTRIES.find((c) => c.value === code)?.label || code;
}

function isEmailable(user) {
  return user.role !== ROLES.ADMIN && !user.isDeleted && !user.isSuspended && !!user.email;
}

function displayName(user) {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || '(no name)';
}

export function MemberPicker({ users, selected, onChange }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [approval, setApproval] = useState('all');
  const [verified, setVerified] = useState('all');
  const [country, setCountry] = useState('all');
  const [segments, setSegments] = useState(null);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentId, setSegmentId] = useState('all');

  const eligible = useMemo(() => users.filter(isEmailable), [users]);

  const countries = useMemo(
    () => [...new Set(eligible.map((u) => u.country).filter(Boolean))].sort((a, b) => countryLabel(a).localeCompare(countryLabel(b))),
    [eligible]
  );

  const segmentUids = useMemo(() => {
    if (segmentId === 'all' || !segments) return null;
    const segment = segments.find((s) => s.id === segmentId);
    return new Set((segment?.members || []).map((m) => m.uid));
  }, [segments, segmentId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eligible.filter((u) => {
      if (q && ![u.email, u.firstName, u.lastName, u.displayName, u.companyName].some((v) => v?.toLowerCase().includes(q))) return false;
      if (role !== 'all' && u.role !== role) return false;
      if (approval === 'approved' && u.adminApproved !== true) return false;
      if (approval === 'pending' && u.adminApproved === true) return false;
      if (verified === 'verified' && u.emailVerified !== true) return false;
      if (verified === 'unverified' && u.emailVerified === true) return false;
      if (country !== 'all' && u.country !== country) return false;
      if (segmentUids && !segmentUids.has(u.id)) return false;
      return true;
    });
  }, [eligible, search, role, approval, verified, country, segmentUids]);

  const allShownSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  async function loadSegments() {
    setSegmentsLoading(true);
    try {
      const { getMemberSegments } = await import('@/lib/analytics/queries');
      const result = await getMemberSegments();
      setSegments(result.segments);
    } catch (err) {
      console.error('MemberPicker: segments error:', err);
      toast.error('Could not load segments.');
    } finally {
      setSegmentsLoading(false);
    }
  }

  function toggle(uid) {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    onChange(next);
  }

  function toggleAllShown() {
    const next = new Set(selected);
    for (const u of filtered) {
      if (allShownSelected) next.delete(u.id);
      else next.add(u.id);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a7a]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or company"
          className="w-full pl-9 pr-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#FFD700]/50"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass} aria-label="Role">
          <option value="all">All roles</option>
          {[ROLES.MEMBER, ROLES.LOGISTICS_PROVIDER, ROLES.INSURANCE_PROVIDER, ROLES.LAWYER].map((r) => (
            <option key={r} value={r}>{ROLE_DISPLAY_NAMES[r] || r}</option>
          ))}
        </select>
        <select value={approval} onChange={(e) => setApproval(e.target.value)} className={selectClass} aria-label="Approval">
          <option value="all">Any approval</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending approval</option>
        </select>
        <select value={verified} onChange={(e) => setVerified(e.target.value)} className={selectClass} aria-label="Email verification">
          <option value="all">Any email status</option>
          <option value="verified">Email verified</option>
          <option value="unverified">Email not verified</option>
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass} aria-label="Country">
          <option value="all">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{countryLabel(c)}</option>
          ))}
        </select>
        {segments ? (
          <select value={segmentId} onChange={(e) => setSegmentId(e.target.value)} className={`${selectClass} col-span-2 lg:col-span-1`} aria-label="Segment">
            <option value="all">Any segment</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>{s.label} ({s.count})</option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={loadSegments}
            disabled={segmentsLoading}
            className="col-span-2 lg:col-span-1 px-3 py-2 rounded-lg text-sm border border-[rgba(255,255,255,0.15)] text-[#A0A0A0] hover:text-white disabled:opacity-50"
          >
            {segmentsLoading ? 'Loading segments...' : 'Filter by segment'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[#A0A0A0]">
          {filtered.length} shown · <span className="text-[#FFD700] font-semibold">{selected.size} selected</span>
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleAllShown}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 rounded-lg border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 disabled:opacity-50"
          >
            {allShownSelected ? `Unselect ${filtered.length} shown` : `Select ${filtered.length} shown`}
          </button>
          <button
            type="button"
            onClick={() => onChange(new Set())}
            disabled={selected.size === 0}
            className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.15)] text-[#A0A0A0] hover:text-white disabled:opacity-50"
          >
            Clear selection
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.08)] divide-y divide-[rgba(255,255,255,0.05)]">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#5a6a7a]">
            <Users className="w-5 h-5 mx-auto mb-2" />
            No accounts match these filters.
          </p>
        ) : (
          filtered.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] [content-visibility:auto] [contain-intrinsic-size:auto_52px]"
            >
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
                className="w-4 h-4 accent-[#FFD700] flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">
                  {displayName(u)}
                  {u.companyName && <span className="text-[#A0A0A0]"> · {u.companyName}</span>}
                </p>
                <p className="text-xs text-[#5a6a7a] truncate">{u.email}</p>
              </div>
              <span className="hidden sm:block text-xs text-[#5a6a7a] flex-shrink-0">
                {u.country ? countryLabel(u.country) : ''}
              </span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-[#5a6a7a]">Admins and banned, deleted or suspended accounts are never emailed.</p>
    </div>
  );
}
