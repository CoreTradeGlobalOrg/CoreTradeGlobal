/**
 * SEO & Organic Growth — Bölüm 17.
 *
 * Reads Google Search Console via the /api/analytics/seo route.
 * Data lag is 2-3 days by GSC's own choice — we default to a
 * 28-day window ending three days ago so every row is final.
 *
 * When the service account is fresh and Search Console hasn't
 * accumulated data yet (new verification, low-traffic domain),
 * cards show zeros with an informational banner rather than an
 * error.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Globe,
  Info,
  MousePointerClick,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
} from 'lucide-react';

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatCtr(ctr) {
  if (ctr === null || ctr === undefined) return '—';
  return `${(ctr * 100).toFixed(2)}%`;
}

function formatPosition(p) {
  if (!p || p <= 0) return '—';
  return p.toFixed(1);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

function truncateUrl(url, max = 60) {
  if (!url) return '';
  const stripped = url.replace(/^https?:\/\//, '');
  return stripped.length > max ? `${stripped.slice(0, max - 1)}…` : stripped;
}

export function SeoSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/seo?refresh=1'
      : '/api/analytics/seo';
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
        if (!cancelled) setError(err.message || 'Failed to load SEO data');
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
    return data.dailyTrend.reduce((m, d) => (d.impressions > m ? d.impressions : m), 0);
  }, [data]);

  const gscConsoleUrl = data?.siteUrl
    ? `https://search.google.com/search-console?resource_id=${encodeURIComponent(data.siteUrl)}`
    : 'https://search.google.com/search-console';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">SEO &amp; Organic Growth</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Google Search Console — clicks, impressions, ranking, top queries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={gscConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#A0A0A0] hover:text-[#FFD700] transition-colors inline-flex items-center gap-1"
          >
            Open Search Console <ExternalLink className="w-3 h-3" />
          </a>
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
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <p className="font-semibold mb-1">SEO data request failed</p>
          <p>{error}</p>
        </div>
      )}

      {/* Window / lag disclosure */}
      {!loading && data && (
        <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[#A0A0A0]">
            Window: <span className="text-white">{data.window.startDate}</span> →
            <span className="text-white"> {data.window.endDate}</span> ({data.window.days} days).
            Google Search Console holds data back 2-3 days for finality — panel window ends
            three days ago on purpose so no row is provisional.
          </p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-28 animate-pulse"
            />
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <MousePointerClick className="w-4 h-4 text-[#10B981]" />
                <p className="text-[10px] uppercase tracking-wider">Clicks</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.totals.clicks)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">{data.window.days}-day total</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-[10px] uppercase tracking-wider">Impressions</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.totals.impressions)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Search result appearances</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Search className="w-4 h-4 text-[#FFD700]" />
                <p className="text-[10px] uppercase tracking-wider">Avg CTR</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatCtr(data.totals.ctr)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Clicks / Impressions</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Globe className="w-4 h-4 text-[#8B5CF6]" />
                <p className="text-[10px] uppercase tracking-wider">Avg Position</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatPosition(data.totals.position)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Lower is better (1 = top result)</p>
            </div>
          </>
        )}
      </div>

      {/* Zero-data hint */}
      {!loading && data && data.totals.impressions === 0 && (
        <div className="rounded-2xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] p-4 text-xs text-[#A0A0A0]">
          <p className="text-white font-semibold mb-1">No indexed traffic yet</p>
          <p>
            Search Console has no impressions for this property in the last {data.window.days} days.
            Either the site is brand new (indexing takes weeks), no queries returned it in Google
            results, or the property was only just verified. Come back in a few days.
          </p>
        </div>
      )}

      {/* Daily trend */}
      {!loading && data && data.dailyTrend.length > 0 && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">Daily Trend (impressions)</h4>
            <span className="text-xs text-[#A0A0A0]">
              Peak: <span className="text-white font-semibold">{formatNumber(trendMax)}</span>
            </span>
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {data.dailyTrend.map((d) => {
              const h = trendMax > 0 ? Math.max((d.impressions / trendMax) * 100, d.impressions > 0 ? 4 : 0) : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 min-w-[2px] rounded-sm bg-[#3B82F6]/40 hover:bg-[#3B82F6] transition-colors"
                  style={{ height: `${h}%` }}
                  title={`${formatDate(d.date)}: ${d.impressions} impressions, ${d.clicks} clicks`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Top queries + top pages side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Queries</h4>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : !data || data.topQueries.length === 0 ? (
            <p className="text-xs text-[#606060]">No query data yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Query</th>
                  <th className="py-2 pr-3 font-medium text-right">Clicks</th>
                  <th className="py-2 pr-3 font-medium text-right">Imp.</th>
                  <th className="py-2 pr-3 font-medium text-right">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {data.topQueries.map((row) => (
                  <tr key={row.query} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 pr-3 text-white truncate max-w-[200px]" title={row.query}>
                      {row.query}
                    </td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums font-medium">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatPosition(row.position)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Landing Pages</h4>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : !data || data.topPages.length === 0 ? (
            <p className="text-xs text-[#606060]">No page data yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Page</th>
                  <th className="py-2 pr-3 font-medium text-right">Clicks</th>
                  <th className="py-2 pr-3 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((row) => (
                  <tr key={row.page} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 pr-3">
                      <Link
                        href={row.page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-[#FFD700] truncate max-w-[220px] inline-block"
                        title={row.page}
                      >
                        {truncateUrl(row.page, 40)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums font-medium">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatCtr(row.ctr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Country + device breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">By Country</h4>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : !data || data.byCountry.length === 0 ? (
            <p className="text-xs text-[#606060]">No country breakdown yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.byCountry.slice(0, 10).map((row) => {
                const pct = data.totals.impressions > 0
                  ? (row.impressions / data.totals.impressions) * 100
                  : 0;
                return (
                  <div key={row.country} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-white uppercase font-mono">
                      {row.country}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#3B82F6]"
                        style={{ width: `${pct}%`, opacity: 0.75 }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs text-white tabular-nums">
                      {formatNumber(row.impressions)}{' '}
                      <span className="text-[#606060]">imp</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">By Device</h4>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : !data || data.byDevice.length === 0 ? (
            <p className="text-xs text-[#606060]">No device breakdown yet.</p>
          ) : (
            <div className="space-y-3">
              {data.byDevice.map((row) => {
                const pct = data.totals.impressions > 0
                  ? (row.impressions / data.totals.impressions) * 100
                  : 0;
                return (
                  <div key={row.device}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white capitalize">
                        {row.device.toLowerCase()}
                      </span>
                      <span className="text-xs text-[#A0A0A0] tabular-nums">
                        {formatNumber(row.clicks)} clicks · {formatCtr(row.ctr)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFD700]"
                        style={{ width: `${pct}%`, opacity: 0.75 }}
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
        <p className="text-[11px] text-[#606060]">
          Fetched at {new Date(data.snapshotAt).toLocaleTimeString('en-US')}
          {data.cached && ' · cached'}
        </p>
      )}
    </div>
  );
}
