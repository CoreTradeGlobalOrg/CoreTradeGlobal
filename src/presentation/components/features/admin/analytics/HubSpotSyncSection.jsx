/**
 * HubSpot ↔ Platform Sync — Bölüm 13.
 *
 * Reads the diff endpoint (matched / only-platform / only-hubspot /
 * conflicting segments) and lets the operator upsert individual
 * platform members into HubSpot with a single click. Bulk sync is
 * a small helper on top of the same endpoint.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Upload,
  Users2,
} from 'lucide-react';

const HUBSPOT_PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || null;

function contactUrl(id) {
  if (!HUBSPOT_PORTAL_ID || !id) return null;
  return `https://app-eu1.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-1/${id}`;
}

function downloadTxt(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HubSpotSyncSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [syncingUids, setSyncingUids] = useState(() => new Set());
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [tab, setTab] = useState('only-platform');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = refreshTick > 0
      ? '/api/analytics/hubspot/diff?refresh=1'
      : '/api/analytics/hubspot/diff';
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
        if (!cancelled) setError(err.message || 'Failed to load diff');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  async function syncOne(uid) {
    setSyncingUids((prev) => {
      const next = new Set(prev);
      next.add(uid);
      return next;
    });
    try {
      const res = await fetch('/api/analytics/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      toast.success(body.created ? 'Created in HubSpot' : 'Updated in HubSpot');
      return body;
    } catch (err) {
      toast.error(err.message || 'Sync failed');
      throw err;
    } finally {
      setSyncingUids((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  }

  async function syncBulk() {
    if (!data?.onlyPlatform?.length) return;
    const users = data.onlyPlatform;
    setBulkSyncing(true);
    let done = 0;
    let failed = 0;
    // Serial — the HubSpot API here goes through the same 4 req/s
    // search cap. syncOne is already ~1-2 requests each.
    for (const u of users) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await syncOne(u.uid);
        done += 1;
      } catch {
        failed += 1;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 400));
    }
    toast.success(`Bulk sync complete — ${done} synced${failed ? `, ${failed} failed` : ''}`);
    setBulkSyncing(false);
    setRefreshTick((t) => t + 1);
  }

  const activeRows = useMemo(() => {
    if (!data) return [];
    switch (tab) {
      case 'only-platform':
        return data.onlyPlatform;
      case 'only-hubspot':
        return data.onlyHubspot;
      case 'conflicting':
        return data.conflicting;
      case 'matched':
      default:
        return data.matched;
    }
  }, [data, tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">HubSpot ↔ Platform Sync</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Reconcile HubSpot contacts against platform members. Push missing users into HubSpot
            with a click.
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
          <p className="font-semibold mb-1">Diff computation failed</p>
          <p>{error}</p>
        </div>
      )}

      {data?.truncatedHubspot && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-300">
          HubSpot contact list truncated at 2,000 — bump the soft cap in
          /api/analytics/hubspot/diff/route.js when contact count exceeds this.
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-24 animate-pulse"
            />
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">Platform</p>
              <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                {data.totals.platform}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">Non-suspended members with email</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">HubSpot</p>
              <p className="text-2xl font-bold text-white leading-none tabular-nums mt-1">
                {data.totals.hubspot}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">Contacts with an email</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">Match Ratio</p>
              <p className="text-2xl font-bold leading-none tabular-nums mt-1" style={{ color: '#10B981' }}>
                {data.totals.matchRatio}%
              </p>
              <p className="text-[10px] text-[#606060] mt-1">
                {data.totals.matched} matched by email
              </p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">Missing in HubSpot</p>
              <p className="text-2xl font-bold leading-none tabular-nums mt-1" style={{ color: '#EF4444' }}>
                {data.totals.onlyPlatform}
              </p>
              <p className="text-[10px] text-[#606060] mt-1">
                Platform members not in HubSpot
              </p>
            </div>
          </>
        )}
      </div>

      {/* Bulk sync action */}
      {!loading && data && data.totals.onlyPlatform > 0 && (
        <div className="rounded-2xl border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.05)] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white font-medium">
              Push {data.totals.onlyPlatform} missing member{data.totals.onlyPlatform === 1 ? '' : 's'} into HubSpot
            </p>
            <p className="text-[11px] text-[#A0A0A0] mt-0.5">
              Serial sync (~1 s per contact). CTG User ID, Company Type, Role, Verified Status,
              Registration Date, and Last Login are set on every upsert.
            </p>
          </div>
          <button
            type="button"
            onClick={syncBulk}
            disabled={bulkSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFD700] hover:bg-[#B59325] text-black font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {bulkSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {bulkSyncing ? 'Syncing…' : 'Bulk Sync'}
          </button>
        </div>
      )}

      {/* Segment tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.06)]">
        {[
          { id: 'only-platform', label: 'Only Platform', color: '#EF4444', count: data?.totals.onlyPlatform ?? 0 },
          { id: 'only-hubspot', label: 'Only HubSpot', color: '#F59E0B', count: data?.totals.onlyHubspot ?? 0 },
          { id: 'conflicting', label: 'Conflicting', color: '#F97316', count: data?.totals.conflicting ?? 0 },
          { id: 'matched', label: 'Matched', color: '#10B981', count: data?.totals.matched ?? 0 },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                active
                  ? 'text-white'
                  : 'text-[#A0A0A0] hover:text-white border-transparent',
              ].join(' ')}
              style={active ? { borderColor: t.color } : {}}
            >
              {t.label}
              <span
                className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  color: active ? t.color : '#606060',
                  background: active ? `${t.color}15` : 'rgba(255,255,255,0.04)',
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tab rows */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : activeRows.length === 0 ? (
          <p className="text-xs text-[#606060] py-8 text-center">Nothing in this segment.</p>
        ) : tab === 'only-platform' ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">Country</th>
                  <th className="py-2 pr-3 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {activeRows.slice(0, 100).map((u) => {
                  const syncing = syncingUids.has(u.uid);
                  return (
                    <tr key={u.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 pr-3">
                        <div className="text-white font-medium">{u.displayName || `${u.firstName} ${u.lastName}`.trim() || '(no name)'}</div>
                        <div className="text-[#606060]">{u.email}</div>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{u.companyName || '—'}</td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{u.country || '—'}</td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => syncOne(u.uid)}
                          disabled={syncing || bulkSyncing}
                          className="inline-flex items-center gap-1 text-[11px] text-[#FFD700] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {syncing ? 'Syncing…' : 'Sync'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {activeRows.length > 100 && (
              <p className="mt-2 text-[11px] text-[#606060]">
                +{activeRows.length - 100} more · Use Bulk Sync above
              </p>
            )}
          </div>
        ) : tab === 'only-hubspot' ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-[#A0A0A0]">
                These HubSpot contacts have no matching platform member — cold outreach / lead
                pool.
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadTxt(
                    `only-hubspot-${new Date().toISOString().slice(0, 10)}.txt`,
                    activeRows.map((r) => r.email).join('\n'),
                  )
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700]"
              >
                <Download className="w-3 h-3" /> Emails
              </button>
            </div>
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Contact</th>
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">Stage</th>
                  <th className="py-2 pr-3 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {activeRows.slice(0, 100).map((c) => {
                  const url = contactUrl(c.hubspotId);
                  return (
                    <tr key={c.hubspotId} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 pr-3">
                        <div className="text-white font-medium">
                          {`${c.firstName} ${c.lastName}`.trim() || '(no name)'}
                        </div>
                        <div className="text-[#606060]">{c.email}</div>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{c.companyName || '—'}</td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{c.lifecycleStage || '—'}</td>
                      <td className="py-2 pr-3 text-right">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-[#FFD700]"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : tab === 'conflicting' ? (
          <div className="space-y-2">
            <p className="text-[11px] text-[#A0A0A0] mb-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5" />
              Same email on both sides but firstName / lastName / company differs — someone
              renamed themselves in one of the two systems. Resolve manually.
            </p>
            {activeRows.map(({ user, contact }) => {
              const url = contactUrl(contact.hubspotId);
              return (
                <div
                  key={user.uid}
                  className="rounded-xl border border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.04)] p-3 text-xs"
                >
                  <p className="text-white font-medium">{user.email}</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1">Platform</p>
                      <p className="text-white">
                        {`${user.firstName} ${user.lastName}`.trim() || user.displayName || '(no name)'}
                      </p>
                      <p className="text-[#606060]">{user.companyName || '—'}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">HubSpot</p>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#A0A0A0] hover:text-[#FFD700] inline-flex items-center gap-1"
                          >
                            Open <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-white">
                        {`${contact.firstName} ${contact.lastName}`.trim() || '(no name)'}
                      </p>
                      <p className="text-[#606060]">{contact.companyName || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => syncOne(user.uid)}
                      disabled={syncingUids.has(user.uid)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#FFD700] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {syncingUids.has(user.uid) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3" /> Overwrite HubSpot with Platform
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">CTG User ID</th>
                  <th className="py-2 pr-3 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {activeRows.slice(0, 100).map(({ user, contact }) => {
                  const url = contactUrl(contact.hubspotId);
                  const idOk = contact.ctgUserId === user.uid;
                  return (
                    <tr key={user.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 pr-3">
                        <div className="text-white font-medium">
                          {user.displayName || `${user.firstName} ${user.lastName}`.trim() || '(no name)'}
                        </div>
                        <div className="text-[#606060]">{user.email}</div>
                      </td>
                      <td className="py-2 pr-3 text-[#A0A0A0]">{user.companyName || '—'}</td>
                      <td className="py-2 pr-3">
                        {contact.ctgUserId ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" style={{ color: idOk ? '#10B981' : '#F59E0B' }} />
                            <span className="text-[10px] text-[#606060] font-mono truncate max-w-[140px]">
                              {contact.ctgUserId.slice(0, 12)}…
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400">Missing — resync to fix</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#A0A0A0] hover:text-[#FFD700]"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeRows.length > 100 && (
                  <tr>
                    <td colSpan={4} className="text-[11px] text-[#606060] pt-2">
                      +{activeRows.length - 100} more matched
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.snapshotAt && (
        <p className="text-[11px] text-[#606060] flex items-center gap-2">
          <Users2 className="w-3 h-3" />
          Diff computed at {new Date(data.snapshotAt).toLocaleTimeString('en-US')}
        </p>
      )}
    </div>
  );
}
