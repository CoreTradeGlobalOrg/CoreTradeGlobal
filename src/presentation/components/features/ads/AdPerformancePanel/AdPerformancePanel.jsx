/**
 * AdPerformancePanel
 *
 * Detailed stats for one sponsored ad: all-time impressions, clicks and
 * CTR (from the ad doc), a per-placement table and a day-by-day table
 * (from ads/{id}/dailyStats, written by trackAdImpression/trackAdClick).
 *
 * Used by /my-sponsorships (the advertiser's own ads) and the admin
 * AdCampaignsManager (every ad). firestore.rules let only the ad owner
 * and admins read dailyStats.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { db } from '@/core/config/firebase.config';

const SLOT_LABELS = {
  hero_product: 'Homepage hero, product card',
  hero_company: 'Homepage hero, company card',
  showcase: 'Sponsored Company showcase',
  products_list: 'Products directory tile',
  other: 'Other',
};

function formatCount(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function formatCtr(impressions, clicks) {
  if (!impressions) return '0%';
  const pct = (clicks / impressions) * 100;
  return `${pct >= 10 ? pct.toFixed(1) : pct.toFixed(2)}%`;
}

function formatDateKey(key) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#FFD700] tabular-nums">{value}</p>
    </div>
  );
}

function StatsTable({ title, firstColumn, rows, scroll = false }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">{title}</p>
      <div className={`overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)] ${scroll ? 'max-h-72 overflow-y-auto' : ''}`}>
        <table className="w-full min-w-[420px] text-sm">
          <thead className="sticky top-0 bg-[#16263a]">
            <tr className="text-[10px] uppercase tracking-wider text-[#A0A0A0]">
              <th className="px-3 py-2 text-left font-semibold">{firstColumn}</th>
              <th className="px-3 py-2 text-right font-semibold">Impressions</th>
              <th className="px-3 py-2 text-right font-semibold">Clicks</th>
              <th className="px-3 py-2 text-right font-semibold">CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-[rgba(255,255,255,0.06)] text-white">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.impressions)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCount(r.clicks)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCtr(r.impressions, r.clicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdPerformancePanel({ ad }) {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ad?.id) return undefined;
    let cancelled = false;
    getDocs(collection(db, 'ads', ad.id, 'dailyStats'))
      .then((snap) => {
        if (cancelled) return;
        setDays(snap.docs.map((d) => ({ date: d.id, ...d.data() })));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[AdPerformancePanel] dailyStats fetch failed:', err);
        setError('Could not load the daily breakdown.');
        setDays([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ad?.id]);

  const { dayRows, slotRows } = useMemo(() => {
    const list = days || [];
    const bySlot = {};
    for (const d of list) {
      for (const [slot, v] of Object.entries(d.slots || {})) {
        bySlot[slot] = bySlot[slot] || { impressions: 0, clicks: 0 };
        bySlot[slot].impressions += Number(v?.impressions) || 0;
        bySlot[slot].clicks += Number(v?.clicks) || 0;
      }
    }
    return {
      dayRows: [...list]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => ({
          key: d.date,
          label: formatDateKey(d.date),
          impressions: Number(d.impressions) || 0,
          clicks: Number(d.clicks) || 0,
        })),
      slotRows: Object.keys(SLOT_LABELS)
        .filter((slot) => bySlot[slot])
        .map((slot) => ({ key: slot, label: SLOT_LABELS[slot], ...bySlot[slot] })),
    };
  }, [days]);

  const impressions = Number(ad?.impressions) || 0;
  const clicks = Number(ad?.clicks) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Impressions" value={formatCount(impressions)} />
        <StatTile label="Clicks" value={formatCount(clicks)} />
        <StatTile label="CTR" value={formatCtr(impressions, clicks)} />
      </div>

      {days === null ? (
        <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading breakdown…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : dayRows.length === 0 ? (
        <p className="text-sm text-[#A0A0A0]">No daily data yet. The breakdown fills in as your ad is shown.</p>
      ) : (
        <>
          {dayRows.reduce((sum, d) => sum + d.impressions, 0) < impressions && (
            <p className="text-xs text-[#A0A0A0]">
              The daily breakdown starts on {dayRows[dayRows.length - 1].label}. Earlier activity is included in the totals above.
            </p>
          )}
          {slotRows.length > 0 && <StatsTable title="By placement" firstColumn="Placement" rows={slotRows} />}
          <StatsTable title="Day by day" firstColumn="Day" rows={dayRows} scroll />
        </>
      )}
    </div>
  );
}

export default AdPerformancePanel;
