/**
 * Partner Health — Bölüm 22.8, self-hosted first pass.
 *
 * Live health-check across the external services CTG depends on.
 * Each row is a live probe (HubSpot CRM API, Firestore, Vercel
 * status, Resend, GA + Clarity CDN) — no StatusPage.io tokens
 * required. Reads through /api/analytics/partners which caches
 * for 60 s so a page refresh burst doesn't ping every provider.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  MinusCircle,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';

const STATUS_META = {
  ok: { label: 'Operational', color: '#10B981', Icon: CheckCircle2 },
  degraded: { label: 'Degraded', color: '#F59E0B', Icon: AlertTriangle },
  rate_limited: { label: 'Rate-limited', color: '#F59E0B', Icon: AlertTriangle },
  down: { label: 'Down', color: '#EF4444', Icon: XCircle },
  auth_failed: { label: 'Auth Failed', color: '#EF4444', Icon: XCircle },
  not_configured: { label: 'Not configured', color: '#6B7280', Icon: MinusCircle },
};

function formatLatency(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatDeployTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return 'less than 1 h ago';
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function PartnerHealthSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/partners?refresh=1'
      : '/api/analytics/partners';
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
        if (!cancelled) setError(err.message || 'Health check failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const okCount = data?.partners?.filter((p) => p.status === 'ok').length ?? 0;
  const totalCount = data?.partners?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Partner Health</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Live probes against every external dependency — no StatusPage token needed.
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

      {/* Summary */}
      {!loading && data && (
        <div
          className="rounded-2xl border p-4 flex items-center gap-3"
          style={{
            borderColor: okCount === totalCount ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
            background: okCount === totalCount ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
          }}
        >
          <Activity
            className="w-6 h-6"
            style={{ color: okCount === totalCount ? '#10B981' : '#F59E0B' }}
          />
          <div>
            <p className="text-sm text-white font-semibold">
              {okCount === totalCount
                ? 'All partners operational'
                : `${okCount}/${totalCount} operational`}
            </p>
            <p className="text-[11px] text-[#A0A0A0]">
              Cached for 60 s to keep probe traffic minimal
              {data.cached && ` · cache age ${Math.round((data.cachedAgeMs || 0) / 1000)} s`}
            </p>
          </div>
        </div>
      )}

      {/* Partner cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading || !data
          ? [0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-24 animate-pulse"
              />
            ))
          : data.partners.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.down;
              const Icon = meta.Icon;
              return (
                <div
                  key={p.key}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${meta.color}30`,
                    background: `${meta.color}05`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
                      <span className="text-sm font-semibold text-white">{p.label}</span>
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: meta.color,
                        borderColor: `${meta.color}55`,
                        background: `${meta.color}12`,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A0A0A0]">{p.note}</p>
                  {p.latencyMs !== undefined && p.latencyMs !== null && (
                    <p className="text-[10px] text-[#606060] mt-1 tabular-nums">
                      Latency: {formatLatency(p.latencyMs)}
                    </p>
                  )}
                </div>
              );
            })}
      </div>

      {/* Deploy metadata */}
      {!loading && data?.env && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">This Deployment</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#606060]">Env</p>
              <p className="text-white mt-0.5">{data.env.vercelEnv}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#606060]">Region</p>
              <p className="text-white mt-0.5">{data.env.vercelRegion || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#606060]">Branch</p>
              <p className="text-white mt-0.5 truncate" title={data.env.branch || ''}>
                {data.env.branch || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#606060]">Commit</p>
              <p className="text-white mt-0.5 font-mono inline-flex items-center gap-1">
                <GitCommit className="w-3 h-3 text-[#A0A0A0]" />
                {data.env.commitSha || '—'}
              </p>
            </div>
            {data.env.deployedAt && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-[#606060]">Deployed</p>
                <p className="text-white mt-0.5">{formatDeployTime(data.env.deployedAt)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Checked at {new Date(data.snapshotAt).toLocaleTimeString('en-US')}
        </p>
      )}
    </div>
  );
}
