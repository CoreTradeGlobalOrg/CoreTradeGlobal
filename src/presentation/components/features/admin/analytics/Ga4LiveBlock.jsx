/**
 * GA4 live metrics block — embedded inside SiteAnalyticsSection.
 *
 * Reads through /api/analytics/ga4 (server route with service-
 * account credentials). Renders KPIs, daily trend, top pages,
 * traffic sources, country + device breakdown for the last
 * 28 days.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Clock,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatPercent(p) {
  if (p === null || p === undefined) return '—';
  return `${(p * 100).toFixed(1)}%`;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

const CHANNEL_COLORS = {
  'Organic Search': '#10B981',
  'Direct': '#3B82F6',
  'Referral': '#8B5CF6',
  'Organic Social': '#F59E0B',
  'Paid Search': '#F97316',
  'Email': '#EC4899',
  '(other)': '#606060',
  'Unassigned': '#606060',
};

export function Ga4LiveBlock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/ga4?refresh=1'
      : '/api/analytics/ga4';
    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok || !body?.ok) throw new Error(body?.error || `HTTP ${r.status}`);
        return body;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'GA4 request failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const trendMax = useMemo(() => {
    if (!data?.dailyTrend?.length) return 0;
    return data.dailyTrend.reduce((m, d) => (d.sessions > m ? d.sessions : m), 0);
  }, [data]);

  return (
    <div className="rounded-2xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.03)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#10B981]" />
          <h4 className="text-sm font-semibold text-white">Google Analytics 4 — Live</h4>
          <span className="text-[10px] uppercase tracking-wider text-green-400 border border-green-400/30 bg-green-400/5 px-1.5 py-0.5 rounded">
            {data?.window?.days || 28}d window
          </span>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <p className="font-semibold mb-1">GA4 request failed</p>
          <p>{error}</p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {loading || !data ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 h-20 animate-pulse"
            />
          ))
        ) : (
          <>
            <KpiTile icon={Users} label="Active Users" value={formatNumber(data.totals.activeUsers)} />
            <KpiTile icon={TrendingUp} label="Sessions" value={formatNumber(data.totals.sessions)} />
            <KpiTile icon={MousePointerClick} label="Pageviews" value={formatNumber(data.totals.pageViews)} />
            <KpiTile icon={TrendingDown} label="Bounce" value={formatPercent(data.totals.bounceRate)} />
            <KpiTile icon={Clock} label="Avg Session" value={formatDuration(data.totals.avgSessionSeconds)} />
            <KpiTile icon={TrendingUp} label="Engagement" value={formatPercent(data.totals.engagementRate)} />
          </>
        )}
      </div>

      {/* Daily trend bars */}
      {!loading && data && data.dailyTrend.length > 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider">Daily Sessions</h5>
            <span className="text-[10px] text-[#A0A0A0]">
              Peak: <span className="text-white font-semibold">{formatNumber(trendMax)}</span>
            </span>
          </div>
          <div className="flex items-end gap-[2px] h-20">
            {data.dailyTrend.map((d) => {
              const h = trendMax > 0
                ? Math.max((d.sessions / trendMax) * 100, d.sessions > 0 ? 4 : 0)
                : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 min-w-[2px] rounded-sm bg-[#10B981]/40 hover:bg-[#10B981] transition-colors"
                  style={{ height: `${h}%` }}
                  title={`${formatDate(d.date)}: ${d.sessions} sessions, ${d.activeUsers} users`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Traffic sources + Top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Traffic Sources</h5>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.sources.length === 0 ? (
            <p className="text-xs text-[#606060]">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {data.sources.slice(0, 8).map((s) => {
                const total = data.totals.sessions;
                const pct = total > 0 ? (s.sessions / total) * 100 : 0;
                const color = CHANNEL_COLORS[s.channel] || '#606060';
                return (
                  <div key={s.channel} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-white truncate">{s.channel}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.75 }} />
                    </div>
                    <span className="w-24 text-right text-xs text-white tabular-nums">
                      {formatNumber(s.sessions)}{' '}
                      <span className="text-[#606060]">({Math.round(pct)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Top Pages</h5>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.topPages.length === 0 ? (
            <p className="text-xs text-[#606060]">No page views yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-1.5 pr-2 font-medium">Path</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Views</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Users</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.slice(0, 10).map((p) => (
                  <tr key={p.path} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-1.5 pr-2 text-white">
                      <Link
                        href={p.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#10B981] truncate max-w-[180px] inline-block"
                        title={p.path}
                      >
                        {p.path || '/'}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-2 text-white text-right tabular-nums font-medium">
                      {formatNumber(p.pageViews)}
                    </td>
                    <td className="py-1.5 pr-2 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(p.activeUsers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Country + device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Top Countries</h5>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.countries.length === 0 ? (
            <p className="text-xs text-[#606060]">No visitors yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {data.countries.slice(0, 12).map((c) => {
                const total = data.totals.activeUsers;
                const pct = total > 0 ? (c.activeUsers / total) * 100 : 0;
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-white truncate">{c.country}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${pct}%`, opacity: 0.75 }} />
                    </div>
                    <span className="w-16 text-right text-xs text-white tabular-nums">
                      {formatNumber(c.activeUsers)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-3.5 h-3.5 text-[#FFD700]" />
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider">By Device</h5>
          </div>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.devices.length === 0 ? (
            <p className="text-xs text-[#606060]">No device data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.devices.map((d) => {
                const total = data.totals.activeUsers;
                const pct = total > 0 ? (d.activeUsers / total) * 100 : 0;
                return (
                  <div key={d.device}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white capitalize">{d.device}</span>
                      <span className="text-[11px] text-[#A0A0A0] tabular-nums">
                        {formatNumber(d.activeUsers)} users · {formatPercent(d.bounceRate)} bounce
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div className="h-full rounded-full bg-[#FFD700]" style={{ width: `${pct}%`, opacity: 0.75 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {data?.snapshotAt && (
        <p className="text-[10px] text-[#606060]">
          Fetched at {new Date(data.snapshotAt).toLocaleTimeString('en-US')}
          {data.cached && ` · cached ${Math.round((data.cachedAgeMs || 0) / 1000)}s`}
        </p>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
      <div className="flex items-center gap-1.5 text-[#A0A0A0] mb-1">
        <Icon className="w-3 h-3 text-[#10B981]" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-white leading-none tabular-nums">{value}</p>
    </div>
  );
}
