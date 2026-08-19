/**
 * Verified / Trust — Bölüm 16.
 *
 * Trust-panel snapshot: who's fully verified, who's waiting in the
 * admin-approval queue, who's still stuck on email verification, and
 * how the verified ratio splits by country and sector. Actionable
 * queue is the point — this is where the admin works through
 * approvals with age-sorted context.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Clock,
  FileText,
  MailCheck,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { getTrustSnapshot } from '@/lib/analytics/queries';

function formatDays(n) {
  if (n === null || n === undefined) return '—';
  if (n === 0) return 'today';
  if (n === 1) return '1 day';
  return `${n} days`;
}

function ratioColor(ratio) {
  if (ratio >= 60) return '#10B981';
  if (ratio >= 30) return '#F59E0B';
  return '#EF4444';
}

export function TrustSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTrustSnapshot()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load trust data');
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
          <h3 className="text-lg font-semibold text-white">Verified / Trust</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Verification status, admin-approval queue, KYC document coverage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin?tab=users"
            className="text-xs text-[#A0A0A0] hover:text-[#FFD700] transition-colors"
          >
            Users admin →
          </Link>
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
          {error}
        </div>
      )}

      {/* KPI strip */}
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
                <BadgeCheck className="w-4 h-4 text-[#10B981]" />
                <p className="text-[10px] uppercase tracking-wider">Verified</p>
              </div>
              <p
                className="text-3xl font-bold tabular-nums leading-none"
                style={{ color: ratioColor(data.verifiedRatio) }}
              >
                {data.verifiedRatio}%
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                {data.verified}/{data.total} members fully verified
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Clock className="w-4 h-4 text-[#F59E0B]" />
                <p className="text-[10px] uppercase tracking-wider">Approval Queue</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.pendingApproval}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Email verified, waiting on admin
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <MailCheck className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-[10px] uppercase tracking-wider">Email Pending</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.pendingEmail}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">Never confirmed their email</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <FileText className="w-4 h-4 text-[#FFD700]" />
                <p className="text-[10px] uppercase tracking-wider">KYC Docs</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.docsUploaded}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Members with ≥1 uploaded document ({data.docsMissing} missing)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Admin approval queue */}
      <div className="rounded-2xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.04)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Admin Approval Queue</h4>
            {!loading && data && (
              <span className="text-xs text-[#A0A0A0]">
                ({data.approvalQueue.length})
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#606060]">
            Sorted by wait time — longest first
          </span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : !data?.approvalQueue?.length ? (
          <p className="text-xs text-[#606060] py-6 text-center">
            Nobody is waiting on approval — inbox clean.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">Country</th>
                  <th className="py-2 pr-3 font-medium">Docs</th>
                  <th className="py-2 pr-3 font-medium text-right">Waiting</th>
                </tr>
              </thead>
              <tbody>
                {data.approvalQueue.slice(0, 40).map((row) => (
                  <tr key={row.uid} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 pr-3">
                      <div className="text-white font-medium">{row.displayName}</div>
                      <div className="text-[#606060]">{row.email}</div>
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0]">{row.companyName || '—'}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0]">{row.country || '—'}</td>
                    <td className="py-2 pr-3">
                      {row.hasDocs ? (
                        <span className="text-green-400 text-[11px]">Uploaded</span>
                      ) : (
                        <span className="text-amber-400 text-[11px]">Missing</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-white text-right tabular-nums">
                      {formatDays(row.ageDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.approvalQueue.length > 40 && (
              <p className="mt-2 text-[11px] text-[#606060]">
                +{data.approvalQueue.length - 40} more waiting
              </p>
            )}
          </div>
        )}
      </div>

      {/* Country + sector ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Verified Ratio by Country</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.verifiedByCountry.length === 0 ? (
            <p className="text-xs text-[#606060]">No data.</p>
          ) : (
            <div className="space-y-2.5">
              {data.verifiedByCountry.slice(0, 10).map((row) => (
                <div key={row.country} className="flex items-center gap-3">
                  <span
                    className="w-32 shrink-0 text-xs text-white truncate"
                    title={row.country}
                  >
                    {row.country}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${row.ratio}%`, background: ratioColor(row.ratio) }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-white tabular-nums">
                    {row.ratio}%{' '}
                    <span className="text-[#606060]">
                      ({row.verified}/{row.total})
                    </span>
                  </span>
                </div>
              ))}
              {data.verifiedByCountry.length > 10 && (
                <p className="text-[11px] text-[#606060]">
                  +{data.verifiedByCountry.length - 10} more countries
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Verified Ratio by Sector</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.verifiedBySector.length === 0 ? (
            <p className="text-xs text-[#606060]">No data.</p>
          ) : (
            <div className="space-y-2.5">
              {data.verifiedBySector.slice(0, 10).map((row) => (
                <div key={row.sector} className="flex items-center gap-3">
                  <span
                    className="w-32 shrink-0 text-xs text-white truncate"
                    title={row.sector}
                  >
                    {row.sector}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${row.ratio}%`, background: ratioColor(row.ratio) }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-white tabular-nums">
                    {row.ratio}%{' '}
                    <span className="text-[#606060]">
                      ({row.verified}/{row.total})
                    </span>
                  </span>
                </div>
              ))}
              {data.verifiedBySector.length > 10 && (
                <p className="text-[11px] text-[#606060]">
                  +{data.verifiedBySector.length - 10} more sectors
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email pending list */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MailCheck className="w-4 h-4 text-[#3B82F6]" />
            <h4 className="text-sm font-semibold text-white">Never-Verified Emails</h4>
            {!loading && data && (
              <span className="text-xs text-[#A0A0A0]">
                ({data.emailPendingList.length})
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#606060]">Never clicked the confirmation link</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : !data?.emailPendingList?.length ? (
          <p className="text-xs text-[#606060] py-6 text-center">
            Every member has confirmed their email.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(255,255,255,0.04)] max-h-72 overflow-y-auto">
            {data.emailPendingList.slice(0, 40).map((row) => (
              <li key={row.uid} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium truncate">
                    {row.displayName}
                  </div>
                  <div className="text-[10px] text-[#606060] truncate">{row.email}</div>
                </div>
                <span className="text-[11px] text-[#A0A0A0] tabular-nums whitespace-nowrap">
                  {formatDays(row.ageDays)} old
                </span>
              </li>
            ))}
          </ul>
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
