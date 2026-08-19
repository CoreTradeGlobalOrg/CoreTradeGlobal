/**
 * Engagement — Bölüm 18 (5-layer scoring surface).
 *
 * The plan lists Bölüm 18 as "no UI required", meant to power the
 * scores other panels display. Surfacing it as its own section is
 * still worth the pixels: the operator can see the distribution
 * shape, spot which layer is dragging the average, and inspect a
 * member's breakdown to understand why they score where they do.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Sparkles } from 'lucide-react';
import {
  ENGAGEMENT_LAYERS,
  getEngagementSnapshot,
} from '@/lib/analytics/queries';

function scoreColor(score) {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#FFD700';
  if (score >= 30) return '#F59E0B';
  return '#EF4444';
}

function formatDaysSince(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

function LayerBar({ layer, value }) {
  const pct = layer.weight > 0 ? Math.round((value / layer.weight) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-white">{layer.label}</span>
        <span className="text-[11px] text-[#A0A0A0] tabular-nums">
          {value}
          <span className="text-[#606060]">/{layer.weight}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: layer.color, opacity: 0.75 }}
        />
      </div>
    </div>
  );
}

export function EngagementSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState('');
  const [inspectUid, setInspectUid] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEngagementSnapshot()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          if (!inspectUid && d.rows.length > 0) setInspectUid(d.rows[0].uid);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load engagement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const distributionMax = useMemo(() => {
    if (!data?.distribution?.length) return 0;
    return data.distribution.reduce((m, n) => (n > m ? n : m), 0);
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter(
      (r) =>
        r.displayName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q),
    );
  }, [data, search]);

  const inspectRow = useMemo(() => {
    if (!data || !inspectUid) return null;
    return data.rows.find((r) => r.uid === inspectUid) || null;
  }, [data, inspectUid]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Engagement Score</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            5-layer weighted score powering segments, alerts, and VIP detection.
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

      {/* Headline stats */}
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
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Average score
              </p>
              <p
                className="text-3xl font-bold tabular-nums leading-none mt-1"
                style={{ color: scoreColor(data.average) }}
              >
                {data.average}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Across {data.total} members</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Median (p50)
              </p>
              <p
                className="text-3xl font-bold tabular-nums leading-none mt-1"
                style={{ color: scoreColor(data.percentiles.p50) }}
              >
                {data.percentiles.p50}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                p25 {data.percentiles.p25} · p75 {data.percentiles.p75} · p90 {data.percentiles.p90}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-1">
                <Sparkles className="w-4 h-4 text-[#FFD700]" />
                <p className="text-[10px] uppercase tracking-wider">Verified lift</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.verifiedLift !== null
                  ? `${data.verifiedLift >= 0 ? '+' : ''}${data.verifiedLift}`
                  : '—'}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Verified avg vs unverified avg
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Top decile
              </p>
              <p
                className="text-3xl font-bold tabular-nums leading-none mt-1"
                style={{ color: scoreColor(data.percentiles.p90) }}
              >
                {data.percentiles.p90}+
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Cut-off score for the top 10%
              </p>
            </div>
          </>
        )}
      </div>

      {/* Distribution histogram */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Score Distribution</h4>
        {loading || !data ? (
          <div className="h-32 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
        ) : distributionMax === 0 ? (
          <p className="text-xs text-[#606060]">No data.</p>
        ) : (
          <div>
            <div className="flex items-end gap-1 h-32">
              {data.distribution.map((count, i) => {
                const h = distributionMax > 0 ? Math.max((count / distributionMax) * 100, count > 0 ? 4 : 0) : 0;
                const lo = i * 10;
                const hi = i === 9 ? 100 : lo + 9;
                const c = scoreColor(lo + 5);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-[#A0A0A0] tabular-nums">{count || ''}</span>
                    <div
                      className="w-full rounded-t transition-colors"
                      style={{ height: `${h}%`, background: c, opacity: 0.75 }}
                      title={`${lo}-${hi}: ${count} members`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex mt-2">
              {data.distribution.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 text-[10px] text-[#606060] text-center"
                >
                  {i * 10}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Layer averages */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Layer Averages</h4>
        {loading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {ENGAGEMENT_LAYERS.map((l) => (
              <div key={l.id} className="h-20 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {ENGAGEMENT_LAYERS.map((layer) => {
              const avg = data.layerAverages[layer.id] || 0;
              const pct = layer.weight > 0 ? Math.round((avg / layer.weight) * 100) : 0;
              return (
                <div
                  key={layer.id}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3"
                  style={{ borderLeftColor: layer.color, borderLeftWidth: 3 }}
                >
                  <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] truncate">
                    {layer.label}
                  </p>
                  <p className="text-xl font-bold text-white leading-none tabular-nums mt-1">
                    {avg}
                    <span className="text-xs text-[#606060]">/{layer.weight}</span>
                  </p>
                  <p className="text-[10px] text-[#606060] mt-1">{pct}% of max</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Members table + inspect panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h4 className="text-sm font-semibold text-white">
              Members ({filteredRows.length})
            </h4>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#606060] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/50 w-56"
              />
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="text-xs text-[#606060] py-6 text-center">No members match this filter.</p>
          ) : (
            <div className="max-h-[440px] overflow-y-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0F1B2B]">
                  <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="py-2 pr-3 font-medium">Member</th>
                    <th className="py-2 pr-3 font-medium">Sector</th>
                    <th className="py-2 pr-3 font-medium text-right">Last</th>
                    <th className="py-2 pr-3 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 60).map((row) => (
                    <tr
                      key={row.uid}
                      className={[
                        'border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-colors',
                        row.uid === inspectUid ? 'bg-[rgba(255,215,0,0.05)]' : 'hover:bg-[rgba(255,255,255,0.02)]',
                      ].join(' ')}
                      onClick={() => setInspectUid(row.uid)}
                    >
                      <td className="py-2 pr-3">
                        <div className="text-white font-medium">{row.displayName}</div>
                        <div className="text-[#606060] truncate max-w-[220px]">
                          {row.companyName || row.email}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{row.sector}</td>
                      <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                        {formatDaysSince(row.activityDays)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <span
                          className="tabular-nums font-semibold"
                          style={{ color: scoreColor(row.score) }}
                        >
                          {row.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length > 60 && (
                <p className="mt-2 text-[11px] text-[#606060]">
                  +{filteredRows.length - 60} more members
                </p>
              )}
            </div>
          )}
        </div>

        {/* Inspect panel */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-1">Score Breakdown</h4>
          {inspectRow ? (
            <>
              <p className="text-[11px] text-[#A0A0A0] mb-4">
                {inspectRow.displayName}
                {inspectRow.companyName && (
                  <span className="text-[#606060]"> · {inspectRow.companyName}</span>
                )}
              </p>
              <div className="flex items-baseline gap-2 mb-4">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{ color: scoreColor(inspectRow.score) }}
                >
                  {inspectRow.score}
                </span>
                <span className="text-sm text-[#606060]">/100</span>
              </div>
              <div className="space-y-3">
                {ENGAGEMENT_LAYERS.map((layer) => (
                  <LayerBar
                    key={layer.id}
                    layer={layer}
                    value={inspectRow.breakdown[layer.id] || 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#606060]">Select a member.</p>
          )}
        </div>
      </div>

      {/* Explainer */}
      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 text-xs text-[#A0A0A0]">
        <p className="text-white font-semibold mb-1">Layers &amp; missing signals</p>
        <p>
          Activity (35pts) tops out at 20pts today because session duration
          and page depth need the event log. Value production (25pts) misses
          message-quality scoring for the same reason. Social/Contribution
          (10pts) sits at 0 across the board — reviews, referrals, and forum
          activity don't exist yet as data. Once those sources arrive, this
          score fills out without any UI change.
        </p>
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Computed at {data.snapshotAt.toLocaleTimeString('en-US')}
        </p>
      )}
    </div>
  );
}
