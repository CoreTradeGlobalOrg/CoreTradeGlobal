/**
 * Vercel Web Analytics live block — embedded in SiteAnalyticsSection.
 * Reads /api/analytics/vercel. Free-tier friendly (Hobby plan
 * gives 50K events/month + REST API access).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Globe,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Users,
} from 'lucide-react';

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

const VERCEL_TEAM_SLUG = null; // team slug not exposed to client; deep-link uses dashboard root

export function VercelLiveBlock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/vercel?refresh=1'
      : '/api/analytics/vercel';
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
        if (!cancelled) setError(err.message || 'Vercel request failed');
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
    return data.dailyTrend.reduce((m, d) => (d.pageviews > m ? d.pageviews : m), 0);
  }, [data]);

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.4)] bg-[rgba(255,255,255,0.02)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-white" />
          <h4 className="text-sm font-semibold text-white">Vercel Web Analytics — Live</h4>
          <span className="text-[10px] uppercase tracking-wider text-white/70 border border-white/20 bg-white/5 px-1.5 py-0.5 rounded">
            {data?.window?.days || 7}d window
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#A0A0A0] hover:text-white"
          >
            Open Vercel →
          </a>
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
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <p className="font-semibold mb-1">Vercel Analytics request failed</p>
          <p>{error}</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {loading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 h-20 animate-pulse"
            />
          ))
        ) : (
          <>
            <KpiTile icon={Users} label="Visitors" value={formatNumber(data.totals.visitors)} />
            <KpiTile
              icon={MousePointerClick}
              label="Pageviews"
              value={formatNumber(data.totals.pageviews)}
            />
            <KpiTile
              icon={Activity}
              label="PV / Visitor"
              value={
                data.totals.visitors > 0
                  ? (data.totals.pageviews / data.totals.visitors).toFixed(1)
                  : '—'
              }
            />
            <KpiTile
              icon={Activity}
              label="Window"
              value={`${data.window.since.slice(5)} → ${data.window.until.slice(5)}`}
            />
          </>
        )}
      </div>

      {/* Daily trend */}
      {!loading && data && data.dailyTrend.length > 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider">
              Daily Pageviews
            </h5>
            <span className="text-[10px] text-[#A0A0A0]">
              Peak: <span className="text-white font-semibold">{formatNumber(trendMax)}</span>
            </span>
          </div>
          <div className="flex items-end gap-[3px] h-20">
            {data.dailyTrend.map((d) => {
              const h = trendMax > 0
                ? Math.max((d.pageviews / trendMax) * 100, d.pageviews > 0 ? 4 : 0)
                : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 min-w-[4px] rounded-sm bg-white/30 hover:bg-white transition-colors"
                  style={{ height: `${h}%` }}
                  title={`${formatDate(d.date)}: ${d.pageviews} pv · ${d.visitors} visitors`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column: pages + sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
            Top Pages
          </h5>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.topPages.length === 0 ? (
            <p className="text-xs text-[#606060]">No pageviews yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-1.5 pr-2 font-medium">Path</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Views</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.slice(0, 10).map((p) => (
                  <tr key={p.path} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-1.5 pr-2">
                      {p.path === 'Others' || p.path === '(other)' ? (
                        <span className="text-[#606060]">{p.path}</span>
                      ) : (
                        <Link
                          href={p.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-white/70 truncate max-w-[180px] inline-block"
                          title={p.path}
                        >
                          {p.path}
                        </Link>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-white text-right tabular-nums font-medium">
                      {formatNumber(p.pageviews)}
                    </td>
                    <td className="py-1.5 pr-2 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(p.visitors)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
            Top Referrers
          </h5>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.sources.length === 0 ? (
            <p className="text-xs text-[#606060]">No referrer data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.sources.slice(0, 10).map((s) => {
                const total = data.totals.pageviews;
                const pct = total > 0 ? (s.pageviews / total) * 100 : 0;
                return (
                  <div key={s.referrer} className="flex items-center gap-3">
                    <span
                      className="w-32 shrink-0 text-xs text-white truncate"
                      title={s.referrer}
                    >
                      {s.referrer}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/50"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs text-white tabular-nums">
                      {formatNumber(s.pageviews)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Country + device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-3.5 h-3.5 text-white/70" />
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider">
              Top Countries
            </h5>
          </div>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.countries.length === 0 ? (
            <p className="text-xs text-[#606060]">No country data yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {data.countries.slice(0, 12).map((c) => {
                const total = data.totals.pageviews;
                const pct = total > 0 ? (c.pageviews / total) * 100 : 0;
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-white truncate">{c.country}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/50"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs text-white tabular-nums">
                      {formatNumber(c.pageviews)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-3.5 h-3.5 text-white/70" />
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider">
              By Device
            </h5>
          </div>
          {loading || !data ? (
            <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : data.devices.length === 0 ? (
            <p className="text-xs text-[#606060]">No device data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.devices.map((d) => {
                const total = data.totals.pageviews;
                const pct = total > 0 ? (d.pageviews / total) * 100 : 0;
                return (
                  <div key={d.device}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white capitalize">{d.device}</span>
                      <span className="text-[11px] text-[#A0A0A0] tabular-nums">
                        {formatNumber(d.pageviews)} pv · {formatNumber(d.visitors)} visitors
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/50"
                        style={{ width: `${pct}%` }}
                      />
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
          {data.cached && ` · cached ${Math.round((data.cachedAgeMs || 0) / 60000)} min`}
        </p>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
      <div className="flex items-center gap-1.5 text-[#A0A0A0] mb-1">
        <Icon className="w-3 h-3 text-white/70" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-white leading-none tabular-nums">{value}</p>
    </div>
  );
}
