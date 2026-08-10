/**
 * Overview section — top-line KPI cards.
 *
 * Data comes from src/lib/analytics/queries.js so the Firestore vs
 * Postgres backend swap doesn't touch this component.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Activity,
  Package,
  Megaphone,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { getOverviewKpis } from '@/lib/analytics/queries';

function KpiCard({ icon: Icon, label, value, hint, loading }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5 flex flex-col gap-3 min-h-[128px]">
      <div className="flex items-center gap-2 text-[#A0A0A0]">
        <Icon className="w-4 h-4" />
        <p className="text-xs uppercase tracking-wider font-semibold">{label}</p>
      </div>
      {loading ? (
        <div className="h-9 w-24 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-white leading-none">
          {value ?? <span className="text-[#606060]">—</span>}
        </p>
      )}
      {hint && <p className="text-xs text-[#606060] mt-auto">{hint}</p>}
    </div>
  );
}

export function OverviewSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOverviewKpis()
      .then((kpis) => {
        if (!cancelled) setData(kpis);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load KPIs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const cards = [
    {
      icon: Users,
      label: 'Toplam Üye',
      value: data?.totalMembers?.toLocaleString('tr-TR'),
    },
    {
      icon: UserPlus,
      label: 'Bu Hafta Yeni Üye',
      value: data?.newMembersThisWeek?.toLocaleString('tr-TR'),
      hint: 'Son 7 gün',
    },
    {
      icon: Activity,
      label: 'Aktif Üye (30g)',
      value: data?.activeMembers30d,
      hint: data?.activeMembers30d === null ? 'lastLoginAt izleme bekleniyor' : null,
    },
    {
      icon: Package,
      label: 'Toplam Ürün',
      value: data?.totalProducts?.toLocaleString('tr-TR'),
    },
    {
      icon: Megaphone,
      label: 'Aktif Reklam',
      value: data?.activeAds?.toLocaleString('tr-TR'),
    },
    {
      icon: MessageSquare,
      label: 'Toplam Konuşma',
      value: data?.activeConversations?.toLocaleString('tr-TR'),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Platform Nabzı</h3>
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
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          KPI'lar yüklenemedi: {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {data?.computedAt && (
        <p className="mt-3 text-[11px] text-[#606060]">
          Hesaplandı: {data.computedAt.toLocaleTimeString('tr-TR')}
        </p>
      )}
    </div>
  );
}
