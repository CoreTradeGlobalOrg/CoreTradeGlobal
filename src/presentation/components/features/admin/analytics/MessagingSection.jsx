/**
 * In-Platform Messaging Analytics — Bölüm 21.
 *
 * Reads every conversation + messages subcollection via a
 * collectionGroup query and surfaces volume, response quality,
 * off-platform steering flags, and per-responder ranking.
 *
 * Fraud / language / spam-detection signals that need ML sit out
 * of scope; the regex-based off-platform detection is a first
 * pass and false-positive-tolerant on purpose (missed positives
 * are the real risk).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Info,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Timer,
  Users2,
} from 'lucide-react';
import { getMessagingAnalytics } from '@/lib/analytics/queries';

const FLAG_LABEL = {
  email: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  skype: 'Skype',
  iban: 'IBAN',
};

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

function responseColor(h) {
  if (h === null || h === undefined) return '#6B7280';
  if (h <= 4) return '#10B981';
  if (h <= 24) return '#FFD700';
  if (h <= 72) return '#F59E0B';
  return '#EF4444';
}

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function MessagingSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMessagingAnalytics()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load messaging analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const trendMax = useMemo(() => {
    if (!data?.dailyTrend?.length) return 0;
    return data.dailyTrend.reduce((m, d) => (d.count > m ? d.count : m), 0);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Messaging Analytics</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            In-platform conversation volume, response quality, off-platform detection.
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
                <MessageSquare className="w-4 h-4 text-[#FFD700]" />
                <p className="text-[10px] uppercase tracking-wider">Total Messages</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.totalMessages)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                {formatNumber(data.messagesLast7d)} in last 7 days
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Users2 className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-[10px] uppercase tracking-wider">Active Threads</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {formatNumber(data.activeConversations30d)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Updated within last 30 days · {data.totalConversations} total
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Timer className="w-4 h-4" style={{ color: responseColor(data.avgFirstResponseHours) }} />
                <p className="text-[10px] uppercase tracking-wider">Avg First Reply</p>
              </div>
              <p
                className="text-3xl font-bold leading-none tabular-nums"
                style={{ color: responseColor(data.avgFirstResponseHours) }}
              >
                {formatHours(data.avgFirstResponseHours)}
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                {data.unansweredConversations} unanswered conversations
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="flex items-center gap-2 text-[#A0A0A0] mb-2">
                <Paperclip className="w-4 h-4 text-[#8B5CF6]" />
                <p className="text-[10px] uppercase tracking-wider">Attachment Rate</p>
              </div>
              <p className="text-3xl font-bold text-white leading-none tabular-nums">
                {data.attachmentRate}%
              </p>
              <p className="text-[10px] text-[#606060] mt-2">
                Empty / short: {data.emptyMessageRate}%
              </p>
            </div>
          </>
        )}
      </div>

      {/* Slow responders + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Slowest Responders</h4>
          {loading || !data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
              ))}
            </div>
          ) : data.slowResponders.length === 0 ? (
            <p className="text-xs text-[#606060]">Not enough response data yet.</p>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
              {data.slowResponders.map((r) => (
                <li key={r.uid} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white truncate">{r.name}</div>
                    <div className="text-[10px] text-[#606060]">
                      {r.sampleSize} response{r.sampleSize === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums whitespace-nowrap"
                    style={{ color: responseColor(r.avgResponseHours) }}
                  >
                    {formatHours(r.avgResponseHours)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">30-Day Message Volume</h4>
            {!loading && data && trendMax > 0 && (
              <span className="text-xs text-[#A0A0A0]">
                Peak: <span className="text-white font-semibold">{trendMax}</span>
              </span>
            )}
          </div>
          {loading || !data ? (
            <div className="h-32 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
          ) : trendMax === 0 ? (
            <p className="text-xs text-[#606060]">No volume in the last 30 days.</p>
          ) : (
            <div className="flex items-end gap-[2px] h-32">
              {data.dailyTrend.map((d) => {
                const h = trendMax > 0 ? Math.max((d.count / trendMax) * 100, d.count > 0 ? 4 : 0) : 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-[2px] rounded-sm bg-[#3B82F6]/40 hover:bg-[#3B82F6] transition-colors"
                    style={{ height: `${h}%` }}
                    title={`${d.date}: ${d.count}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Off-platform detection */}
      <div className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.04)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-semibold text-white">Off-Platform Steering</h4>
            {!loading && data && (
              <span className="text-xs text-[#A0A0A0]">
                ({data.flaggedMessages.length} flagged messages)
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#606060]">
            Regex-based detection · review before acting
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.flaggedMessages.length === 0 ? (
          <p className="text-xs text-[#606060] py-6 text-center">
            No off-platform patterns detected — messaging is clean.
          </p>
        ) : (
          <>
            {/* Category counts */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(data.flagCategoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  className="text-[11px] px-2 py-1 rounded-lg border border-red-400/30 bg-red-400/5 text-red-300"
                >
                  {FLAG_LABEL[cat] || cat}: <span className="text-white font-semibold">{count}</span>
                </span>
              ))}
            </div>

            {/* Message list */}
            <ul className="divide-y divide-[rgba(255,255,255,0.04)] max-h-96 overflow-y-auto">
              {data.flaggedMessages.slice(0, 30).map((msg, i) => (
                <li key={`${msg.conversationId}-${i}`} className="py-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-medium">{msg.senderName}</span>
                      {msg.categories.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-red-400/40 bg-red-400/10 text-red-300"
                        >
                          {FLAG_LABEL[c] || c}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[10px] text-[#606060] whitespace-nowrap">
                        {formatDate(msg.createdAt)}
                      </span>
                      <Link
                        href={`/messages/${msg.conversationId}`}
                        className="text-[11px] text-[#A0A0A0] hover:text-[#FFD700]"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                  <p className="text-xs text-[#A0A0A0] italic line-clamp-2">
                    &ldquo;{msg.snippet}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
            {data.flaggedMessages.length > 30 && (
              <p className="mt-2 text-[11px] text-[#606060]">
                +{data.flaggedMessages.length - 30} more flagged messages
              </p>
            )}
          </>
        )}
      </div>

      {/* Explainer */}
      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 text-xs text-[#A0A0A0]">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-white font-semibold mb-1">First-pass detection scope</p>
            <p>
              Off-platform steering uses regex on message text (email, phone,
              WhatsApp, Telegram, Skype, IBAN). Language distribution, fraud
              scoring, and content-quality ML need dedicated models or the
              event log — not built yet. Response times are attributed to the
              first replier who isn't the conversation opener; multi-party
              threads are treated as a single conversation.
            </p>
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
