/**
 * Growth Analytics — Bölüm 4 of the plan.
 *
 * Six blocks, all fed by a single getGrowthMetrics() read:
 *   1. Header KPIs (MoM %, momentum arrow, monthly target progress,
 *      30-day forecast)
 *   2. Monthly registrations bar chart (12 months)
 *   3. Cumulative growth curve (90 days)
 *   4. Country delta table (this month vs last month, sortable)
 *   5. Company-type MoM breakdown (per-type mini-bars)
 *   6. Simple projection copy ("this month tempo → ~X new in next 30d")
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getGrowthMetrics } from '@/lib/analytics/queries';
import { COMPANY_TYPE_LABELS } from '@/core/constants/companyTypes';

// Monthly target lives here as a config default; wire an admin-editable
// input later if the team wants to change it from the panel.
const DEFAULT_MONTHLY_TARGET = 30;

const MONTH_LABEL_FMT = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' });

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return MONTH_LABEL_FMT.format(new Date(y, m - 1, 1));
}

function formatPercent(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return '—';
  const rounded = Math.round(p);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

function momentumMeta(momentum) {
  switch (momentum) {
    case 'accelerating':
      return { label: 'Hızlanıyor', color: '#10B981', Icon: ArrowUpRight };
    case 'slowing':
      return { label: 'Yavaşlıyor', color: '#EF4444', Icon: ArrowDownRight };
    case 'steady':
      return { label: 'Sabit', color: '#3B82F6', Icon: ArrowRight };
    default:
      return { label: 'Yetersiz veri', color: '#6B7280', Icon: ArrowRight };
  }
}

// --- primitives ------------------------------------------------------------

function KpiCard({ icon: Icon, label, value, sub, tone }) {
  const toneColor = tone === 'up' ? '#10B981' : tone === 'down' ? '#EF4444' : '#FFD700';
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
      <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
        {Icon && <Icon className="w-4 h-4" style={{ color: toneColor }} />}
        <p className="text-xs uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-3xl font-bold text-white leading-none tabular-nums">
        {value ?? <span className="text-[#606060]">—</span>}
      </p>
      {sub && <p className="text-xs text-[#606060] mt-2">{sub}</p>}
    </div>
  );
}

function BarChart({ series, height = 160, labelKey = 'month', formatLabel }) {
  const max = useMemo(
    () => series.reduce((m, r) => (r.count > m ? r.count : m), 0),
    [series],
  );
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {series.map((row) => {
          const barHeight = max > 0 ? Math.max((row.count / max) * (height - 24), row.count > 0 ? 4 : 0) : 0;
          return (
            <div
              key={row[labelKey]}
              className="flex-1 min-w-[8px] flex flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] text-[#A0A0A0] tabular-nums">{row.count || ''}</span>
              <div
                className="w-full rounded-t bg-[#FFD700]/40 hover:bg-[#FFD700] transition-colors"
                style={{ height: barHeight }}
                title={`${row[labelKey]}: ${row.count}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-2 mt-2">
        {series.map((row) => (
          <div
            key={row[labelKey]}
            className="flex-1 min-w-[8px] text-[10px] text-[#606060] text-center truncate"
          >
            {formatLabel ? formatLabel(row[labelKey]) : row[labelKey]}
          </div>
        ))}
      </div>
    </div>
  );
}

function CumulativeChart({ series, height = 140 }) {
  const { min, max, path } = useMemo(() => {
    if (!series?.length) return { min: 0, max: 0, path: '' };
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of series) {
      if (r.cumulative < lo) lo = r.cumulative;
      if (r.cumulative > hi) hi = r.cumulative;
    }
    if (lo === hi) hi = lo + 1; // avoid divide-by-zero
    const w = series.length - 1 || 1;
    const points = series.map((r, i) => {
      const x = (i / w) * 100;
      const y = 100 - ((r.cumulative - lo) / (hi - lo)) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return {
      min: lo,
      max: hi,
      path: `M${points.join(' L')}`,
    };
  }, [series]);

  if (!series?.length) return null;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height }}
        aria-hidden
      >
        <path
          d={`${path} L100,100 L0,100 Z`}
          fill="rgba(255, 215, 0, 0.08)"
        />
        <path
          d={path}
          fill="none"
          stroke="#FFD700"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-[#606060] mt-1">
        <span>{series[0].date} · {min}</span>
        <span>{series[series.length - 1].date} · {max}</span>
      </div>
    </div>
  );
}

// --- section root ----------------------------------------------------------

export function GrowthSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGrowthMetrics({ monthlyTarget: DEFAULT_MONTHLY_TARGET, monthsBack: 12 })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load growth data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const mom = momentumMeta(data?.momentum);
  const momTone = data?.momPercent > 0 ? 'up' : data?.momPercent < 0 ? 'down' : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Büyüme Analitiği</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Aylık hedef: <span className="text-white">{DEFAULT_MONTHLY_TARGET}</span> yeni üye
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* KPI header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-32 animate-pulse"
            />
          ))
        ) : (
          <>
            <KpiCard
              icon={TrendingUp}
              label="MoM Büyüme"
              value={formatPercent(data.momPercent)}
              sub={`Bu ay ${data.thisMonthCount} · Geçen ay ${data.lastMonthCount}`}
              tone={momTone}
            />
            <KpiCard
              icon={mom.Icon}
              label="Momentum"
              value={<span style={{ color: mom.color }}>{mom.label}</span>}
              sub="Son 3 tam ayın eğimi"
            />
            <KpiCard
              icon={Target}
              label={`Aylık Hedef (${DEFAULT_MONTHLY_TARGET})`}
              value={
                <span>
                  {data.thisMonthCount}
                  <span className="text-lg text-[#A0A0A0]">/{DEFAULT_MONTHLY_TARGET}</span>
                </span>
              }
              sub={
                <div className="mt-1">
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(data.targetProgressPercent, 100)}%`,
                        background:
                          data.targetProgressPercent >= 100
                            ? '#10B981'
                            : data.targetProgressPercent >= 60
                              ? '#FFD700'
                              : '#F59E0B',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#606060] mt-1">
                    {data.targetProgressPercent}% tamamlandı
                  </p>
                </div>
              }
            />
            <KpiCard
              icon={TrendingUp}
              label="30g Projeksiyon"
              value={`~${data.forecastNext30}`}
              sub="Son 30 gün ortalamasıyla"
            />
          </>
        )}
      </div>

      {/* Monthly bar + cumulative curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Aylık Kayıtlar (12 ay)</h4>
          {loading || !data ? (
            <div className="h-40 animate-pulse bg-[rgba(255,255,255,0.04)] rounded" />
          ) : (
            <BarChart
              series={data.monthlySeries.map((r) => ({ ...r, key: r.month }))}
              labelKey="month"
              formatLabel={monthLabel}
              height={160}
            />
          )}
        </div>
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">Kümülatif Büyüme (90 gün)</h4>
            {data?.total != null && (
              <span className="text-xs text-[#A0A0A0]">
                Toplam <span className="text-white font-semibold">{data.total}</span>
              </span>
            )}
          </div>
          {loading || !data ? (
            <div className="h-40 animate-pulse bg-[rgba(255,255,255,0.04)] rounded" />
          ) : (
            <CumulativeChart series={data.dailySeriesLast90} height={160} />
          )}
        </div>
      </div>

      {/* Country delta + company type MoM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">
            Ülke Bazlı Büyüme (bu ay vs geçen ay)
          </h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.countryDelta.length === 0 ? (
            <p className="text-xs text-[#606060]">Bu iki ayda kayıt yok.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[440px] text-xs">
                <thead>
                  <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="py-2 pr-3 font-medium">Ülke</th>
                    <th className="py-2 pr-3 font-medium text-right">Bu ay</th>
                    <th className="py-2 pr-3 font-medium text-right">Geçen ay</th>
                    <th className="py-2 pr-3 font-medium text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.countryDelta.slice(0, 12).map((row) => {
                    const deltaColor =
                      row.delta > 0
                        ? 'text-green-400'
                        : row.delta < 0
                          ? 'text-red-400'
                          : 'text-[#606060]';
                    return (
                      <tr
                        key={row.country}
                        className="border-b border-[rgba(255,255,255,0.03)]"
                      >
                        <td className="py-2 pr-3 text-white">{row.country}</td>
                        <td className="py-2 pr-3 text-white text-right tabular-nums">
                          {row.thisMonth}
                        </td>
                        <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                          {row.lastMonth}
                        </td>
                        <td className={`py-2 pr-3 text-right tabular-nums font-medium ${deltaColor}`}>
                          {row.delta > 0 ? `+${row.delta}` : row.delta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.countryDelta.length > 12 && (
                <p className="mt-2 text-[11px] text-[#606060]">
                  +{data.countryDelta.length - 12} daha
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Şirket Tipi — Aylık Trend</h4>
          {loading || !data ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.companyTypeSeries.length === 0 ? (
            <p className="text-xs text-[#606060]">Bu pencerede kayıt yok.</p>
          ) : (
            <div className="space-y-4">
              {data.companyTypeSeries.map((row) => {
                const total = row.series.reduce((s, r) => s + r.count, 0);
                const localMax = row.series.reduce(
                  (m, r) => (r.count > m ? r.count : m),
                  0,
                );
                return (
                  <div key={row.companyType}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white font-medium">
                        {COMPANY_TYPE_LABELS[row.companyType] || row.companyType}
                      </span>
                      <span className="text-[11px] text-[#A0A0A0] tabular-nums">
                        {total} toplam
                      </span>
                    </div>
                    <div className="flex items-end gap-[2px] h-8">
                      {row.series.map((r) => {
                        const h = localMax > 0 ? Math.max((r.count / localMax) * 100, r.count > 0 ? 8 : 0) : 0;
                        return (
                          <div
                            key={r.month}
                            className="flex-1 min-w-[3px] rounded-sm bg-[#FFD700]/40 hover:bg-[#FFD700] transition-colors"
                            style={{ height: `${h}%` }}
                            title={`${monthLabel(r.month)}: ${r.count}`}
                          />
                        );
                      })}
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
          Hesaplandı: {data.snapshotAt.toLocaleTimeString('tr-TR')}
        </p>
      )}
    </div>
  );
}
