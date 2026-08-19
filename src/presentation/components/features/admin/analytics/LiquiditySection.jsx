/**
 * Marketplace Liquidity — Bölüm 22.5.
 *
 * Composite "is this marketplace alive" view. Answers three
 * questions before anything else:
 *   - How many businesses touched the platform this week? (WAB)
 *   - When a buyer posts an RFQ, how fast does a quote arrive?
 *   - When a member registers, how long until their first deal?
 *
 * Plus supply-vs-demand balance, dead-listing ratio, and a weekly
 * pulse strip so the operator sees where the activity actually is.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Handshake,
  MessageSquare,
  Minus,
  Package,
  RefreshCw,
  Scale,
  Timer,
  Zap,
} from 'lucide-react';
import { getMarketplaceLiquidity } from '@/lib/analytics/queries';

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatHours(h) {
  if (h === null || h === undefined) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(h / 24)} days`;
}

function formatDays(d) {
  if (d === null || d === undefined) return '—';
  if (d < 1) return `${Math.round(d * 24)} h`;
  return `${Math.round(d * 10) / 10} d`;
}

function DeltaChip({ deltaPct }) {
  if (deltaPct === null || deltaPct === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[#606060]">
        <Minus className="w-3 h-3" />
        —
      </span>
    );
  }
  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[#606060]">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }
  const color = deltaPct > 0 ? '#10B981' : '#EF4444';
  const Icon = deltaPct > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums"
      style={{ color }}
    >
      <Icon className="w-3 h-3" />
      {deltaPct > 0 ? '+' : ''}
      {deltaPct}%
    </span>
  );
}

export function LiquiditySection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMarketplaceLiquidity()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load liquidity');
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
          <h3 className="text-lg font-semibold text-white">Marketplace Liquidity</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            The composite vitals — WAB, response times, supply/demand balance.
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

      {/* Headline: WAB */}
      <div className="rounded-2xl border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.04)] p-5">
        {loading || !data ? (
          <div className="h-32 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FFD700]" />
                <p className="text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold">
                  Weekly Active Businesses (WAB)
                </p>
              </div>
              <DeltaChip deltaPct={data.wab.deltaPct} />
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-5xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.wab.current)}
              </p>
              <p className="text-sm text-[#A0A0A0]">
                vs {formatNumber(data.wab.previous)} last week
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                Messaged <span className="text-white font-semibold">{data.wab.breakdown.message}</span>
              </span>
              <span className="px-2 py-1 rounded border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                Signed in <span className="text-white font-semibold">{data.wab.breakdown.login}</span>
              </span>
              <span className="px-2 py-1 rounded border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                Posted RFQ <span className="text-white font-semibold">{data.wab.breakdown.rfq}</span>
              </span>
              <span className="px-2 py-1 rounded border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                Deal activity <span className="text-white font-semibold">{data.wab.breakdown.deal}</span>
              </span>
              <span className="px-2 py-1 rounded border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                New product <span className="text-white font-semibold">{data.wab.breakdown.product}</span>
              </span>
            </div>
            <p className="mt-3 text-[10px] text-[#606060]">
              A business counts if they messaged, signed in, posted an RFQ, took part in a
              deal, or listed a product in the last 7 days. Buckets overlap intentionally.
            </p>
          </>
        )}
      </div>

      {/* Time-to metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading || !data ? (
          [0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-28 animate-pulse"
            />
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Timer className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-xs uppercase tracking-wider font-semibold">
                  Time to First Quote
                </p>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-white leading-none tabular-nums">
                  {formatHours(data.timeToFirstQuoteHours.avg)}
                </p>
                <p className="text-xs text-[#606060]">
                  median {formatHours(data.timeToFirstQuoteHours.median)}
                </p>
              </div>
              <p className="text-[10px] text-[#606060] mt-2">
                Across {data.timeToFirstQuoteHours.sampleSize} answered RFQs ·{' '}
                <span className="text-amber-400">{data.activeRfqsUnanswered}</span> still open
                with zero quotes
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Handshake className="w-4 h-4 text-[#10B981]" />
                <p className="text-xs uppercase tracking-wider font-semibold">
                  Time to First Deal
                </p>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-white leading-none tabular-nums">
                  {formatDays(data.timeToFirstTransactionDays.avg)}
                </p>
                <p className="text-xs text-[#606060]">
                  median {formatDays(data.timeToFirstTransactionDays.median)}
                </p>
              </div>
              <p className="text-[10px] text-[#606060] mt-2">
                Across {data.timeToFirstTransactionDays.sampleSize} members with at least one deal
              </p>
            </div>
          </>
        )}
      </div>

      {/* Supply / demand balance */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-[#FFD700]" />
          <h4 className="text-sm font-semibold text-white">Supply &amp; Demand Balance</h4>
        </div>
        {loading || !data ? (
          <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.05)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">Buyers</p>
              <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                {data.supplyDemand.buyers}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">
                {data.supplyDemand.activeBuyers} active (30d)
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.05)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">Sellers</p>
              <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                {data.supplyDemand.sellers}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">
                {data.supplyDemand.activeSellers} active (30d)
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.05)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">Both sides</p>
              <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                {data.supplyDemand.both}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">
                Members who buy AND sell
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.05)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                Buyer/Seller ratio
              </p>
              <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                {data.supplyDemand.ratio !== null
                  ? `${data.supplyDemand.ratio}:1`
                  : '—'}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">
                Active buyers per active seller
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Weekly pulse strip */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#F59E0B]" />
          <h4 className="text-sm font-semibold text-white">This Week</h4>
        </div>
        {loading || !data ? (
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-[#3B82F6]" />
              <div>
                <p className="text-xl font-bold text-white leading-none tabular-nums">
                  {formatNumber(data.pulse.weeklyMessages)}
                </p>
                <p className="text-[10px] text-[#606060] mt-1">Messages</p>
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 flex items-center gap-3">
              <Package className="w-4 h-4 text-[#FFD700]" />
              <div>
                <p className="text-xl font-bold text-white leading-none tabular-nums">
                  {formatNumber(data.pulse.weeklyRfqs)}
                </p>
                <p className="text-[10px] text-[#606060] mt-1">New RFQs</p>
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 flex items-center gap-3">
              <Handshake className="w-4 h-4 text-[#10B981]" />
              <div>
                <p className="text-xl font-bold text-white leading-none tabular-nums">
                  {formatNumber(data.pulse.weeklyDeals)}
                </p>
                <p className="text-[10px] text-[#606060] mt-1">New Deals</p>
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 flex items-center gap-3">
              <Package className="w-4 h-4 text-[#8B5CF6]" />
              <div>
                <p className="text-xl font-bold text-white leading-none tabular-nums">
                  {formatNumber(data.pulse.weeklyProducts)}
                </p>
                <p className="text-[10px] text-[#606060] mt-1">New Products</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dead listings drag */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-1">
              Dead-Listing Drag
            </p>
            <p className="text-2xl font-bold text-white leading-none tabular-nums">
              {data ? `${data.deadListingsRatio}%` : '—'}
            </p>
            <p className="text-[11px] text-[#606060] mt-2">
              Share of the catalog with no updates in 90+ days. See Catalog Health for the list.
            </p>
          </div>
          <div className="w-24 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden self-end">
            <div
              className="h-full rounded-full"
              style={{
                width: data ? `${data.deadListingsRatio}%` : '0%',
                background: data && data.deadListingsRatio > 40 ? '#EF4444' : data && data.deadListingsRatio > 20 ? '#F59E0B' : '#10B981',
              }}
            />
          </div>
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
