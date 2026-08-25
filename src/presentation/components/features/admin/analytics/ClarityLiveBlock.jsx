/**
 * Clarity live metrics block — embedded in SiteAnalyticsSection
 * next to the GA4 block. Reads /api/analytics/clarity which
 * enforces the 10-call/day quota via a 3-hour cache + 15-min
 * manual-refresh floor.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  Eye,
  MousePointerClick,
  RefreshCw,
  Timer,
  TrendingDown,
  Users,
} from 'lucide-react';

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatPercent(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

function formatSeconds(s) {
  if (!s || s < 0) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const min = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${min}m ${sec}s`;
}

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || null;

export function ClarityLiveBlock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/clarity?refresh=1'
      : '/api/analytics/clarity';
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
        if (!cancelled) setError(err.message || 'Clarity request failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const m = data?.metrics;

  const botPct = useMemo(() => {
    if (!m || m.sessions === 0) return 0;
    return (m.botSessions / (m.sessions + m.botSessions)) * 100;
  }, [m]);

  return (
    <div className="rounded-2xl border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.03)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#8B5CF6]" />
          <h4 className="text-sm font-semibold text-white">Microsoft Clarity — Live</h4>
          <span className="text-[10px] uppercase tracking-wider text-purple-300 border border-purple-400/30 bg-purple-400/5 px-1.5 py-0.5 rounded">
            {data?.window?.days || 3}d window
          </span>
          {data?.rateLimited && (
            <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-400/30 bg-amber-400/5 px-1.5 py-0.5 rounded">
              Quota exhausted
            </span>
          )}
          {data?.throttled && (
            <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-400/30 bg-amber-400/5 px-1.5 py-0.5 rounded">
              Throttled
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {CLARITY_PROJECT_ID && (
            <a
              href={`https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#A0A0A0] hover:text-[#8B5CF6]"
            >
              Open dashboard →
            </a>
          )}
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
          <p className="font-semibold mb-1">Clarity request failed</p>
          <p>{error}</p>
        </div>
      )}

      {(data?.rateLimited || data?.throttled) && data?.note && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-[11px] text-amber-300">
          {data.note}
        </div>
      )}

      {/* Session KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {loading || !m ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 h-20 animate-pulse"
            />
          ))
        ) : (
          <>
            <KpiTile icon={Users} label="Sessions" value={formatNumber(m.sessions)} />
            <KpiTile icon={Users} label="Distinct Users" value={formatNumber(m.distinctUsers)} />
            <KpiTile
              icon={Bot}
              label="Bots"
              value={`${formatNumber(m.botSessions)} (${botPct.toFixed(0)}%)`}
            />
            <KpiTile icon={MousePointerClick} label="Pages/Session" value={m.pagesPerSession?.toFixed(1) || '—'} />
            <KpiTile icon={Timer} label="Active Time" value={formatSeconds(m.activeEngagementSeconds)} />
            <KpiTile icon={TrendingDown} label="Scroll Depth" value={formatPercent(m.avgScrollDepth, 0)} />
          </>
        )}
      </div>

      {/* UX friction signals — the point of Clarity */}
      {!loading && m && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            UX Friction Signals
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <FrictionTile
              label="Dead Clicks"
              detail="Clicks with no reaction"
              pct={m.deadClick.pct}
              sessions={m.deadClick.sessions}
              total={m.deadClick.total}
              color="#F59E0B"
            />
            <FrictionTile
              label="Rage Clicks"
              detail="Repeated fast clicks — frustration"
              pct={m.rageClick.pct}
              sessions={m.rageClick.sessions}
              total={m.rageClick.total}
              color="#EF4444"
            />
            <FrictionTile
              label="Quickback"
              detail="Left within seconds"
              pct={m.quickback.pct}
              sessions={m.quickback.sessions}
              total={m.quickback.total}
              color="#F97316"
            />
            <FrictionTile
              label="Excessive Scroll"
              detail="Scrolled way past normal"
              pct={m.excessiveScroll.pct}
              sessions={m.excessiveScroll.sessions}
              total={m.excessiveScroll.total}
              color="#3B82F6"
            />
            <FrictionTile
              label="Script Errors"
              detail="JS errors during session"
              pct={m.scriptError.sessions > 0 ? (m.scriptError.sessions / m.sessions) * 100 : 0}
              sessions={m.scriptError.sessions}
              total={m.scriptError.total}
              color="#EC4899"
              icon={AlertOctagon}
            />
          </div>
        </div>
      )}

      {/* Breakdown row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <BreakdownCard title="Browsers" rows={m?.browsers} total={m?.sessions} loading={loading} accent="#8B5CF6" />
        <BreakdownCard title="Devices" rows={m?.devices} total={m?.sessions} loading={loading} accent="#3B82F6" />
        <BreakdownCard title="Operating Systems" rows={m?.operatingSystems} total={m?.sessions} loading={loading} accent="#10B981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <BreakdownCard title="Top Countries" rows={m?.countries} total={m?.sessions} loading={loading} accent="#F59E0B" />
        <BreakdownCard title="Top Referrers" rows={m?.referrers} total={m?.sessions} loading={loading} accent="#EC4899" />
      </div>

      {data?.snapshotAt && (
        <p className="text-[10px] text-[#606060]">
          Fetched at {new Date(data.snapshotAt).toLocaleTimeString('en-US')}
          {data.cached && ` · cached ${Math.round((data.cachedAgeMs || 0) / 60000)} min`}
          {' · 10 API calls/day quota'}
        </p>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
      <div className="flex items-center gap-1.5 text-[#A0A0A0] mb-1">
        <Icon className="w-3 h-3 text-[#8B5CF6]" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-white leading-none tabular-nums">{value}</p>
    </div>
  );
}

function FrictionTile({ label, detail, pct, sessions, total, color, icon: Icon = AlertTriangle }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: `${color}30`, background: `${color}05` }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums leading-none" style={{ color: pct > 5 ? color : '#FFFFFF' }}>
        {formatPercent(pct, 1)}
      </p>
      <p className="text-[10px] text-[#606060] mt-1">
        {formatNumber(sessions)} sess · {formatNumber(total)} events
      </p>
      <p className="text-[10px] text-[#606060] mt-0.5 leading-tight">{detail}</p>
    </div>
  );
}

function BreakdownCard({ title, rows, total, loading, accent }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
      <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">{title}</h5>
      {loading ? (
        <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
      ) : !rows || rows.length === 0 ? (
        <p className="text-xs text-[#606060]">No data.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 8).map((row) => {
            const pct = total > 0 ? (row.sessions / total) * 100 : 0;
            return (
              <div key={row.name} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-white truncate" title={row.name}>
                  {row.name}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent, opacity: 0.75 }} />
                </div>
                <span className="w-14 text-right text-xs text-white tabular-nums">{row.sessions}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
