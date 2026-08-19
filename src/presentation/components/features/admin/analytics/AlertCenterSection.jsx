/**
 * Alert Center — Bölüm 11 of the plan.
 *
 * Every other section surfaces its own warnings inline (stalled
 * deals, ads about to expire, dormant members, missing team logs,
 * incomplete profiles). This section pulls them all into one
 * priority-ordered feed so an admin can start the day here and
 * only jump into a section when something actually needs doing.
 *
 * First pass runs the rule engine live off getAlertCenter() —
 * no persistent `alerts` table yet, no snooze/acknowledge, no
 * assignment. Those land when the backend migration puts SQL under
 * this layer; the panel shell stays the same.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { ALERT_LEVEL_META, getAlertCenter } from '@/lib/analytics/queries';

const LEVEL_ORDER = ['critical', 'high', 'medium', 'low'];

const LEVEL_ICON = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Info,
};

const CATEGORY_LABEL = {
  'trade-flow': 'Trade Flow',
  ads: 'Ads',
  members: 'Members',
  'team-log': 'Team Log',
  profile: 'Profile Health',
};

function formatAge(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

function LevelCard({ level, count }) {
  const meta = ALERT_LEVEL_META[level];
  const Icon = LEVEL_ICON[level];
  return (
    <div
      className="rounded-2xl border p-4 flex items-center gap-3"
      style={{
        borderColor: `${meta.color}40`,
        background: `${meta.color}0d`,
      }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: meta.color }} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
          {meta.label}
        </p>
        <p className="text-2xl font-bold text-white leading-none tabular-nums mt-0.5">
          {count}
        </p>
      </div>
    </div>
  );
}

export function AlertCenterSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAlertCenter()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load alerts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.alerts.map((a) => a.category));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.alerts.filter((a) => {
      if (levelFilter !== 'all' && a.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (q) {
        const blob = `${a.title} ${a.detail} ${a.actor}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [data, levelFilter, categoryFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Alert Center</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Every warning from across the dashboard, in one prioritized feed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Level count cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !data
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-16 animate-pulse"
              />
            ))
          : LEVEL_ORDER.map((lvl) => (
              <LevelCard key={lvl} level={lvl} count={data.counts[lvl] || 0} />
            ))}
      </div>

      {/* Alerts list */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white">Alerts</h4>
            {!loading && (
              <span className="text-xs text-[#A0A0A0]">({filtered.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#606060] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/50 w-48"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[#FFD700]/50"
            >
              <option value="all">All levels</option>
              {LEVEL_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {ALERT_LEVEL_META[lvl].label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[#FFD700]/50"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c] || c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[#606060] text-sm">
            {(!data || data.alerts.length === 0)
              ? 'No alerts right now — everything looks green.'
              : 'No alerts match this filter.'}
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
            {filtered.map((alert) => {
              const meta = ALERT_LEVEL_META[alert.level];
              const Icon = LEVEL_ICON[alert.level];
              const category = CATEGORY_LABEL[alert.category] || alert.category;
              return (
                <li key={alert.id} className="py-3 flex items-start gap-3">
                  <Icon
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    style={{ color: meta.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{alert.title}</span>
                      <span
                        className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                        style={{
                          color: meta.color,
                          borderColor: `${meta.color}55`,
                          background: `${meta.color}12`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] border border-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded">
                        {category}
                      </span>
                    </div>
                    <p className="text-xs text-[#A0A0A0] mt-0.5">
                      {alert.actor && <span className="text-white">{alert.actor}</span>}
                      {alert.actor && ' · '}
                      {alert.detail}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {alert.ageDays !== null && (
                      <span className="text-[11px] text-[#606060] tabular-nums whitespace-nowrap">
                        {formatAge(alert.ageDays)}
                      </span>
                    )}
                    {alert.actionHref && (
                      <Link
                        href={alert.actionHref}
                        className="inline-flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-[#FFD700] transition-colors whitespace-nowrap"
                      >
                        Go
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Computed at {data.snapshotAt.toLocaleTimeString('en-US')}
        </p>
      )}
    </div>
  );
}
