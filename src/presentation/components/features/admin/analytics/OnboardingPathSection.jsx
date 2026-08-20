/**
 * Onboarding Path Comparison — Bölüm 22.10.
 *
 * Splits the Bölüm 12 funnel by member role, registration source,
 * and country cohort. The Bölüm 12 view treats every new signup
 * identically, which hides the fact that a logistics provider's
 * happy path is not a trader's happy path — and that email signups
 * usually activate slower than social ones.
 */

'use client';

import { useEffect, useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { getOnboardingPathComparison } from '@/lib/analytics/queries';

function activationColor(ratio) {
  if (ratio >= 60) return '#10B981';
  if (ratio >= 30) return '#F59E0B';
  return '#EF4444';
}

function StepBar({ percent, color = '#3B82F6' }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${percent}%`, background: color, opacity: 0.75 }}
      />
    </div>
  );
}

export function OnboardingPathSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOnboardingPathComparison()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load path comparison');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Onboarding Path Comparison</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Same funnel, split by role, registration source, and country.
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

      {/* By role — full funnel breakdown */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">By Role</h4>
        {loading || !data ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.byRole.length === 0 ? (
          <p className="text-xs text-[#606060]">No members to compare.</p>
        ) : (
          <div className="space-y-4">
            {data.byRole.map((role) => (
              <div key={role.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{role.label}</p>
                    <p className="text-[10px] text-[#606060] mt-0.5">
                      {role.size} members · avg{' '}
                      <span className="text-white font-medium">{role.avgSteps ?? '—'}</span>/5 steps
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                      Activated
                    </span>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: activationColor(role.activatedRatio) }}
                    >
                      {role.activatedRatio}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {role.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-[11px] text-white truncate">
                        {i + 1}. {step.label}
                      </span>
                      <StepBar percent={step.percent} />
                      <span className="w-20 text-right text-[11px] text-white tabular-nums">
                        {step.percent}%{' '}
                        <span className="text-[#606060]">({step.completed})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-column: auth provider + country */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">By Registration Source</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.byAuthProvider.length === 0 ? (
            <p className="text-xs text-[#606060]">No data.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[360px] text-xs">
                <thead>
                  <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 pr-3 font-medium text-right">Members</th>
                    <th className="py-2 pr-3 font-medium text-right">Avg steps</th>
                    <th className="py-2 pr-3 font-medium text-right">Activated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAuthProvider.map((row) => (
                    <tr key={row.id} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 pr-3 text-white">{row.label}</td>
                      <td className="py-2 pr-3 text-white text-right tabular-nums">
                        {row.size}
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                        {row.avgSteps ?? '—'}
                        <span className="text-[#606060]">/5</span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <span
                          className="tabular-nums font-medium"
                          style={{ color: activationColor(row.activatedRatio) }}
                        >
                          {row.activatedRatio}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">By Country</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.byCountry.length === 0 ? (
            <p className="text-xs text-[#606060]">
              No country has ≥3 members yet — filter suppresses single-user noise.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[360px] text-xs">
                <thead>
                  <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="py-2 pr-3 font-medium">Country</th>
                    <th className="py-2 pr-3 font-medium text-right">Members</th>
                    <th className="py-2 pr-3 font-medium text-right">Avg steps</th>
                    <th className="py-2 pr-3 font-medium text-right">Activated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCountry.map((row) => (
                    <tr key={row.country} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 pr-3 text-white">{row.country}</td>
                      <td className="py-2 pr-3 text-white text-right tabular-nums">
                        {row.size}
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                        {row.avgSteps ?? '—'}
                        <span className="text-[#606060]">/5</span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <span
                          className="tabular-nums font-medium"
                          style={{ color: activationColor(row.activatedRatio) }}
                        >
                          {row.activatedRatio}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-[#A0A0A0]">
          <p className="text-white font-semibold mb-1">How &ldquo;activated&rdquo; is defined</p>
          <p>
            A member counts as activated if they've completed at least 4 of the 5 onboarding
            steps (email verified, profile ≥50%, first product or RFQ, first message, second
            sign-in). Country buckets with fewer than 3 members are suppressed so single-user
            noise doesn't paint whole cohorts red or green by accident.
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
