/**
 * Ads Performance — Bölüm 9 of the plan.
 *
 * The existing AdCampaignsManager already handles the operational side
 * (create / edit / expire / reject an ad). This section is the
 * analytics-oriented counterpart: how the whole book of business is
 * performing, not how a single campaign is edited.
 *
 * Layout:
 *   1. Status-count header (Active / Scheduled / Paused / Expired)
 *   2. Performance KPIs (impressions, clicks, avg CTR, currently running)
 *   3. Per-position table — impressions, clicks, CTR by ad type
 *   4. "Ending in 3 days" + "Past end date but still active" warnings
 *   5. Currently-running campaigns table with per-ad CTR
 *   6. Top advertisers by impressions
 *
 * Data comes from getAdsPerformance() — one Firestore read of the
 * `ads` collection, all aggregates derived in memory.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MousePointerClick,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getAdsPerformance } from '@/lib/analytics/queries';
import { AD_STATUS_LABELS, AD_TYPE_LABELS } from '@/core/constants/adTypes';

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('tr-TR');
}

function formatCtr(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return '—';
  const rounded = Math.round(pct * 100) / 100;
  return `${rounded}%`;
}

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function statusPillClass(status) {
  switch (status) {
    case 'active':
      return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'scheduled':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'paused':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'expired':
      return 'text-[#606060] bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.1)]';
    default:
      return 'text-[#A0A0A0] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)]';
  }
}

function KpiCard({ icon: Icon, label, value, sub, iconColor = '#FFD700' }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
      <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
        {Icon && <Icon className="w-4 h-4" style={{ color: iconColor }} />}
        <p className="text-xs uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-3xl font-bold text-white leading-none tabular-nums">
        {value ?? <span className="text-[#606060]">—</span>}
      </p>
      {sub && <div className="text-xs text-[#606060] mt-2">{sub}</div>}
    </div>
  );
}

export function AdsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAdsPerformance()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load ads');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const statusCounts = useMemo(
    () =>
      data
        ? [
            { key: 'active', label: 'Aktif', count: data.activeCount, color: '#10B981' },
            { key: 'scheduled', label: 'Zamanlanmış', count: data.scheduledCount, color: '#3B82F6' },
            { key: 'paused', label: 'Duraklatılmış', count: data.pausedCount, color: '#F59E0B' },
            { key: 'expired', label: 'Süresi Doldu', count: data.expiredCount, color: '#6B7280' },
          ]
        : [],
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Reklam Performansı</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Kampanya envanteri, konum bazlı performans, aktif reklamlar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin?tab=ad-campaigns"
            className="text-xs text-[#A0A0A0] hover:text-[#FFD700] transition-colors inline-flex items-center gap-1"
          >
            Yönetim <ArrowRight className="w-3 h-3" />
          </Link>
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
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !data
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-24 animate-pulse"
              />
            ))
          : statusCounts.map((s) => (
              <div
                key={s.key}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <p className="text-[11px] uppercase tracking-wider text-[#A0A0A0]">
                    {s.label}
                  </p>
                </div>
                <p className="text-2xl font-bold text-white leading-none tabular-nums">
                  {formatNumber(s.count)}
                </p>
              </div>
            ))}
      </div>

      {/* Performance KPIs */}
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
            <KpiCard
              icon={TrendingUp}
              label="Toplam Impression"
              value={formatNumber(data.totalImpressions)}
              sub="Aktif + geçmiş kampanyalar"
            />
            <KpiCard
              icon={MousePointerClick}
              label="Toplam Click"
              value={formatNumber(data.totalClicks)}
              sub="Hero, sponsored, carousel toplam"
            />
            <KpiCard
              icon={Target}
              label="Ortalama CTR"
              value={formatCtr(data.avgCtr)}
              sub="Click / Impression"
            />
            <KpiCard
              icon={CheckCircle2}
              iconColor="#10B981"
              label="Şu An Yayında"
              value={formatNumber(data.activeCount)}
              sub={`${data.total} toplam kampanya`}
            />
          </>
        )}
      </div>

      {/* Warnings — ending soon + past-due */}
      {(!loading && data && (data.endingSoon.length > 0 || data.stalePastEnd.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.endingSoon.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-white">
                  3 gün içinde bitecek ({data.endingSoon.length})
                </h4>
              </div>
              <ul className="space-y-1.5 text-xs">
                {data.endingSoon.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <span className="text-white truncate">
                      {row.companyName}
                      <span className="text-[#606060] ml-2">
                        · {AD_TYPE_LABELS[row.type] || row.type}
                      </span>
                    </span>
                    <span className="text-amber-400 tabular-nums whitespace-nowrap">
                      {row.daysRemaining === 0
                        ? 'Bugün biter'
                        : `${row.daysRemaining} gün`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.stalePastEnd.length > 0 && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h4 className="text-sm font-semibold text-white">
                  Bitmiş ama hâlâ &ldquo;active&rdquo; ({data.stalePastEnd.length})
                </h4>
              </div>
              <ul className="space-y-1.5 text-xs">
                {data.stalePastEnd.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <span className="text-white truncate">
                      {row.companyName}
                      <span className="text-[#606060] ml-2">
                        · {AD_TYPE_LABELS[row.type] || row.type}
                      </span>
                    </span>
                    <span className="text-red-400 tabular-nums whitespace-nowrap">
                      {row.daysOverdue} gün gecikmiş
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-[#606060]">
                Bu kayıtlar admin panelinden manuel &ldquo;Expired&rdquo; işaretlenmeli.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Per-position performance */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Konum Bazlı Performans</h4>
        {loading || !data ? (
          <div className="h-40 animate-pulse bg-[rgba(255,255,255,0.04)] rounded" />
        ) : data.byType.length === 0 ? (
          <p className="text-xs text-[#606060]">Kampanya yok.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[540px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Konum</th>
                  <th className="py-2 pr-3 font-medium text-right">Aktif</th>
                  <th className="py-2 pr-3 font-medium text-right">Toplam</th>
                  <th className="py-2 pr-3 font-medium text-right">Impression</th>
                  <th className="py-2 pr-3 font-medium text-right">Click</th>
                  <th className="py-2 pr-3 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.byType.map((row) => (
                  <tr
                    key={row.type}
                    className="border-b border-[rgba(255,255,255,0.03)]"
                  >
                    <td className="py-2 pr-3 text-white">
                      {AD_TYPE_LABELS[row.type] || row.type}
                    </td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums">{row.active}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">{row.total}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums font-medium">
                      {formatCtr(row.ctr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active campaigns table */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">Yayındaki Kampanyalar</h4>
          {!loading && data && (
            <span className="text-xs text-[#A0A0A0]">
              {data.activeCampaigns.length} kampanya
            </span>
          )}
        </div>
        {loading || !data ? (
          <div className="h-40 animate-pulse bg-[rgba(255,255,255,0.04)] rounded" />
        ) : data.activeCampaigns.length === 0 ? (
          <p className="text-xs text-[#606060]">Şu an yayında olan reklam yok.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Reklamveren</th>
                  <th className="py-2 pr-3 font-medium">Konum</th>
                  <th className="py-2 pr-3 font-medium">Tarih</th>
                  <th className="py-2 pr-3 font-medium">Kalan</th>
                  <th className="py-2 pr-3 font-medium text-right">Impression</th>
                  <th className="py-2 pr-3 font-medium text-right">Click</th>
                  <th className="py-2 pr-3 font-medium text-right">CTR</th>
                  <th className="py-2 pr-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {data.activeCampaigns.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="py-2 pr-3 text-white">{row.companyName}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0]">
                      {AD_TYPE_LABELS[row.type] || row.type}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] whitespace-nowrap">
                      {formatDate(row.startDate)} → {formatDate(row.endDate)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] tabular-nums whitespace-nowrap">
                      {row.daysRemaining === null
                        ? '—'
                        : row.daysRemaining <= 0
                          ? <span className="text-red-400">Bitmeli</span>
                          : `${row.daysRemaining} gün`}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums font-medium">
                      {formatCtr(row.ctr)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusPillClass(row.status)}`}
                      >
                        {AD_STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top advertisers */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">
          En Çok Yatırım Yapan Firmalar
        </h4>
        {loading || !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.byCompany.length === 0 ? (
          <p className="text-xs text-[#606060]">Veri yok.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[440px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Firma</th>
                  <th className="py-2 pr-3 font-medium text-right">Kampanya</th>
                  <th className="py-2 pr-3 font-medium text-right">Impression</th>
                  <th className="py-2 pr-3 font-medium text-right">Click</th>
                </tr>
              </thead>
              <tbody>
                {data.byCompany.map((row) => (
                  <tr key={row.companyName} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 pr-3 text-white truncate max-w-[240px]">
                      {row.companyName}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {row.campaigns}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {formatNumber(row.clicks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Hesaplandı: {data.snapshotAt.toLocaleTimeString('tr-TR')}
        </p>
      )}
    </div>
  );
}
