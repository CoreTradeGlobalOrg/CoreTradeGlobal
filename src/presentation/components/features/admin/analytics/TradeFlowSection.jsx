/**
 * Trade Flow Map — Bölüm 19.
 *
 * The marketplace's heartbeat: RFQ → Negotiation → Accepted → In
 * Shipment → Delivered. Reads from `requests` (active RFQs) and
 * `deals` (everything after a seller engages), joins seller / buyer
 * identity from `users` in memory. One-shot data load via
 * getTradeFlowMetrics().
 *
 * Layout:
 *   1. Funnel strip — five stage cards with conversion percent
 *      between adjacent stages
 *   2. Conversion / time headline row
 *   3. Stall warnings — RFQs open too long, deals stuck negotiating
 *      or in shipment
 *   4. Active deals table — anything short of delivered
 *   5. Trade routes table — seller country → buyer country
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  RefreshCw,
  Target,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { getTradeFlowMetrics, TRADE_FLOW_STAGES } from '@/lib/analytics/queries';

const STAGE_COLORS = {
  rfq_active: '#3B82F6',
  negotiation: '#F59E0B',
  accepted: '#8B5CF6',
  in_shipment: '#06B6D4',
  delivered: '#10B981',
};

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatPercent(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return '—';
  return `${Math.round(p)}%`;
}

function formatDays(n) {
  if (n === null || n === undefined) return '—';
  return `${n} day${n === 1 ? '' : 's'}`;
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

export function TradeFlowSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTradeFlowMetrics()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load trade flow');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const funnelSteps = useMemo(() => {
    if (!data) return [];
    return TRADE_FLOW_STAGES.map((stage, i) => {
      const count = data.funnel[stage.id] || 0;
      const prev = i > 0 ? data.funnel[TRADE_FLOW_STAGES[i - 1].id] || 0 : null;
      const conversion = prev !== null && prev > 0 ? (count / prev) * 100 : null;
      return { ...stage, count, conversion };
    });
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Trade Flow Map</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            The marketplace pipeline — from RFQ to delivered.
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

      {/* Funnel strip */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        {loading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-stretch">
            {funnelSteps.map((step, i) => (
              <div key={step.id} className="relative">
                <div
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-full flex flex-col justify-between"
                  style={{ borderLeftColor: STAGE_COLORS[step.id], borderLeftWidth: 3 }}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                      {step.label}
                    </p>
                    <p className="text-2xl font-bold text-white leading-none mt-1 tabular-nums">
                      {step.count}
                    </p>
                  </div>
                  {i > 0 && step.conversion !== null && (
                    <p className="text-[10px] text-[#606060] mt-2">
                      {formatPercent(step.conversion)} from prev
                    </p>
                  )}
                </div>
                {i < funnelSteps.length - 1 && (
                  <ArrowRight className="hidden md:block w-3 h-3 text-[#606060] absolute right-[-8px] top-1/2 -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversion + time strip */}
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
              icon={Target}
              label="RFQ → Deal"
              value={formatPercent(data.conversion.rfqToDeal)}
              sub={`${formatNumber(data.totals.deals)} deals · ${formatNumber(data.totals.requests)} requests`}
            />
            <KpiCard
              icon={TrendingUp}
              label="Nego → Accepted"
              value={formatPercent(data.conversion.negoToAccepted)}
              sub="Of deals that reached negotiation"
            />
            <KpiCard
              icon={Truck}
              iconColor="#10B981"
              label="Delivered This Month"
              value={formatNumber(data.deliveredThisMonth)}
              sub={`${formatNumber(data.funnel.delivered)} delivered all-time`}
            />
            <KpiCard
              icon={Clock}
              label="Avg Shipment"
              value={formatDays(data.averages.shipmentDays)}
              sub={
                data.averages.negotiationDays !== null
                  ? `Negotiation avg ${formatDays(data.averages.negotiationDays)}`
                  : 'Negotiation avg —'
              }
            />
          </>
        )}
      </div>

      {/* Stalled warnings */}
      {!loading && data && data.stalled.length > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">
              Stalled Transactions ({data.stalled.length})
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs">
            {data.stalled.slice(0, 10).map((s) => (
              <li key={`${s.type}-${s.id}`} className="flex items-center justify-between gap-3">
                <span className="text-white truncate">
                  {s.actor}
                  <span className="text-[#606060] ml-2">· {s.label}</span>
                </span>
                <span className="text-amber-400 tabular-nums whitespace-nowrap">
                  {s.ageDays}d
                </span>
              </li>
            ))}
          </ul>
          {data.stalled.length > 10 && (
            <p className="mt-3 text-[10px] text-[#606060]">
              +{data.stalled.length - 10} more
            </p>
          )}
        </div>
      )}

      {/* Dropped states */}
      {!loading && data && data.dropped.total > 0 && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">
            Dropped ({data.dropped.total})
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-[#A0A0A0]">
              Rejected: <span className="text-red-400 font-medium">{data.dropped.rejected || 0}</span>
            </div>
            <div className="text-[#A0A0A0]">
              Expired: <span className="text-[#606060] font-medium">{data.dropped.expired || 0}</span>
            </div>
            <div className="text-[#A0A0A0]">
              Withdrawn: <span className="text-[#606060] font-medium">{data.dropped.withdrawn || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Active deals table */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">Active Transactions</h4>
          {!loading && data && (
            <span className="text-xs text-[#A0A0A0]">
              {data.activeDeals.length} deals
            </span>
          )}
        </div>
        {loading || !data ? (
          <div className="h-40 animate-pulse bg-[rgba(255,255,255,0.04)] rounded" />
        ) : data.activeDeals.length === 0 ? (
          <p className="text-xs text-[#606060]">No active transactions.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Seller</th>
                  <th className="py-2 pr-3 font-medium">Buyer</th>
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium">Stage</th>
                  <th className="py-2 pr-3 font-medium text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {data.activeDeals.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="py-2 pr-3 text-white max-w-[220px] truncate" title={row.productName}>
                      {row.productName}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] truncate max-w-[160px]" title={row.seller}>
                      {row.seller}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] truncate max-w-[160px]" title={row.buyer}>
                      {row.buyer}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] whitespace-nowrap">
                      {row.sellerCountry} <ArrowRight className="w-3 h-3 inline text-[#606060]" /> {row.buyerCountry}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                          color: STAGE_COLORS[row.stage],
                          borderColor: `${STAGE_COLORS[row.stage]}55`,
                          background: `${STAGE_COLORS[row.stage]}12`,
                        }}
                      >
                        {row.stageLabel}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">
                      {row.ageDays !== null ? `${row.ageDays}d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade routes */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">Trade Routes</h4>
          </div>
          {!loading && data && (
            <span className="text-xs text-[#A0A0A0]">{data.routes.length} unique routes</span>
          )}
        </div>
        {loading || !data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.routes.length === 0 ? (
          <p className="text-xs text-[#606060]">No trade routes yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[440px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Seller country</th>
                  <th className="py-2 pr-3 font-medium"></th>
                  <th className="py-2 pr-3 font-medium">Buyer country</th>
                  <th className="py-2 pr-3 font-medium text-right">Deals</th>
                </tr>
              </thead>
              <tbody>
                {data.routes.slice(0, 15).map((r) => (
                  <tr
                    key={`${r.sellerCountry}-${r.buyerCountry}`}
                    className="border-b border-[rgba(255,255,255,0.03)]"
                  >
                    <td className="py-2 pr-3 text-white">{r.sellerCountry}</td>
                    <td className="py-2 pr-3 text-[#606060]">
                      <ArrowRight className="w-3 h-3" />
                    </td>
                    <td className="py-2 pr-3 text-white">{r.buyerCountry}</td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums font-medium">
                      {r.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.routes.length > 15 && (
              <p className="mt-2 text-[11px] text-[#606060]">
                +{data.routes.length - 15} more routes
              </p>
            )}
          </div>
        )}
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Computed at {data.snapshotAt.toLocaleTimeString('en-US')}
        </p>
      )}
    </div>
  );
}
