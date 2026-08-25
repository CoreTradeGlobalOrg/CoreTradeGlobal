/**
 * Fraud & Risk — Bölüm 22.1, self-hosted first pass.
 *
 * No SEON / Sift / MaxMind subscription; every signal derives from
 * Firestore data we already have. Fidelity is limited (no IP
 * intelligence, no device fingerprinting) but the six signals here
 * catch the common shapes at current scale.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building,
  ClipboardList,
  Info,
  MailWarning,
  Network,
  RefreshCw,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { getRiskSignals } from '@/lib/analytics/queries';

const SIGNAL_META = [
  {
    id: 'domainRisk',
    label: 'Same-Domain Clusters',
    detail: '3+ registrations from one non-free email domain',
    icon: Network,
    color: '#EF4444',
  },
  {
    id: 'rapidClusters',
    label: 'Rapid Signup Clusters',
    detail: '3+ users registered within a 15-minute window',
    icon: Timer,
    color: '#F97316',
  },
  {
    id: 'duplicateCompanies',
    label: 'Duplicate Companies',
    detail: 'Multiple non-suspended accounts with identical company name',
    icon: Building,
    color: '#F59E0B',
  },
  {
    id: 'offPlatformSenders',
    label: 'Off-Platform Senders',
    detail: 'Users whose messages leaked email / phone / IBAN / social handles',
    icon: MailWarning,
    color: '#EF4444',
  },
  {
    id: 'staleUnverified',
    label: 'Stale Unverified',
    detail: 'Email unverified 7+ days after registration',
    icon: ClipboardList,
    color: '#F59E0B',
  },
  {
    id: 'highActivityUnverified',
    label: 'High-Activity Unverified',
    detail: 'Unverified user with 3+ products or RFQs',
    icon: AlertTriangle,
    color: '#F97316',
  },
];

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FraudSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRiskSignals()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load risk signals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Fraud &amp; Risk</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Self-hosted risk signals — click any card to see who tripped it.
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

      {/* Signal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading || !data
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-32 animate-pulse"
              />
            ))
          : SIGNAL_META.map((meta) => {
              const count = data.counts[meta.id] || 0;
              const isExpanded = expanded.has(meta.id);
              const Icon = meta.icon;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => toggleExpand(meta.id)}
                  className={[
                    'text-left rounded-2xl border p-4 transition-colors',
                    isExpanded
                      ? 'bg-[rgba(255,255,255,0.04)]'
                      : 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.035)]',
                  ].join(' ')}
                  style={{
                    borderColor: count > 0 ? `${meta.color}55` : 'rgba(255,255,255,0.06)',
                    borderLeftColor: meta.color,
                    borderLeftWidth: 3,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        <span className="text-sm font-semibold text-white">
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#606060]">{meta.detail}</p>
                    </div>
                    <span
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color: count > 0 ? meta.color : '#606060' }}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
      </div>

      {/* Expanded sections */}
      {!loading && data && SIGNAL_META.filter((m) => expanded.has(m.id)).map((meta) => {
        const rows = data[meta.id === 'offPlatformSenders' ? 'topOffPlatformSenders' : meta.id] || [];
        if (rows.length === 0) return null;
        return (
          <div
            key={`exp-${meta.id}`}
            className="rounded-2xl border p-5"
            style={{
              borderColor: `${meta.color}30`,
              background: `${meta.color}05`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
                <h4 className="text-sm font-semibold text-white">{meta.label}</h4>
                <span className="text-xs text-[#A0A0A0]">({rows.length})</span>
              </div>
              <button
                type="button"
                onClick={() => toggleExpand(meta.id)}
                className="text-[11px] text-[#A0A0A0] hover:text-white"
              >
                Collapse
              </button>
            </div>

            {meta.id === 'domainRisk' && (
              <ul className="space-y-2">
                {rows.slice(0, 20).map((row) => (
                  <li key={row.domain} className="rounded-lg bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white font-mono">{row.domain}</span>
                      <span className="text-xs text-white font-semibold">{row.count} accounts</span>
                    </div>
                    <ul className="text-[11px] text-[#A0A0A0] space-y-0.5">
                      {row.members.slice(0, 5).map((m) => (
                        <li key={m.uid} className="flex items-center gap-2">
                          <span className="text-white">{m.displayName || m.email}</span>
                          <span className="text-[#606060]">· {m.companyName || 'no company'}</span>
                          {m.isSuspended && (
                            <span className="text-red-400 text-[10px]">(suspended)</span>
                          )}
                        </li>
                      ))}
                      {row.members.length > 5 && (
                        <li className="text-[#606060]">+{row.members.length - 5} more</li>
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            {meta.id === 'rapidClusters' && (
              <ul className="space-y-2">
                {rows.slice(0, 10).map((c, i) => (
                  <li key={i} className="rounded-lg bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#A0A0A0]">
                        {formatDate(c.firstAt)}
                        <span className="text-[#606060] mx-1">→</span>
                        {formatDate(c.lastAt)}
                      </span>
                      <span className="text-xs text-white font-semibold">{c.count} signups</span>
                    </div>
                    <ul className="text-[11px] text-[#A0A0A0] space-y-0.5">
                      {c.members.slice(0, 8).map((m) => (
                        <li key={m.uid}>
                          <span className="text-white">{m.displayName || m.email}</span>
                          <span className="text-[#606060]"> · {m.email}</span>
                        </li>
                      ))}
                      {c.members.length > 8 && (
                        <li className="text-[#606060]">+{c.members.length - 8} more</li>
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            {meta.id === 'duplicateCompanies' && (
              <ul className="space-y-2">
                {rows.slice(0, 20).map((c) => (
                  <li key={c.companyName} className="rounded-lg bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{c.companyName}</span>
                      <span className="text-xs text-white font-semibold">{c.count} accounts</span>
                    </div>
                    <ul className="text-[11px] text-[#A0A0A0] space-y-0.5">
                      {c.members.map((m) => (
                        <li key={m.uid}>
                          <span className="text-white">{m.displayName || m.email}</span>
                          <span className="text-[#606060]"> · {m.email}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            {meta.id === 'offPlatformSenders' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="py-2 pr-3 font-medium">Sender</th>
                    <th className="py-2 pr-3 font-medium">Company</th>
                    <th className="py-2 pr-3 font-medium text-right">Leaks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 pr-3">
                        <div className="text-white font-medium">{r.displayName || '(no name)'}</div>
                        <div className="text-[#606060]">{r.email}</div>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{r.companyName || '—'}</td>
                      <td className="py-2 pr-3 text-right">
                        <span className="text-red-400 tabular-nums font-medium">{r.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {meta.id === 'staleUnverified' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                      <th className="py-2 pr-3 font-medium">Member</th>
                      <th className="py-2 pr-3 font-medium">Company</th>
                      <th className="py-2 pr-3 font-medium">Country</th>
                      <th className="py-2 pr-3 font-medium text-right">Days stale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 40).map((r) => (
                      <tr key={r.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="py-2 pr-3">
                          <div className="text-white font-medium">{r.displayName || '(no name)'}</div>
                          <div className="text-[#606060]">{r.email}</div>
                        </td>
                        <td className="py-2 pr-3 text-[#A0A0A0]">{r.companyName || '—'}</td>
                        <td className="py-2 pr-3 text-[#A0A0A0]">{r.country || '—'}</td>
                        <td className="py-2 pr-3 text-amber-400 text-right tabular-nums">
                          {r.daysSinceRegister}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 40 && (
                  <p className="mt-2 text-[11px] text-[#606060]">+{rows.length - 40} more</p>
                )}
              </div>
            )}

            {meta.id === 'highActivityUnverified' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                      <th className="py-2 pr-3 font-medium">Member</th>
                      <th className="py-2 pr-3 font-medium">Company</th>
                      <th className="py-2 pr-3 font-medium">Verification</th>
                      <th className="py-2 pr-3 font-medium text-right">Products</th>
                      <th className="py-2 pr-3 font-medium text-right">RFQs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="py-2 pr-3">
                          <div className="text-white font-medium">{r.displayName || '(no name)'}</div>
                          <div className="text-[#606060]">{r.email}</div>
                        </td>
                        <td className="py-2 pr-3 text-[#A0A0A0]">{r.companyName || '—'}</td>
                        <td className="py-2 pr-3">
                          <span className="text-[11px]">
                            {r.emailVerified ? (
                              <span className="text-green-400">Email ✓</span>
                            ) : (
                              <span className="text-red-400">Email ✗</span>
                            )}
                            {' · '}
                            {r.adminApproved ? (
                              <span className="text-green-400">Admin ✓</span>
                            ) : (
                              <span className="text-red-400">Admin ✗</span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-white text-right tabular-nums">{r.products}</td>
                        <td className="py-2 pr-3 text-white text-right tabular-nums">{r.rfqs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Explainer */}
      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-[#A0A0A0]">
          <p className="text-white font-semibold mb-1">First-pass scope</p>
          <p>
            No SEON / Sift / MaxMind here — six signals derived from Firestore data we already
            have. IP intelligence, device fingerprinting, and payment-fraud pattern matching
            need a dedicated fraud provider. What lands today catches shared-domain sign-up
            bursts, duplicate identities, and off-platform steering — enough to route the
            actionable rows into the admin queue for manual review.
          </p>
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
