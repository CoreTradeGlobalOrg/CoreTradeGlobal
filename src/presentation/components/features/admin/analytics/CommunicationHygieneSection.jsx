/**
 * Communication Hygiene — Bölüm 15.
 *
 * Tracks in-app notification volume per member so the operator can
 * see who's being written to too much (fatigue risk) and who's
 * receiving nothing at all (re-engagement candidate). Email volume
 * lives in Resend and needs a separate backend integration; the
 * panel flags that gap inline rather than fabricating numbers.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellOff,
  Download,
  Info,
  MailOpen,
  RefreshCw,
  Users2,
} from 'lucide-react';
import { getCommunicationHygiene } from '@/lib/analytics/queries';

const FATIGUE_META = {
  over: { label: 'Over-notified (10+/wk)', color: '#EF4444' },
  high: { label: 'High (5-9/wk)', color: '#F59E0B' },
  ok: { label: 'Healthy (1-4/wk)', color: '#10B981' },
  silent: { label: 'Silent (0/wk)', color: '#6B7280' },
};

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatDaysSince(days) {
  if (days === null || days === undefined) return 'never';
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
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

export function CommunicationHygieneSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCommunicationHygiene()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load hygiene');
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
    return data.dailyTrend.reduce((m, d) => (d.count > m ? d.count : m), 0);
  }, [data]);

  const handleExportSilent = () => {
    if (!data?.silentMembers?.length) return;
    const emails = data.silentMembers.map((m) => m.email).filter(Boolean).join('\n');
    downloadTxt(
      `silent-members-${new Date().toISOString().slice(0, 10)}.txt`,
      emails,
    );
  };

  const handleExportFatigued = () => {
    if (!data?.overFatigued?.length) return;
    const emails = data.overFatigued.map((m) => m.email).filter(Boolean).join('\n');
    downloadTxt(
      `over-fatigued-${new Date().toISOString().slice(0, 10)}.txt`,
      emails,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Communication Hygiene</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Notification volume, fatigue risk, silent-member re-engagement list.
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

      {/* Channel scope note */}
      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-[#A0A0A0]">
          <p className="text-white font-semibold mb-1">In-app channel only</p>
          <p>
            This panel reads the <code className="text-[#FFD700]">users/&lt;uid&gt;/notifications</code> subcollection.
            Email volume lives in Resend and needs a backend integration to surface here; WhatsApp isn't wired yet.
          </p>
        </div>
      </div>

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
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Last 7 days
              </p>
              <p className="text-3xl font-bold text-white leading-none tabular-nums mt-1">
                {formatNumber(data.last7d)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Avg {data.averagePerMemberWeek ?? '—'} per member
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Last 30 days
              </p>
              <p className="text-3xl font-bold text-white leading-none tabular-nums mt-1">
                {formatNumber(data.last30d)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">{formatNumber(data.total)} all-time</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-1">
                <MailOpen className="w-4 h-4 text-[#10B981]" />
                <p className="text-[10px] uppercase tracking-wider">Read rate</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums mt-1">
                {data.readRate !== null ? `${data.readRate}%` : '—'}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Across all notifications</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-1">
                <BellOff className="w-4 h-4 text-[#6B7280]" />
                <p className="text-[10px] uppercase tracking-wider">Silent members</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums mt-1">
                {formatNumber(data.fatigueCounts.silent)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Zero notifications in last 7 days</p>
            </div>
          </>
        )}
      </div>

      {/* Fatigue buckets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !data
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-20 animate-pulse"
              />
            ))
          : ['over', 'high', 'ok', 'silent'].map((bucket) => {
              const meta = FATIGUE_META[bucket];
              return (
                <div
                  key={bucket}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${meta.color}30`,
                    background: `${meta.color}0d`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                      {meta.label}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                    {formatNumber(data.fatigueCounts[bucket])}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Two-column lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-semibold text-white">Over-Notified</h4>
              {!loading && data && (
                <span className="text-xs text-[#A0A0A0]">
                  ({data.overFatigued.length})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportFatigued}
              disabled={loading || !data?.overFatigued?.length}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Emails
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : !data?.overFatigued?.length ? (
            <p className="text-xs text-[#606060] py-6 text-center">
              Nobody's over-notified right now.
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)] max-h-72 overflow-y-auto">
              {data.overFatigued.slice(0, 30).map((row) => {
                const color = row.bucket === 'over' ? '#EF4444' : '#F59E0B';
                return (
                  <li key={row.uid} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-xs font-medium truncate">
                        {row.displayName}
                      </div>
                      <div className="text-[10px] text-[#606060] truncate">
                        {row.companyName || row.email}
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums whitespace-nowrap"
                      style={{ color }}
                    >
                      {row.count7d}/wk
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-[#6B7280]" />
              <h4 className="text-sm font-semibold text-white">Silent Members</h4>
              {!loading && data && (
                <span className="text-xs text-[#A0A0A0]">
                  ({data.silentMembers.length})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportSilent}
              disabled={loading || !data?.silentMembers?.length}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Emails
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : !data?.silentMembers?.length ? (
            <p className="text-xs text-[#606060] py-6 text-center">
              Everyone's received something this week.
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)] max-h-72 overflow-y-auto">
              {data.silentMembers.slice(0, 30).map((row) => (
                <li key={row.uid} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white text-xs font-medium truncate">
                      {row.displayName}
                    </div>
                    <div className="text-[10px] text-[#606060] truncate">
                      {row.companyName || row.email}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#606060] tabular-nums whitespace-nowrap">
                    Last: {formatDaysSince(row.daysSince)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Type breakdown + daily trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">By Notification Type</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.byType.length === 0 ? (
            <p className="text-xs text-[#606060]">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {data.byType.slice(0, 10).map((row) => {
                const pct = data.total > 0 ? Math.round((row.count / data.total) * 100) : 0;
                return (
                  <div key={row.type} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-xs text-white truncate" title={row.type}>
                      {row.type}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFD700]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs text-white tabular-nums">
                      {formatNumber(row.count)} <span className="text-[#606060]">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
              {data.byType.length > 10 && (
                <p className="text-[11px] text-[#606060] mt-2">
                  +{data.byType.length - 10} more types
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">30-Day Volume</h4>
            {!loading && data && trendMax > 0 && (
              <span className="text-xs text-[#A0A0A0]">
                Peak: <span className="text-white font-semibold">{trendMax}</span>
              </span>
            )}
          </div>
          {loading || !data ? (
            <div className="h-32 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : trendMax === 0 ? (
            <p className="text-xs text-[#606060]">No volume in the last 30 days.</p>
          ) : (
            <div className="flex items-end gap-[2px] h-32">
              {data.dailyTrend.map((d) => {
                const h = trendMax > 0 ? Math.max((d.count / trendMax) * 100, d.count > 0 ? 4 : 0) : 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-[2px] rounded-sm bg-[#FFD700]/40 hover:bg-[#FFD700] transition-colors"
                    style={{ height: `${h}%` }}
                    title={`${d.date}: ${d.count}`}
                  />
                );
              })}
            </div>
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
