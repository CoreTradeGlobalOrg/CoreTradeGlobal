/**
 * Onboarding Funnel — Bölüm 12.
 *
 * The first-7-day journey of every new member: email verification,
 * profile fill, first product/RFQ, first message, second sign-in.
 * Steady-state view derived live from user + product + request +
 * conversation collections — there's no event log yet, so we don't
 * have precise per-user timestamps for each step. What we CAN do
 * cleanly is cohort comparison (current 30-day cohort vs previous
 * 30-day cohort) and per-step dropout listing.
 *
 * When the event pipeline lands (Bölüm 23 Faz 1), the same UI can
 * be fed from timestamped events for exact time-to-step curves.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Minus,
  RefreshCw,
  Target,
  Users2,
} from 'lucide-react';
import {
  getOnboardingFunnel,
  ONBOARDING_STEPS,
} from '@/lib/analytics/queries';

const STEP_COLOR = ['#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981'];

function DeltaBadge({ current, previous }) {
  if (current === null || previous === null || previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[#606060]">
        <Minus className="w-3 h-3" />
        —
      </span>
    );
  }
  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[#606060]">
        <Minus className="w-3 h-3" />
        0
      </span>
    );
  }
  const color = diff > 0 ? '#10B981' : '#EF4444';
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium tabular-nums"
      style={{ color }}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(diff)}pp
    </span>
  );
}

function FunnelBar({ percent, count, cohortSize, color, expectedInDays }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 flex-shrink-0 text-right">
        <p className="text-lg font-bold text-white tabular-nums leading-none">
          {percent}%
        </p>
        <p className="text-[10px] text-[#606060] mt-0.5">
          {count}/{cohortSize}
        </p>
      </div>
      <div className="flex-1 h-6 rounded-md bg-[rgba(255,255,255,0.04)] overflow-hidden relative">
        <div
          className="h-full rounded-md transition-all"
          style={{
            width: `${percent}%`,
            background: `${color}`,
            opacity: 0.7,
          }}
        />
      </div>
      <div className="w-16 flex-shrink-0 text-[10px] text-[#606060] text-right">
        &lt;{expectedInDays}d
      </div>
    </div>
  );
}

export function OnboardingFunnelSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [focusStep, setFocusStep] = useState(ONBOARDING_STEPS[0].id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOnboardingFunnel()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load onboarding funnel');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const focusStepMeta = ONBOARDING_STEPS.find((s) => s.id === focusStep);
  const dropoutRows = data?.dropoffByStep[focusStep] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Onboarding Funnel</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            The first seven days after a member registers. Where do we lose them?
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

      {/* Headline: current cohort size + retention */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {loading || !data ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-28 animate-pulse"
            />
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-2">
                Current Cohort
              </p>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.cohorts.current.size}
              </p>
              <p className="text-xs text-[#606060] mt-2">Registered in the last 30 days</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-2">
                Previous Cohort
              </p>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.cohorts.previous.size}
              </p>
              <p className="text-xs text-[#606060] mt-2">Registered 31–60 days ago</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Target className="w-4 h-4 text-[#10B981]" />
                <p className="text-xs uppercase tracking-wider font-semibold">
                  Onboarded Retention
                </p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.retention30d.percent !== null
                  ? `${data.retention30d.percent}%`
                  : '—'}
              </p>
              <p className="text-xs text-[#606060] mt-2">
                {data.retention30d.retainedCount}/{data.retention30d.onboardedCount} members
                that finished 4+ steps returned after registration
              </p>
            </div>
          </>
        )}
      </div>

      {/* Funnel — current cohort with delta vs previous cohort */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">Funnel — Current Cohort</h4>
          <span className="text-xs text-[#A0A0A0]">
            Δ vs previous cohort
          </span>
        </div>
        {loading || !data ? (
          <div className="space-y-2">
            {ONBOARDING_STEPS.map((s) => (
              <div key={s.id} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.cohorts.current.size === 0 ? (
          <p className="text-xs text-[#606060]">No new members in the last 30 days.</p>
        ) : (
          <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, i) => {
              const cur = data.cohorts.current.steps.find((s) => s.id === step.id);
              const prev = data.cohorts.previous.steps.find((s) => s.id === step.id);
              return (
                <div key={step.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STEP_COLOR[i] }}
                      />
                      <span className="text-xs text-white font-medium">
                        {step.label}
                      </span>
                    </div>
                    <DeltaBadge current={cur.percent} previous={prev?.percent ?? null} />
                  </div>
                  <FunnelBar
                    percent={cur.percent}
                    count={cur.completed}
                    cohortSize={data.cohorts.current.size}
                    color={STEP_COLOR[i]}
                    expectedInDays={step.expectedWithinDays}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All-time completion */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">All Members — Ever Completed</h4>
          {!loading && data && (
            <span className="text-xs text-[#A0A0A0]">
              {data.cohorts.allTime.size} members
            </span>
          )}
        </div>
        {loading || !data ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {ONBOARDING_STEPS.map((s) => (
              <div key={s.id} className="h-20 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {data.cohorts.allTime.steps.map((s, i) => (
              <div
                key={s.id}
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3"
                style={{ borderLeftColor: STEP_COLOR[i], borderLeftWidth: 3 }}
              >
                <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] truncate">
                  {s.label}
                </p>
                <p className="text-xl font-bold text-white leading-none tabular-nums mt-1">
                  {s.percent}%
                </p>
                <p className="text-[10px] text-[#606060] mt-1">
                  {s.completed}/{data.cohorts.allTime.size}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drop-off list per step */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">Current Cohort Drop-off</h4>
            {!loading && (
              <span className="text-xs text-[#A0A0A0]">
                ({dropoutRows.length} incomplete)
              </span>
            )}
          </div>
          <select
            value={focusStep}
            onChange={(e) => setFocusStep(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[#FFD700]/50"
          >
            {ONBOARDING_STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                Missing: {s.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : dropoutRows.length === 0 ? (
          <p className="text-xs text-[#606060]">
            Everyone in the current cohort has completed &ldquo;{focusStepMeta.label}&rdquo;. ✓
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">Country</th>
                  <th className="py-2 pr-3 font-medium text-right">Days since register</th>
                </tr>
              </thead>
              <tbody>
                {dropoutRows.slice(0, 20).map((row) => (
                  <tr
                    key={row.uid}
                    className="border-b border-[rgba(255,255,255,0.03)]"
                  >
                    <td className="py-2 pr-3">
                      <div className="text-white font-medium">{row.displayName}</div>
                      <div className="text-[#606060]">{row.email}</div>
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0]">{row.companyName || '—'}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0]">{row.country || '—'}</td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums">
                      {row.daysSinceRegister ?? '—'}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dropoutRows.length > 20 && (
              <p className="mt-2 text-[11px] text-[#606060]">
                +{dropoutRows.length - 20} more
              </p>
            )}
          </div>
        )}
      </div>

      {/* Explainer */}
      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 text-xs text-[#A0A0A0]">
        <p className="text-white font-semibold mb-1">How this is measured</p>
        <p>
          Current pass reads steady-state fields on the user + product + request +
          conversation collections. There's no per-user timeline yet, so we know
          <em> whether</em> a step happened, not <em>when</em> in the first 7 days.
          Time-to-step curves and precise expected-window compliance land when the
          event pipeline (Bölüm 23 · Faz 1) is wired.
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
