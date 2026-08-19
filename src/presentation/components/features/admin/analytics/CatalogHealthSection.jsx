/**
 * Product Catalog Health — Bölüm 20.
 *
 * The plan lists Bölüm 20 as "no dedicated UI" but the derivable
 * signals — per-product quality scoring, category coverage, dead
 * listings, top low-quality entries — are actionable enough to
 * warrant a section. Image-quality and duplicate detection (pHash /
 * ML) sit out of scope until backend ML lands.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ExternalLink,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getCatalogHealth } from '@/lib/analytics/queries';

function scoreColor(score) {
  if (score >= 80) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function formatDays(n) {
  if (n === null || n === undefined) return '—';
  if (n === 0) return 'today';
  if (n === 1) return '1d';
  return `${n}d`;
}

export function CatalogHealthSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCatalogHealth()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load catalog health');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filteredLowQuality = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.topLowQuality;
    return data.topLowQuality.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.sellerName.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Catalog Health</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Product quality distribution, freshness signals, and category coverage.
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
                <Package className="w-4 h-4 text-[#FFD700]" />
                <p className="text-[10px] uppercase tracking-wider">Total Products</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.total}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Average quality {' '}
                <span className="font-semibold" style={{ color: scoreColor(data.averageScore) }}>
                  {data.averageScore}/100
                </span>
              </p>
            </div>
            <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1">
                High Quality (≥80)
              </p>
              <p className="text-3xl font-bold leading-none tabular-nums" style={{ color: '#10B981' }}>
                {data.qualityBuckets.high}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                {data.total > 0 ? Math.round((data.qualityBuckets.high / data.total) * 100) : 0}%
                of catalog
              </p>
            </div>
            <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1">
                Medium (40-79)
              </p>
              <p className="text-3xl font-bold leading-none tabular-nums" style={{ color: '#F59E0B' }}>
                {data.qualityBuckets.medium}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Room to improve</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1">
                Weak (&lt;40)
              </p>
              <p className="text-3xl font-bold leading-none tabular-nums" style={{ color: '#EF4444' }}>
                {data.qualityBuckets.low}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Push seller to enhance</p>
            </div>
          </>
        )}
      </div>

      {/* Field gap bars — which weakness is most common */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Missing Fields Across Catalog</h4>
        {loading || !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.total === 0 ? (
          <p className="text-xs text-[#606060]">Catalog is empty.</p>
        ) : (
          <div className="space-y-2.5">
            {data.fieldGapCounts
              .slice()
              .sort((a, b) => b.missing - a.missing)
              .map((row) => {
                const pct = data.total > 0 ? Math.round((row.missing / data.total) * 100) : 0;
                return (
                  <div key={row.key} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-xs text-white truncate">
                      {row.label}
                      <span className="text-[10px] text-[#606060] ml-1">
                        ({row.weight}p)
                      </span>
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#EF4444]"
                        style={{ width: `${pct}%`, opacity: 0.65 }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs text-white tabular-nums">
                      {row.missing}{' '}
                      <span className="text-[#606060]">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Freshness + category coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Freshness</h4>
          {loading || !data ? (
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'fresh30', label: 'Fresh (≤30d)', color: '#10B981' },
                { key: 'stale30to90', label: 'Stale (30-90d)', color: '#F59E0B' },
                { key: 'dead90plus', label: 'Dead (90d+)', color: '#EF4444' },
                { key: 'noTimestamp', label: 'No timestamp', color: '#6B7280' },
              ].map((b) => (
                <div
                  key={b.key}
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: `${b.color}30`,
                    background: `${b.color}0d`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                    {b.label}
                  </p>
                  <p
                    className="text-xl font-bold leading-none tabular-nums mt-1"
                    style={{ color: b.color }}
                  >
                    {data.freshnessBuckets[b.key]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Category Coverage</h4>
          {loading || !data ? (
            <div className="h-32 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-[#A0A0A0]">
                <span className="text-white font-semibold">{data.uncategorized}</span>{' '}
                products with no category
              </div>
              {data.emptyCategories.length > 0 && (
                <div className="text-xs">
                  <p className="text-[#A0A0A0] mb-1">
                    <span className="text-white font-semibold">
                      {data.emptyCategories.length}
                    </span>{' '}
                    empty categories — supplier-recruitment opportunity
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {data.emptyCategories.slice(0, 20).map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-amber-400/30 bg-amber-400/5 text-amber-400"
                      >
                        {c.name}
                      </span>
                    ))}
                    {data.emptyCategories.length > 20 && (
                      <span className="text-[10px] text-[#606060]">
                        +{data.emptyCategories.length - 20}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {data.crowdedCategories.length > 0 && (
                <div className="text-xs">
                  <p className="text-[#A0A0A0] mb-1">
                    Crowded (competition tight — quality-lift priority):
                  </p>
                  <ul className="space-y-1">
                    {data.crowdedCategories.slice(0, 5).map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between text-white"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[#FFD700] tabular-nums font-medium">
                          {c.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.emptyCategories.length === 0 &&
                data.crowdedCategories.length === 0 &&
                data.uncategorized === 0 && (
                  <p className="text-xs text-[#606060]">
                    Category distribution looks healthy.
                  </p>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Top low-quality listings */}
      <div className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.04)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-semibold text-white">Weakest Listings</h4>
            {!loading && (
              <span className="text-xs text-[#A0A0A0]">
                ({filteredLowQuality.length})
              </span>
            )}
          </div>
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
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : filteredLowQuality.length === 0 ? (
          <p className="text-xs text-[#606060] py-6 text-center">
            Nothing scoring below 40 — nice.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Seller</th>
                  <th className="py-2 pr-3 font-medium">Top gaps</th>
                  <th className="py-2 pr-3 font-medium text-right">Score</th>
                  <th className="py-2 pr-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredLowQuality.map((row) => (
                  <tr key={row.id} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 pr-3 text-white max-w-[220px] truncate" title={row.name}>
                      {row.name}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] truncate max-w-[180px]" title={row.sellerName}>
                      {row.sellerName}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {row.missing.slice(0, 3).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-red-400/30 bg-red-400/5 text-red-300"
                          >
                            {g}
                          </span>
                        ))}
                        {row.missing.length > 3 && (
                          <span className="text-[10px] text-[#606060]">
                            +{row.missing.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span
                        className="tabular-nums font-semibold"
                        style={{ color: scoreColor(row.score) }}
                      >
                        {row.score}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Link
                        href={`/product/${row.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#A0A0A0] hover:text-[#FFD700] inline-flex items-center gap-1"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top sellers + dead listings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Sellers by Catalog Size</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.topSellers.length === 0 ? (
            <p className="text-xs text-[#606060]">No sellers yet.</p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
              {data.topSellers.map((s) => (
                <li key={s.uid} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-white truncate flex-1">{s.name}</span>
                  <span className="text-xs text-[#A0A0A0] tabular-nums whitespace-nowrap">
                    {s.count} products
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums whitespace-nowrap"
                    style={{ color: scoreColor(s.avgScore) }}
                  >
                    avg {s.avgScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Dead Listings (90d+)</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.deadListings.length === 0 ? (
            <p className="text-xs text-[#606060]">Nothing lingering unmaintained.</p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)] max-h-72 overflow-y-auto">
              {data.deadListings.map((row) => (
                <li key={row.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white truncate">{row.name}</div>
                    <div className="text-[10px] text-[#606060] truncate">
                      {row.sellerName}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#EF4444] tabular-nums whitespace-nowrap">
                    {formatDays(row.ageDays)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Computed at {data.snapshotAt.toLocaleTimeString('en-US')}
        </p>
      )}
    </div>
  );
}
