/**
 * Product Views
 *
 * URL: /product-views[?week=2026-W45 | ?week=live]
 *
 * Where the weekly product view notification, push and email lead. Shows a
 * member's report in large type: views that week, all-time views and each
 * product's numbers, with the advertising offer next to them.
 *
 * Past weeks come from users/{uid}/viewReports/{weekKey}, which
 * sendWeeklyProductViewReport stores every Monday. "This week so far" is
 * read live from the member's products, so the page is useful before the
 * first stored report and between reports.
 */

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { ArrowRight, ChevronLeft, ChevronRight, Eye, Loader2, Package, PlusCircle, Sparkles, TrendingUp } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useTrackEvent } from '@/presentation/hooks/analytics/useTrackEvent';
import { ProductThumbImg } from '@/presentation/components/common/ProductThumbImg/ProductThumbImg';

const LIVE = 'live';
const REPORTS_SHOWN = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
// Turkey time (UTC+3, no DST), like the week keys trackProductView writes.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

// Same as isoWeekKey() in functions/index.js, so live numbers match the
// weekViewKey that trackProductView stores on each product.
function isoWeekKey(date) {
  const d = new Date(date.getTime() + TR_OFFSET_MS);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week decides the year
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** "Mon, Nov 10": the Monday that started the current week (Turkey time). */
function currentWeekStartLabel(now) {
  const local = new Date(now.getTime() + TR_OFFSET_MS);
  const day = (local.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day));
  return monday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatCount(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function plural(n, word) {
  return `${formatCount(n)} ${n === 1 ? word : `${word}s`}`;
}

function byWeeklyThenName(a, b) {
  return b.weekly - a.weekly || a.name.localeCompare(b.name);
}

function firstImage(images) {
  return Array.isArray(images) ? images.find((url) => typeof url === 'string' && url) || null : null;
}

export default function ProductViewsPage() {
  return (
    <Suspense fallback={<PageSpinner label="Loading your report…" />}>
      <ProductViewsContent />
    </Suspense>
  );
}

function ProductViewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedWeek = searchParams.get('week');
  const { user, loading: authLoading } = useAuth();
  const { track } = useTrackEvent();
  const [entries, setEntries] = useState(null); // newest first: live week, then stored reports
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (authLoading || user?.uid) return;
    const back = `/product-views${requestedWeek ? `?week=${encodeURIComponent(requestedWeek)}` : ''}`;
    router.replace(`/login?redirect=${encodeURIComponent(back)}`);
  }, [authLoading, user, router, requestedWeek]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const [reportsSnap, productsSnap] = await Promise.all([
        getDocs(query(
          collection(db, COLLECTIONS.USERS, user.uid, 'viewReports'),
          orderBy('weekKey', 'desc'),
          limit(REPORTS_SHOWN)
        )).catch((err) => {
          console.warn('[product-views] reports fetch failed:', err);
          return null;
        }),
        getDocs(query(collection(db, COLLECTIONS.PRODUCTS), where('userId', '==', user.uid))).catch((err) => {
          console.warn('[product-views] products fetch failed:', err);
          return null;
        }),
      ]);
      if (cancelled) return;
      // Both reads failed: say so instead of showing an empty report.
      if (!reportsSnap && !productsSnap) {
        setLoadFailed(true);
        return;
      }

      const weekKey = isoWeekKey(now);
      const liveProducts = (productsSnap?.docs || [])
        .map((d) => {
          const p = d.data();
          return {
            id: d.id,
            name: p.name || 'Untitled product',
            image: firstImage(p.images),
            status: p.status || null,
            weekly: p.weekViewKey === weekKey ? Number(p.weekViewCount) || 0 : 0,
            allTime: Number(p.viewCount) || 0,
          };
        })
        .sort(byWeeklyThenName);

      const live = {
        key: LIVE,
        navLabel: 'This week',
        periodLabel: `This week so far · since ${currentWeekStartLabel(now)}`,
        statLabel: 'Views this week so far',
        weeklyTotal: liveProducts.reduce((sum, p) => sum + p.weekly, 0),
        allTimeTotal: liveProducts.reduce((sum, p) => sum + p.allTime, 0),
        productCount: liveProducts.length,
        products: liveProducts,
      };

      const lastWeekKey = isoWeekKey(new Date(now.getTime() - 7 * DAY_MS));
      const reports = (reportsSnap?.docs || []).map((d) => {
        const r = d.data();
        return {
          key: r.weekKey || d.id,
          navLabel: r.rangeLabel || r.weekKey || d.id,
          periodLabel: r.rangeLabel || r.weekKey || d.id,
          statLabel: (r.weekKey || d.id) === lastWeekKey ? 'Views last week' : 'Views that week',
          weeklyTotal: Number(r.weeklyTotal) || 0,
          allTimeTotal: Number(r.allTimeTotal) || 0,
          productCount: Number(r.productCount) || (r.products || []).length,
          products: [...(r.products || [])].sort(byWeeklyThenName),
        };
      });

      setEntries([live, ...reports]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // ?week= picks the entry; without it the latest stored report opens
  // (that is what the notification is about), or the live week if none.
  const { entry, index, missingWeek } = useMemo(() => {
    if (!entries) return { entry: null, index: -1, missingWeek: false };
    if (requestedWeek) {
      const i = entries.findIndex((e) => e.key === requestedWeek);
      if (i >= 0) return { entry: entries[i], index: i, missingWeek: false };
    }
    const fallback = entries.length > 1 ? 1 : 0;
    return {
      entry: entries[fallback],
      index: fallback,
      missingWeek: !!requestedWeek && requestedWeek !== LIVE,
    };
  }, [entries, requestedWeek]);

  const goTo = (i) => {
    const next = entries?.[i];
    if (!next) return;
    router.replace(`/product-views?week=${encodeURIComponent(next.key)}`, { scroll: false });
  };

  if (authLoading || !user?.uid) return <PageSpinner label="Checking session…" />;
  if (loadFailed) {
    return (
      <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
        <div className="max-w-md mx-auto px-5 py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">We couldn&apos;t load your report</h1>
          <p className="text-[#A0A0A0] text-sm mb-6">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-sm font-semibold hover:bg-[rgba(255,255,255,0.05)]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!entry) return <PageSpinner label="Loading your report…" />;

  const maxWeekly = Math.max(1, ...entry.products.map((p) => p.weekly));
  const hasProducts = entries.some((e) => e.productCount > 0);

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-5">
        <Link
          href={`/profile/${user.uid}?tab=products`}
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm mb-6 no-underline"
          style={{ color: '#A0A0A0' }}
        >
          <ChevronLeft className="w-4 h-4" />
          My products
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Product Views</h1>
            <p className="text-[#c8d3e0] text-base md:text-lg">{entry.periodLabel}</p>
          </div>
          {entries.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index >= entries.length - 1}
                aria-label="Older week"
                className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="min-w-[150px] text-center text-sm font-semibold">{entry.navLabel}</span>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index <= 0}
                aria-label="Newer week"
                className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {missingWeek && (
          <p className="mb-6 rounded-xl border border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.06)] px-4 py-3 text-sm text-[#c8d3e0]">
            We couldn&apos;t find the report for that week, so here is your latest one.
          </p>
        )}

        {/* Headline numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-1 rounded-3xl border border-[rgba(255,215,0,0.35)] bg-gradient-to-br from-[rgba(255,215,0,0.12)] to-[rgba(15,27,43,0.9)] p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#FFD700] mb-3">
              <Eye className="w-4 h-4" />
              {entry.statLabel}
            </p>
            <p className="text-6xl md:text-7xl font-extrabold tracking-tight tabular-nums leading-none">
              {formatCount(entry.weeklyTotal)}
            </p>
          </div>
          <StatCard icon={TrendingUp} label="All-time views" value={formatCount(entry.allTimeTotal)} />
          <StatCard icon={Package} label="Products" value={formatCount(entry.productCount)} />
        </div>

        {/* Advertising offer */}
        <section className="mb-8 rounded-3xl border border-[rgba(255,215,0,0.3)] bg-gradient-to-br from-[rgba(26,40,59,0.95)] to-[rgba(15,27,43,0.98)] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FDB931] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-7 h-7 text-[#0F1B2B]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-extrabold mb-1.5">
              {entry.weeklyTotal === 0 ? 'Get your first views' : 'Want more views?'}
            </h2>
            <p className="text-[#c8d3e0] text-sm md:text-base leading-relaxed">
              The Sponsored Package puts your products on both homepage hero cards, the Sponsored Company
              showcase and the top of the products directory for a full month.
            </p>
          </div>
          <Link
            href="/advertising"
            onClick={() => track('advertising_promo_click', { source: 'product_views', week: entry.key })}
            style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm no-underline whitespace-nowrap hover:shadow-[0_10px_25px_rgba(255,215,0,0.35)] transition-all"
          >
            See advertising options
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Per-product numbers */}
        {!hasProducts ? (
          <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-10 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-[#A0A0A0]" />
            <h2 className="text-xl font-bold mb-2">No products yet</h2>
            <p className="text-[#A0A0A0] text-sm mb-5">Add products and your weekly views will show up here.</p>
            <Link
              href="/product/new"
              style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm no-underline"
            >
              <PlusCircle className="w-4 h-4" />
              Add a product
            </Link>
          </section>
        ) : (
          <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
            <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <h2 className="text-lg md:text-xl font-bold">Views per product</h2>
              <span className="text-xs text-[#A0A0A0]">{plural(entry.products.length, 'product')}</span>
            </div>
            {entry.products.length === 0 ? (
              <p className="px-6 py-8 text-sm text-[#A0A0A0]">No products in this report.</p>
            ) : (
              <ol>
                {entry.products.map((p, i) => (
                  <li
                    key={p.id || `${p.name}-${i}`}
                    className="flex items-center gap-3 md:gap-4 px-5 md:px-6 py-4 border-t border-[rgba(255,255,255,0.05)] first:border-t-0"
                  >
                    <span className="w-6 text-right text-sm text-[#A0A0A0] tabular-nums flex-shrink-0">{i + 1}</span>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex-shrink-0">
                      {p.image ? (
                        <ProductThumbImg src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="w-5 h-5 m-auto mt-3.5 md:mt-4 text-[#64748b]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {p.id ? (
                          <Link
                            href={`/product/${p.id}`}
                            className="text-white font-semibold text-sm md:text-base truncate hover:text-[#FFD700] no-underline"
                            style={{ color: '#ffffff' }}
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-white font-semibold text-sm md:text-base truncate">{p.name}</span>
                        )}
                        {p.status && p.status !== 'active' && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[#A0A0A0] flex-shrink-0">
                            Not listed
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931]"
                          style={{ width: `${(p.weekly / maxWeekly) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 w-24 md:w-32">
                      <p className="text-xl md:text-2xl font-extrabold text-[#FFD700] tabular-nums leading-tight">
                        {formatCount(p.weekly)}
                      </p>
                      <p className="text-[11px] md:text-xs text-[#A0A0A0] tabular-nums">{formatCount(p.allTime)} all time</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#A0A0A0] mb-3">
        <Icon className="w-4 h-4" />
        {label}
      </p>
      <p className="text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums leading-none">{value}</p>
    </div>
  );
}

function PageSpinner({ label }) {
  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
        <p className="text-[#A0A0A0] text-sm">{label}</p>
      </div>
    </main>
  );
}
