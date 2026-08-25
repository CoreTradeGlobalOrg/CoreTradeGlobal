/**
 * HubSpot CRM — Bölüm 5.
 *
 * Reads through /api/analytics/hubspot — server-only route holds the
 * Private App access token. Client never sees it. Fresh fetch per
 * request today; Bölüm 13 (sync-to-Firestore via cron) is a
 * follow-up that eliminates the per-panel-open HubSpot round-trip.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  DollarSign,
  ExternalLink,
  Handshake,
  RefreshCw,
  UserPlus,
  Users2,
} from 'lucide-react';

const HUBSPOT_PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || null;

const LIFECYCLE_META = {
  subscriber: { label: 'Subscriber', color: '#6B7280' },
  lead: { label: 'Lead', color: '#3B82F6' },
  marketingqualifiedlead: { label: 'MQL', color: '#8B5CF6' },
  salesqualifiedlead: { label: 'SQL', color: '#F59E0B' },
  opportunity: { label: 'Opportunity', color: '#F97316' },
  customer: { label: 'Customer', color: '#10B981' },
  evangelist: { label: 'Evangelist', color: '#FFD700' },
  other: { label: 'Other', color: '#606060' },
};

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatAmount(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
}

function contactPortalUrl(id) {
  if (!HUBSPOT_PORTAL_ID || !id) return null;
  return `https://app-eu1.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-1/${id}`;
}

function dealPortalUrl(id) {
  if (!HUBSPOT_PORTAL_ID || !id) return null;
  return `https://app-eu1.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-3/${id}`;
}

export function HubSpotSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/hubspot?refresh=1'
      : '/api/analytics/hubspot';
    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok || !body?.ok) {
          throw new Error(body?.error || `HTTP ${r.status}`);
        }
        return body;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load HubSpot data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const totalLifecycle = useMemo(() => {
    if (!data?.lifecycleDistribution) return 0;
    return data.lifecycleDistribution.reduce((s, b) => s + b.count, 0);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">HubSpot CRM</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Contacts, companies, deals — pulled live from HubSpot's Private App API.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {HUBSPOT_PORTAL_ID && (
            <a
              href={`https://app-eu1.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#A0A0A0] hover:text-[#FFD700] transition-colors inline-flex items-center gap-1"
            >
              Open HubSpot <ExternalLink className="w-3 h-3" />
            </a>
          )}
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
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <p className="font-semibold mb-1">HubSpot request failed</p>
          <p>{error}</p>
          <p className="mt-2 text-[11px] text-red-300/70">
            Check <code>HUBSPOT_ACCESS_TOKEN</code> in the environment — must be a valid Private
            App token with <code>crm.objects.contacts.read</code>, <code>companies.read</code>,
            and <code>deals.read</code> scopes.
          </p>
        </div>
      )}

      {/* Top KPIs */}
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
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Users2 className="w-4 h-4 text-[#FFD700]" />
                <p className="text-[10px] uppercase tracking-wider">Contacts</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.contacts.total)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                +{formatNumber(data.contacts.newLast7)} last 7d
                {' · '}
                +{formatNumber(data.contacts.newLast30)} last 30d
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Building2 className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-[10px] uppercase tracking-wider">Companies</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.companies.total)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Unique organisations in HubSpot</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Handshake className="w-4 h-4 text-[#F59E0B]" />
                <p className="text-[10px] uppercase tracking-wider">Open Deals</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.deals.open)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                {formatNumber(data.deals.total)} deals total
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <DollarSign className="w-4 h-4 text-[#10B981]" />
                <p className="text-[10px] uppercase tracking-wider">Win / Loss</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.deals.won)}
                <span className="text-lg text-[#606060]"> / {formatNumber(data.deals.lost)}</span>
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                {data.deals.won + data.deals.lost > 0
                  ? `${Math.round((data.deals.won / (data.deals.won + data.deals.lost)) * 100)}% win rate`
                  : 'No closed deals yet'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Lifecycle distribution */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Lifecycle Stage Distribution</h4>
        {loading || !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.lifecycleDistribution.length === 0 ? (
          <p className="text-xs text-[#606060]">
            No contacts have a lifecycle stage set yet — assign one in HubSpot to populate this
            chart.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.lifecycleDistribution.map((bucket) => {
              const meta = LIFECYCLE_META[bucket.stage] || { label: bucket.stage, color: '#606060' };
              const pct = totalLifecycle > 0 ? Math.round((bucket.count / totalLifecycle) * 100) : 0;
              return (
                <div key={bucket.stage} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-white truncate">
                    {meta.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: meta.color, opacity: 0.75 }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-white tabular-nums">
                    {formatNumber(bucket.count)}{' '}
                    <span className="text-[#606060]">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent contacts + deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">Recently Added Contacts</h4>
          </div>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.recentContacts.length === 0 ? (
            <p className="text-xs text-[#606060]">No contacts yet.</p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
              {data.recentContacts.map((c) => {
                const url = contactPortalUrl(c.id);
                const meta = LIFECYCLE_META[c.lifecycleStage];
                return (
                  <li key={c.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-white font-medium truncate">
                        {c.firstName || c.lastName
                          ? `${c.firstName} ${c.lastName}`.trim()
                          : c.email || '(no name)'}
                        {meta && (
                          <span
                            className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                            style={{
                              color: meta.color,
                              borderColor: `${meta.color}55`,
                              background: `${meta.color}12`,
                            }}
                          >
                            {meta.label}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#606060] truncate">
                        {c.email}
                        {c.company && ` · ${c.company}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-[#606060] whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </span>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#A0A0A0] hover:text-[#FFD700]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Handshake className="w-4 h-4 text-[#F59E0B]" />
            <h4 className="text-sm font-semibold text-white">Recent Deals</h4>
          </div>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.recentDeals.length === 0 ? (
            <p className="text-xs text-[#606060]">No deals yet.</p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
              {data.recentDeals.map((d) => {
                const url = dealPortalUrl(d.id);
                return (
                  <li key={d.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-white font-medium truncate">
                        {d.name || '(no name)'}
                      </div>
                      <div className="text-[10px] text-[#606060] truncate">
                        {d.stage}
                        {d.pipeline && d.pipeline !== 'default' && ` · ${d.pipeline}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-white tabular-nums whitespace-nowrap">
                        {formatAmount(d.amount)}
                      </span>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#A0A0A0] hover:text-[#FFD700]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060]">
          Computed at {new Date(data.snapshotAt).toLocaleTimeString('en-US')} · Live from HubSpot
        </p>
      )}
    </div>
  );
}
