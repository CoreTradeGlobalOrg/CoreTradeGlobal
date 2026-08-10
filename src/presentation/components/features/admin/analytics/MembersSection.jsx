/**
 * Members section — 3.1 (recent registrations), 3.2 (profile
 * distribution), 3.3 (activity), 3.4 (churn risk). Sub-tab
 * navigation at the top keeps each view focused.
 *
 * Data comes from src/lib/analytics/queries.js — no Firestore imports
 * here so the backend swap is a one-file change.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Search, Users2 } from 'lucide-react';
import {
  activityBucket,
  getMemberActivitySnapshot,
  getMemberDistribution,
  getRecentMembers,
} from '@/lib/analytics/queries';
import { COMPANY_TYPE_LABELS } from '@/core/constants/companyTypes';

const DAY_RANGES = [
  { value: 7, label: 'Son 7 gün' },
  { value: 30, label: 'Son 30 gün' },
  { value: 90, label: 'Son 90 gün' },
];

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toCsv(rows) {
  const header = ['Name', 'Email', 'Company', 'Country', 'Company Type', 'Registered', 'Verified', 'Suspended'];
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.displayName,
        row.email,
        row.companyName,
        row.country,
        COMPANY_TYPE_LABELS[row.companyType] || row.companyType || '',
        row.createdAt ? row.createdAt.toISOString() : '',
        row.isVerified ? 'yes' : 'no',
        row.isSuspended ? 'yes' : 'no',
      ]
        .map(escape)
        .join(','),
    );
  }
  return lines.join('\n');
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- 3.2 distribution chart primitives -------------------------------------

function DistributionBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-[#A0A0A0] truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FFD700]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-white tabular-nums">
        {count} <span className="text-[#606060]">({pct}%)</span>
      </span>
    </div>
  );
}

function DistributionCard({ title, buckets, total, limit = 10 }) {
  const visible = buckets.slice(0, limit);
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
      <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
      {visible.length === 0 ? (
        <p className="text-xs text-[#606060]">Veri yok.</p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((row) => (
            <DistributionBar
              key={row.key}
              label={row.key}
              count={row.count}
              total={total}
            />
          ))}
        </div>
      )}
      {buckets.length > limit && (
        <p className="mt-3 text-[11px] text-[#606060]">
          +{buckets.length - limit} daha
        </p>
      )}
    </div>
  );
}

// --- 3.1 recent members table ----------------------------------------------

function RecentMembersTable() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRecentMembers({ days })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load members');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.displayName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.companyName?.toLowerCase().includes(q) ||
        r.country?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const handleExport = () => {
    if (!filtered.length) return;
    downloadCsv(`new-members-${days}d-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtered));
  };

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users2 className="w-4 h-4 text-[#FFD700]" />
          <h4 className="text-sm font-semibold text-white">Yeni Üyeler</h4>
          {!loading && (
            <span className="text-xs text-[#A0A0A0]">
              ({filtered.length}{search && ` / ${rows.length}`})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#606060] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, email, şirket, ülke..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/50 w-56"
            />
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[#FFD700]/50"
          >
            {DAY_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
              <th className="py-2.5 pr-3 font-medium">İsim</th>
              <th className="py-2.5 pr-3 font-medium">Şirket</th>
              <th className="py-2.5 pr-3 font-medium">Ülke</th>
              <th className="py-2.5 pr-3 font-medium">Tip</th>
              <th className="py-2.5 pr-3 font-medium">Kayıt</th>
              <th className="py-2.5 pr-3 font-medium">Durum</th>
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
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#606060]">
                  Bu aralıkta yeni üye yok.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <td className="py-2.5 pr-3">
                    <div className="text-white font-medium">{row.displayName}</div>
                    <div className="text-[#606060]">{row.email}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.companyName || '—'}</td>
                  <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.country || '—'}</td>
                  <td className="py-2.5 pr-3 text-[#A0A0A0]">
                    {COMPANY_TYPE_LABELS[row.companyType] || '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-[#A0A0A0]">{formatDate(row.createdAt)}</td>
                  <td className="py-2.5 pr-3">
                    {row.isSuspended ? (
                      <span className="text-red-400">Askıda</span>
                    ) : row.isVerified ? (
                      <span className="text-green-400">Verified</span>
                    ) : (
                      <span className="text-amber-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 3.2 profile distribution view -----------------------------------------

function DistributionView() {
  const [distribution, setDistribution] = useState(null);
  const [distLoading, setDistLoading] = useState(true);
  const [distError, setDistError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDistLoading(true);
    setDistError(null);
    getMemberDistribution()
      .then((data) => {
        if (!cancelled) setDistribution(data);
      })
      .catch((err) => {
        if (!cancelled) setDistError(err.message || 'Failed to load distribution');
      })
      .finally(() => {
        if (!cancelled) setDistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byCompanyType = distribution
    ? distribution.byCompanyType.map((row) => ({
        key: COMPANY_TYPE_LABELS[row.key] || row.key,
        count: row.count,
      }))
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Profil Dağılımı</h3>
        {distribution?.total != null && (
          <span className="text-xs text-[#A0A0A0]">Toplam {distribution.total} üye</span>
        )}
      </div>

      {distError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Dağılım yüklenemedi: {distError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {distLoading || !distribution ? (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 h-64 animate-pulse"
              />
            ))}
          </>
        ) : (
          <>
            <DistributionCard
              title="Ülke Dağılımı (Top 10)"
              buckets={distribution.byCountry}
              total={distribution.total}
              limit={10}
            />
            <DistributionCard
              title="Şirket Tipi"
              buckets={byCompanyType}
              total={distribution.total}
              limit={10}
            />
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
              <h4 className="text-sm font-semibold text-white mb-4">Verified Oranı</h4>
              <div className="flex items-center gap-4">
                <div
                  className="relative w-24 h-24 rounded-full"
                  style={{
                    background: `conic-gradient(#10B981 0 ${
                      distribution.total > 0
                        ? Math.round((distribution.verifiedCount / distribution.total) * 360)
                        : 0
                    }deg, rgba(255,255,255,0.06) 0)`,
                  }}
                >
                  <div className="absolute inset-2 bg-[#0F1B2B] rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {distribution.total > 0
                        ? Math.round((distribution.verifiedCount / distribution.total) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-2 text-[#A0A0A0] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    Verified: <span className="text-white font-medium ml-1">{distribution.verifiedCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#A0A0A0]">
                    <span className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.1)]" />
                    Pending: <span className="text-white font-medium ml-1">{distribution.unverifiedCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- shared activity snapshot loader (3.3 + 3.4) ---------------------------

function useActivitySnapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMemberActivitySnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { snapshot, loading, error };
}

function formatDaysSince(days) {
  if (days === null || days === undefined) return '— (hiç giriş yok)';
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 60) return `${days} gün önce`;
  return `${days} gün önce`;
}

// --- 3.3 activity view -----------------------------------------------------

const ACTIVITY_BUCKET_META = {
  active7d: { label: 'Son 7 gün', color: '#10B981' },
  active30d: { label: '8-30 gün', color: '#3B82F6' },
  dormant30to60: { label: '31-60 gün', color: '#F59E0B' },
  churn60to90: { label: '61-90 gün', color: '#F97316' },
  churn90plus: { label: '90+ gün', color: '#EF4444' },
  never: { label: 'Hiç giriş yok', color: '#6B7280' },
};

const ACTIVITY_FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'active7d', label: 'Aktif (7g)' },
  { value: 'active30d', label: 'Aktif (30g)' },
  { value: 'active90d', label: 'Aktif (90g)' },
  { value: 'dormant', label: 'Sessiz (30-90g)' },
];

function bucketMatchesFilter(bucket, filter) {
  switch (filter) {
    case 'all':
      return true;
    case 'active7d':
      return bucket === 'active7d';
    case 'active30d':
      return bucket === 'active7d' || bucket === 'active30d';
    case 'active90d':
      return (
        bucket === 'active7d' ||
        bucket === 'active30d' ||
        bucket === 'dormant30to60' ||
        bucket === 'churn60to90'
      );
    case 'dormant':
      return (
        bucket === 'dormant30to60' ||
        bucket === 'churn60to90'
      );
    default:
      return true;
  }
}

function ActivityView() {
  const { snapshot, loading, error } = useActivitySnapshot();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!snapshot) return [];
    const q = search.trim().toLowerCase();
    return snapshot.rows
      .filter((r) => bucketMatchesFilter(r.bucket, filter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.displayName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Never-logged-in rows sink to the bottom, others by recency.
        const av = a.daysSinceLogin ?? Number.POSITIVE_INFINITY;
        const bv = b.daysSinceLogin ?? Number.POSITIVE_INFINITY;
        return av - bv;
      });
  }, [snapshot, filter, search]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading || !snapshot
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-24 animate-pulse"
              />
            ))
          : Object.entries(ACTIVITY_BUCKET_META).map(([bucket, meta]) => (
              <div
                key={bucket}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <p className="text-[11px] uppercase tracking-wider text-[#A0A0A0]">
                    {meta.label}
                  </p>
                </div>
                <p className="text-2xl font-bold text-white leading-none tabular-nums">
                  {snapshot.counts[bucket]?.toLocaleString('tr-TR') || 0}
                </p>
              </div>
            ))}
      </div>

      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-[#FFD700]" />
            <h4 className="text-sm font-semibold text-white">Aktivite Tablosu</h4>
            {!loading && (
              <span className="text-xs text-[#A0A0A0]">({filtered.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#606060] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ara..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[#606060] focus:outline-none focus:border-[#FFD700]/50 w-48"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white focus:outline-none focus:border-[#FFD700]/50"
            >
              {ACTIVITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                <th className="py-2.5 pr-3 font-medium">Üye</th>
                <th className="py-2.5 pr-3 font-medium">Şirket</th>
                <th className="py-2.5 pr-3 font-medium">Ülke</th>
                <th className="py-2.5 pr-3 font-medium">Bucket</th>
                <th className="py-2.5 pr-3 font-medium">Son giriş</th>
                <th className="py-2.5 pr-3 font-medium">Durum</th>
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
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#606060]">
                    Bu filtreye uyan üye yok.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((row) => {
                  const meta = ACTIVITY_BUCKET_META[row.bucket];
                  return (
                    <tr
                      key={row.uid}
                      className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="text-white font-medium">{row.displayName}</div>
                        <div className="text-[#606060]">{row.email}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.companyName || '—'}</td>
                      <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.country || '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1.5 text-[#A0A0A0]">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-[#A0A0A0]">
                        {formatDaysSince(row.daysSinceLogin)}
                      </td>
                      <td className="py-2.5 pr-3">
                        {row.isSuspended ? (
                          <span className="text-red-400">Askıda</span>
                        ) : row.isVerified ? (
                          <span className="text-green-400">Verified</span>
                        ) : (
                          <span className="text-amber-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 3.4 churn risk view ---------------------------------------------------

const CHURN_BUCKET_ORDER = ['dormant30to60', 'churn60to90', 'churn90plus', 'never'];

function ChurnView() {
  const { snapshot, loading, error } = useActivitySnapshot();

  const atRisk = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.rows
      .filter((r) => CHURN_BUCKET_ORDER.includes(r.bucket))
      .filter((r) => !r.isSuspended)
      .sort((a, b) => {
        const av = a.daysSinceLogin ?? Number.POSITIVE_INFINITY;
        const bv = b.daysSinceLogin ?? Number.POSITIVE_INFINITY;
        return bv - av; // longest silence first
      });
  }, [snapshot]);

  const grouped = useMemo(() => {
    const g = { dormant30to60: [], churn60to90: [], churn90plus: [], never: [] };
    for (const row of atRisk) g[row.bucket].push(row);
    return g;
  }, [atRisk]);

  const handleExportEmails = (bucket) => {
    const rows = bucket === 'all' ? atRisk : grouped[bucket];
    if (!rows?.length) return;
    const emails = rows.map((r) => r.email).filter(Boolean).join('\n');
    const blob = new Blob([emails], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = bucket === 'all' ? 'all' : bucket;
    link.download = `re-engagement-${suffix}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !snapshot
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 h-28 animate-pulse"
              />
            ))
          : CHURN_BUCKET_ORDER.map((bucket) => {
              const meta = ACTIVITY_BUCKET_META[bucket];
              const count = grouped[bucket].length;
              return (
                <div
                  key={bucket}
                  className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle
                      className="w-3.5 h-3.5"
                      style={{ color: meta.color }}
                    />
                    <p className="text-[11px] uppercase tracking-wider text-[#A0A0A0]">
                      {meta.label}
                    </p>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold text-white leading-none tabular-nums">
                      {count.toLocaleString('tr-TR')}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleExportEmails(bucket)}
                      disabled={count === 0}
                      className="text-[10px] text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Bu bucket'ın emaillerini indir"
                    >
                      <Download className="w-3 h-3 inline" /> mail
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Re-engagement Listesi</h4>
            {!loading && (
              <span className="text-xs text-[#A0A0A0]">({atRisk.length})</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleExportEmails('all')}
            disabled={loading || atRisk.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Tüm listeyi indir
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[#A0A0A0] border-b border-[rgba(255,255,255,0.06)]">
                <th className="py-2.5 pr-3 font-medium">Üye</th>
                <th className="py-2.5 pr-3 font-medium">Şirket</th>
                <th className="py-2.5 pr-3 font-medium">Ülke</th>
                <th className="py-2.5 pr-3 font-medium">Sessizlik</th>
                <th className="py-2.5 pr-3 font-medium">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#606060]">
                    Yükleniyor...
                  </td>
                </tr>
              )}
              {!loading && atRisk.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#606060]">
                    Şu an risk altında üye yok — hepsi son 30 gün içinde girmiş.
                  </td>
                </tr>
              )}
              {!loading &&
                atRisk.map((row) => {
                  const meta = ACTIVITY_BUCKET_META[row.bucket];
                  return (
                    <tr
                      key={row.uid}
                      className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="text-white font-medium">{row.displayName}</div>
                        <div className="text-[#606060]">{row.email}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.companyName || '—'}</td>
                      <td className="py-2.5 pr-3 text-[#A0A0A0]">{row.country || '—'}</td>
                      <td className="py-2.5 pr-3 text-white tabular-nums">
                        {formatDaysSince(row.daysSinceLogin)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1.5 text-[#A0A0A0]">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- section root ----------------------------------------------------------

const SUB_TABS = [
  { id: 'recent', label: 'Yeni Üyeler' },
  { id: 'distribution', label: 'Profil Dağılımı' },
  { id: 'activity', label: 'Aktivite' },
  { id: 'churn', label: 'Churn Risk' },
];

export function MembersSection() {
  const [activeTab, setActiveTab] = useState('recent');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.06)] -mx-2 px-2 overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-3 py-2 -mb-px text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-[#FFD700] text-[#FFD700]'
                  : 'border-transparent text-[#A0A0A0] hover:text-white',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'recent' && <RecentMembersTable />}
      {activeTab === 'distribution' && <DistributionView />}
      {activeTab === 'activity' && <ActivityView />}
      {activeTab === 'churn' && <ChurnView />}
    </div>
  );
}
