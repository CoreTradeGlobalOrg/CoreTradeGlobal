/**
 * Profile Doluluk (Bölüm 10 of the plan).
 *
 * Ranks every member by how complete their profile is, using the
 * weighted registry in src/lib/analytics/queries.js (PROFILE_FIELDS).
 * The score doubles as an input to the future engagement model, so
 * getting it accurate here pays off later.
 *
 * Layout:
 *   1. Header KPIs — average %, plus 3 segment counts
 *   2. Sector averages table — which industries lag
 *   3. Members table — one row per user, missing-field chips,
 *      segment filter, search, "email listesi indir" for the segment
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, Users2 } from 'lucide-react';
import { getProfileCompleteness } from '@/lib/analytics/queries';

const SEGMENT_META = {
  weak: { label: 'Zayıf', range: '< 40%', color: '#EF4444' },
  medium: { label: 'Orta', range: '40 – 79%', color: '#F59E0B' },
  strong: { label: 'Tam', range: '≥ 80%', color: '#10B981' },
};

const SEGMENT_ORDER = ['weak', 'medium', 'strong'];

function scoreColor(percent) {
  if (percent >= 80) return '#10B981';
  if (percent >= 40) return '#F59E0B';
  return '#EF4444';
}

function downloadTxt(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ProfileCompletenessSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfileCompleteness()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profile completeness');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows
      .filter((r) => filter === 'all' || r.segment === filter)
      .filter((r) => {
        if (!q) return true;
        return (
          r.displayName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.companyCategory.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.percent - b.percent); // weakest first — actionable order
  }, [data, filter, search]);

  const handleExportEmails = (segment) => {
    if (!data) return;
    const rows = segment === 'all' ? data.rows : data.rows.filter((r) => r.segment === segment);
    const emails = rows.filter((r) => !r.isSuspended).map((r) => r.email).filter(Boolean).join('\n');
    if (!emails) return;
    const suffix = segment === 'all' ? 'all' : segment;
    downloadTxt(
      `profile-completeness-${suffix}-${new Date().toISOString().slice(0, 10)}.txt`,
      emails,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Profil Doluluk</h3>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Kimin profili tam, kim hatırlatma bekliyor. Skor 0-100.
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

      {/* Header KPIs: average + segment counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
              <p className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-2">
                Platform Ortalaması
              </p>
              <div className="flex items-baseline gap-2">
                <p
                  className="text-3xl font-bold leading-none tabular-nums"
                  style={{ color: scoreColor(data.averagePercent) }}
                >
                  {data.averagePercent}%
                </p>
                <p className="text-xs text-[#606060]">/ 100</p>
              </div>
              <p className="text-xs text-[#606060] mt-2">
                {data.total} üye üzerinden
              </p>
            </div>

            {SEGMENT_ORDER.map((seg) => {
              const meta = SEGMENT_META[seg];
              const count = data.counts[seg];
              const share = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
              return (
                <div
                  key={seg}
                  className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <p className="text-xs uppercase tracking-wider text-[#A0A0A0]">
                      {meta.label} <span className="text-[#606060]">({meta.range})</span>
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-bold text-white leading-none tabular-nums">
                      {count}
                    </p>
                    <p className="text-xs text-[#606060] tabular-nums">%{share}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportEmails(seg)}
                    disabled={count === 0}
                    className="mt-3 text-[10px] text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> mail listesi
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sector averages */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Sektör Ortalamaları</h4>
        {loading || !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
            ))}
          </div>
        ) : data.sectorAverages.length === 0 ? (
          <p className="text-xs text-[#606060]">Veri yok.</p>
        ) : (
          <div className="space-y-2.5">
            {data.sectorAverages.slice(0, 10).map((row) => (
              <div key={row.sector} className="flex items-center gap-3">
                <span
                  className="w-40 shrink-0 text-xs text-white truncate"
                  title={row.sector}
                >
                  {row.sector}
                </span>
                <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden relative">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.average}%`, background: scoreColor(row.average) }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-white tabular-nums">
                  {row.average}%{' '}
                  <span className="text-[#606060]">({row.count})</span>
                </span>
              </div>
            ))}
            {data.sectorAverages.length > 10 && (
              <p className="text-[11px] text-[#606060]">
                +{data.sectorAverages.length - 10} sektör daha
              </p>
            )}
          </div>
        )}
      </div>

      {/* Members table */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">Üye Bazlı Doluluk</h4>
            {!loading && (
              <span className="text-xs text-[#A0A0A0]">({filteredRows.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#606060] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İsim, şirket, sektör..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/50 w-56"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[#FFD700]/50"
            >
              <option value="all">Tüm segmentler</option>
              <option value="weak">Zayıf (&lt; 40%)</option>
              <option value="medium">Orta (40-79%)</option>
              <option value="strong">Tam (≥ 80%)</option>
            </select>
            <button
              type="button"
              onClick={() => handleExportEmails(filter)}
              disabled={loading || filteredRows.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Mail
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[860px] text-xs">
            <thead>
              <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                <th className="py-2.5 pr-3 font-medium">Üye</th>
                <th className="py-2.5 pr-3 font-medium">Sektör</th>
                <th className="py-2.5 pr-3 font-medium">Ülke</th>
                <th className="py-2.5 pr-3 font-medium">Skor</th>
                <th className="py-2.5 pr-3 font-medium">Kritik eksik</th>
                <th className="py-2.5 pr-3 font-medium">Eksik alanlar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#606060]">
                    Yükleniyor...
                  </td>
                </tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#606060]">
                    Bu filtreye uyan üye yok.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredRows.map((row) => (
                  <tr
                    key={row.uid}
                    className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="text-white font-medium">{row.displayName}</div>
                      <div className="text-[#606060]">
                        {row.companyName || row.email}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-[#A0A0A0]">
                      {row.companyCategory || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.country || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${row.percent}%`,
                              background: scoreColor(row.percent),
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-semibold tabular-nums w-9 text-right"
                          style={{ color: scoreColor(row.percent) }}
                        >
                          {row.percent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      {row.missingRequiredCount > 0 ? (
                        <span className="text-red-400 tabular-nums font-medium">
                          {row.missingRequiredCount}
                        </span>
                      ) : (
                        <span className="text-[#606060]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap gap-1 max-w-[320px]">
                        {row.missingFields.slice(0, 5).map((f) => (
                          <span
                            key={f.key}
                            className={[
                              'text-[10px] px-1.5 py-0.5 rounded border',
                              f.required
                                ? 'text-red-400 border-red-400/30 bg-red-400/5'
                                : 'text-[#A0A0A0] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]',
                            ].join(' ')}
                            title={`${f.label} (${f.weight}p${f.required ? ', zorunlu' : ''})`}
                          >
                            {f.label}
                          </span>
                        ))}
                        {row.missingFields.length > 5 && (
                          <span className="text-[10px] text-[#606060]">
                            +{row.missingFields.length - 5}
                          </span>
                        )}
                        {row.missingFields.length === 0 && (
                          <span className="text-[10px] text-green-400">Tam ✓</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
