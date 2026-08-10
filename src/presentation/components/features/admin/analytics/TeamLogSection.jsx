/**
 * Team Daily Log — Bölüm 8 of the analytics plan.
 *
 * Split-screen shape from the plan:
 *   left  — daily entry form (person, date, per-channel counters, note)
 *   right — team overview (today / week / month toggle, per-employee
 *           totals, last-entry column, missing-entry warnings, 30-day
 *           trend bars)
 *
 * All reads/writes go through src/lib/analytics/teamLog.js.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, Users2 } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import {
  CHANNELS,
  CHANNEL_KEYS,
  getMissingEntryWarnings,
  getTeamLogEntry,
  getTeamLogSummary,
  getTeamLogTrend,
  getTeamMembers,
  rangeBounds,
  saveTeamLogEntry,
  toDateKey,
} from '@/lib/analytics/teamLog';

const RANGES = [
  { value: 'today', label: 'Bugün' },
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
];

function emptyChannels() {
  return Object.fromEntries(CHANNEL_KEYS.map((k) => [k, 0]));
}

function formatRelative(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

// --- Left column: entry form ------------------------------------------------

function EntryForm({ teamMembers, currentUid, onSaved }) {
  const [selectedUid, setSelectedUid] = useState(currentUid || '');
  const [dateKey, setDateKey] = useState(toDateKey());
  const [channels, setChannels] = useState(emptyChannels());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Prefill from any existing entry for the selected (uid, date) pair.
  useEffect(() => {
    if (!selectedUid || !dateKey) {
      setChannels(emptyChannels());
      setNote('');
      setHasExisting(false);
      return;
    }
    let cancelled = false;
    setPrefillLoading(true);
    getTeamLogEntry(dateKey, selectedUid)
      .then((entry) => {
        if (cancelled) return;
        if (entry) {
          setChannels({ ...emptyChannels(), ...entry.channels });
          setNote(entry.note || '');
          setHasExisting(true);
        } else {
          setChannels(emptyChannels());
          setNote('');
          setHasExisting(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChannels(emptyChannels());
          setNote('');
          setHasExisting(false);
        }
      })
      .finally(() => {
        if (!cancelled) setPrefillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUid, dateKey]);

  const total = useMemo(
    () => CHANNEL_KEYS.reduce((s, k) => s + (Number(channels[k]) || 0), 0),
    [channels],
  );

  const grouped = useMemo(() => {
    const g = new Map();
    for (const c of CHANNELS) {
      if (!g.has(c.group)) g.set(c.group, []);
      g.get(c.group).push(c);
    }
    return Array.from(g.entries());
  }, []);

  const handleChannelChange = (key, value) => {
    const n = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setChannels((prev) => ({ ...prev, [key]: n }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUid) {
      toast.error('Bir isim seç.');
      return;
    }
    if (hasExisting) {
      const ok = window.confirm(
        'Bu gün için zaten giriş var. Üzerine yazayım mı?',
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const member = teamMembers.find((m) => m.uid === selectedUid);
      const saved = await saveTeamLogEntry({
        uid: selectedUid,
        employee: member?.displayName || '',
        dateKey,
        channels,
        note,
      });
      toast.success(`Kaydedildi — bugünkü senin toplamın: ${saved.total} mesaj`);
      setHasExisting(true);
      onSaved?.(saved);
    } catch (err) {
      toast.error(`Kaydedilemedi: ${err.message || 'bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Users2 className="w-4 h-4 text-[#FFD700]" />
        <h4 className="text-sm font-semibold text-white">Günlük Giriş</h4>
        {hasExisting && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded">
            Mevcut giriş
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="text-xs text-[#A0A0A0] mb-1 block">Kim giriyorsun?</span>
          <select
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
          >
            <option value="">Seç...</option>
            {teamMembers.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[#A0A0A0] mb-1 block">Tarih</span>
          <input
            type="date"
            value={dateKey}
            max={toDateKey()}
            onChange={(e) => setDateKey(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
          />
        </label>
      </div>

      {prefillLoading && (
        <div className="mb-3 text-xs text-[#606060] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mevcut giriş kontrol ediliyor...
        </div>
      )}

      <div className="space-y-4 mb-4">
        {grouped.map(([group, list]) => (
          <div key={group}>
            <p className="text-[11px] uppercase tracking-wider text-[#606060] mb-2">
              {group}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {list.map((c) => (
                <label key={c.key} className="block">
                  <span className="text-xs text-[#A0A0A0] mb-1 block truncate">
                    {c.label.replace(`${group} — `, '').replace(`${group} `, '')}
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={channels[c.key] === 0 ? '' : channels[c.key]}
                    onChange={(e) => handleChannelChange(c.key, e.target.value)}
                    placeholder="0"
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <label className="block mb-4">
        <span className="text-xs text-[#A0A0A0] mb-1 block">Not (opsiyonel)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Örn. Fashion sektörüne yoğunlaştım"
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/50 resize-none"
        />
      </label>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[#A0A0A0]">
          Toplam: <span className="text-white font-semibold">{total}</span> mesaj
        </p>
        <button
          type="submit"
          disabled={saving || !selectedUid}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFD700] hover:bg-[#B59325] text-black font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </button>
      </div>
    </form>
  );
}

// --- Right column: overview + trend ----------------------------------------

function OverviewTable({ range, summary, loading, refreshTick }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">
          Ekip Toplamı — {RANGES.find((r) => r.value === range)?.label}
        </h4>
        {!loading && summary && (
          <span className="text-xs text-[#A0A0A0]">
            <span className="text-white font-semibold">{summary.totalMessages}</span> mesaj
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-[#606060] text-sm">Yükleniyor...</div>
      ) : !summary || summary.perEmployee.length === 0 ? (
        <div className="py-10 text-center text-[#606060] text-sm">
          Bu aralıkta giriş yok.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                <th className="py-2 pr-3 font-medium">Çalışan</th>
                <th className="py-2 pr-3 font-medium text-right">LinkedIn</th>
                <th className="py-2 pr-3 font-medium text-right">Email</th>
                <th className="py-2 pr-3 font-medium text-right">Diğer</th>
                <th className="py-2 pr-3 font-medium text-right">TOPLAM</th>
                <th className="py-2 pr-3 font-medium">Son Giriş</th>
              </tr>
            </thead>
            <tbody>
              {summary.perEmployee.map((row) => {
                const linkedin =
                  (row.channels.linkedinConnect || 0) +
                  (row.channels.linkedinDM || 0) +
                  (row.channels.linkedinComment || 0);
                const email = (row.channels.emailBulk || 0) + (row.channels.emailPersonal || 0);
                const other = (row.channels.whatsapp || 0) + (row.channels.other || 0);
                return (
                  <tr
                    key={row.uid}
                    className="border-b border-[rgba(255,255,255,0.03)]"
                  >
                    <td className="py-2 pr-3 text-white">{row.employee}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">{linkedin}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">{email}</td>
                    <td className="py-2 pr-3 text-[#A0A0A0] text-right tabular-nums">{other}</td>
                    <td className="py-2 pr-3 text-white text-right font-semibold tabular-nums">
                      {row.total}
                    </td>
                    <td className="py-2 pr-3 text-[#A0A0A0]">
                      {row.lastEntry ? formatRelative(row.lastEntry) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-[rgba(255,215,0,0.04)]">
                <td className="py-2 pr-3 text-[#FFD700] font-semibold">TAKIM TOPLAMI</td>
                <td className="py-2 pr-3 text-[#FFD700] text-right font-semibold tabular-nums">
                  {summary.channelTotals.linkedinConnect +
                    summary.channelTotals.linkedinDM +
                    summary.channelTotals.linkedinComment}
                </td>
                <td className="py-2 pr-3 text-[#FFD700] text-right font-semibold tabular-nums">
                  {summary.channelTotals.emailBulk + summary.channelTotals.emailPersonal}
                </td>
                <td className="py-2 pr-3 text-[#FFD700] text-right font-semibold tabular-nums">
                  {summary.channelTotals.whatsapp + summary.channelTotals.other}
                </td>
                <td className="py-2 pr-3 text-[#FFD700] text-right font-bold tabular-nums">
                  {summary.totalMessages}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MissingWarnings({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  const flagged = warnings.filter((w) => w.severity !== 'ok');
  if (flagged.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">
        Eksik Giriş
      </p>
      <ul className="space-y-1.5">
        {flagged.map((w) => (
          <li key={w.uid} className="flex items-center gap-2 text-xs">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                w.severity === 'red' ? 'bg-red-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-white">{w.displayName}</span>
            <span className="text-[#606060]">
              {w.daysSince === null
                ? '— hiç giriş yok'
                : w.daysSince === 0
                  ? '— bugün henüz girmedi'
                  : `— ${w.daysSince} gündür giriş yok`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendBars({ trend, loading }) {
  const max = useMemo(() => {
    if (!trend?.length) return 0;
    return trend.reduce((m, d) => (d.total > m ? d.total : m), 0);
  }, [trend]);

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">Son 30 Gün Trend</h4>
        {!loading && trend?.length > 0 && (
          <span className="text-xs text-[#A0A0A0]">
            Zirve: <span className="text-white font-semibold">{max}</span>
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-24 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
      ) : !trend || trend.length === 0 ? (
        <p className="text-xs text-[#606060]">Trend için veri yok.</p>
      ) : (
        <div className="flex items-end gap-[3px] h-24">
          {trend.map((d) => {
            const height = max > 0 ? Math.max((d.total / max) * 100, d.total > 0 ? 4 : 0) : 0;
            return (
              <div
                key={d.date}
                className="flex-1 min-w-[3px] rounded-sm bg-[#FFD700]/40 hover:bg-[#FFD700] transition-colors"
                style={{ height: `${height}%` }}
                title={`${d.date}: ${d.total}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- section root ----------------------------------------------------------

export function TeamLogSection() {
  const { user } = useAuth();
  const [range, setRange] = useState('today');
  const [teamMembers, setTeamMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [trend, setTrend] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMembersLoading(true);
    getTeamMembers()
      .then((m) => {
        if (!cancelled) setTeamMembers(m);
      })
      .catch(() => {
        if (!cancelled) setTeamMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    const bounds = rangeBounds(range);
    Promise.all([
      getTeamLogSummary(bounds),
      getMissingEntryWarnings({ days: 3 }),
    ])
      .then(([s, w]) => {
        if (cancelled) return;
        setSummary(s);
        setWarnings(w);
      })
      .catch(() => {
        if (cancelled) return;
        setSummary(null);
        setWarnings([]);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    setTrendLoading(true);
    getTeamLogTrend({ days: 30 })
      .then((t) => {
        if (!cancelled) setTrend(t);
      })
      .catch(() => {
        if (!cancelled) setTrend([]);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const handleSaved = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {membersLoading ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-96 animate-pulse" />
        ) : (
          <EntryForm
            teamMembers={teamMembers}
            currentUid={user?.uid}
            onSaved={handleSaved}
          />
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={[
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  range === r.value
                    ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30'
                    : 'text-[#A0A0A0] border-transparent hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
                ].join(' ')}
              >
                {r.label}
              </button>
            ))}
          </div>
          <OverviewTable
            range={range}
            summary={summary}
            loading={summaryLoading}
            refreshTick={refreshTick}
          />
          <MissingWarnings warnings={warnings} />
        </div>
      </div>

      <TrendBars trend={trend} loading={trendLoading} />
    </div>
  );
}
