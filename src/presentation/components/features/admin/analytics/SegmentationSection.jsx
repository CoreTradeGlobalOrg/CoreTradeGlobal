/**
 * Segmentation / Persona — Bölüm 14.
 *
 * Auto-computed member groups the operator can act on directly:
 * VIP candidates, high-value buyers, passive sellers, ad-package
 * targets, critical churn, new starters, and onboarding-complete
 * members.
 *
 * A member can belong to multiple segments simultaneously — a
 * churn candidate whose profile is incomplete lives in both
 * lists on purpose so no signal gets lost. The panel emits
 * per-segment email exports as the atomic action while a
 * proper campaign-tetikleme API doesn't exist yet.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { getMemberSegments } from '@/lib/analytics/queries';

function scoreColor(score) {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#FFD700';
  if (score >= 30) return '#F59E0B';
  return '#EF4444';
}

function downloadTxt(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function SegmentationSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMemberSegments()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          if (!activeId && d.segments.length > 0) {
            // Pick the first non-empty segment so the panel isn't empty on first render.
            const firstWithMembers = d.segments.find((s) => s.count > 0);
            setActiveId(firstWithMembers?.id || d.segments[0].id);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load segments');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // activeId intentionally out of deps — we don't want a re-fetch on tab switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const activeSegment = useMemo(() => {
    if (!data || !activeId) return null;
    return data.segments.find((s) => s.id === activeId) || null;
  }, [data, activeId]);

  const handleExportEmails = (segment) => {
    if (!segment?.members?.length) return;
    const emails = segment.members.map((m) => m.email).filter(Boolean).join('\n');
    downloadTxt(
      `segment-${segment.id}-${new Date().toISOString().slice(0, 10)}.txt`,
      emails,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Segmentation</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Auto-grouped members with recommended actions. A member may sit in more than one segment.
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

      {/* Score distribution strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-20 animate-pulse"
            />
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Average score
              </p>
              <p className="text-2xl font-bold tabular-nums leading-none mt-1" style={{ color: scoreColor(data.scoreDistribution.avg) }}>
                {data.scoreDistribution.avg}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">{data.total} active members</p>
            </div>
            {[
              { key: 'p25', label: '25th percentile' },
              { key: 'p50', label: 'Median' },
              { key: 'p75', label: '75th percentile' },
            ].map((p) => (
              <div
                key={p.key}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                  {p.label}
                </p>
                <p
                  className="text-2xl font-bold tabular-nums leading-none mt-1"
                  style={{ color: scoreColor(data.scoreDistribution[p.key]) }}
                >
                  {data.scoreDistribution[p.key]}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading || !data
          ? [0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-40 animate-pulse"
              />
            ))
          : data.segments.map((seg) => {
              const isActive = activeId === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setActiveId(seg.id)}
                  className={[
                    'text-left rounded-2xl border p-4 transition-colors',
                    isActive
                      ? 'bg-[rgba(255,255,255,0.04)]'
                      : 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.035)]',
                  ].join(' ')}
                  style={{
                    borderColor: isActive ? seg.color : 'rgba(255,255,255,0.06)',
                    borderLeftColor: seg.color,
                    borderLeftWidth: 3,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">{seg.emoji}</span>
                        <span className="text-sm font-semibold text-white">{seg.label}</span>
                      </div>
                      <p className="text-[10px] text-[#606060] mt-1">{seg.detail}</p>
                    </div>
                    <span
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color: seg.color }}
                    >
                      {seg.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A0A0A0] mt-3 leading-snug">
                    <span className="text-white font-medium">Action:</span> {seg.action}
                  </p>
                </button>
              );
            })}
      </div>

      {/* Active-segment member table */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        {activeSegment ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{activeSegment.emoji}</span>
                  <h4 className="text-sm font-semibold text-white">
                    {activeSegment.label}
                  </h4>
                  <span className="text-xs text-[#A0A0A0]">
                    ({activeSegment.count} members)
                  </span>
                </div>
                <p className="text-[11px] text-[#606060] mt-1">{activeSegment.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => handleExportEmails(activeSegment)}
                disabled={activeSegment.count === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Emails
              </button>
            </div>

            {activeSegment.count === 0 ? (
              <p className="text-xs text-[#606060] py-8 text-center">
                No members match this segment right now.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                      <th className="py-2 pr-3 font-medium">Member</th>
                      <th className="py-2 pr-3 font-medium">Company</th>
                      <th className="py-2 pr-3 font-medium">Country</th>
                      <th className="py-2 pr-3 font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSegment.members.slice(0, 40).map((m) => (
                      <tr key={m.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="py-2 pr-3">
                          <div className="text-white font-medium">{m.displayName}</div>
                          <div className="text-[#606060]">{m.email}</div>
                        </td>
                        <td className="py-2 pr-3 text-[#A0A0A0]">{m.companyName || '—'}</td>
                        <td className="py-2 pr-3 text-[#A0A0A0]">{m.country || '—'}</td>
                        <td className="py-2 pr-3 text-right">
                          <span
                            className="tabular-nums font-medium"
                            style={{ color: scoreColor(m.score) }}
                          >
                            {m.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activeSegment.members.length > 40 && (
                  <p className="mt-2 text-[11px] text-[#606060]">
                    +{activeSegment.members.length - 40} more members
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-[#606060] py-8 text-center">
            Select a segment above to view members.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 text-xs text-[#A0A0A0]">
        <p className="text-white font-semibold mb-1">Composite score in the header</p>
        <p>
          The score used here is a first-pass composite (profile 50pts + activity 25pts + value
          production 15pts + engagement 10pts). It approximates the fuller engagement model
          described in Bölüm 18 — when that lands, the score field on every segment row swaps
          for the new one without touching this UI.
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
