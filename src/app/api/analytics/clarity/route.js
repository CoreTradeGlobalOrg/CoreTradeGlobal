/**
 * /api/analytics/clarity — Microsoft Clarity Data Export.
 *
 * Server-only. Uses the CLARITY_API_TOKEN Private App JWT which
 * exposes the project-live-insights endpoint. Data window is
 * exactly 3 days (Clarity's API cap).
 *
 * DAILY QUOTA: 10 API calls per project per day. This is the
 * hardest constraint on the whole panel — burn it in the first
 * hour with impatient refreshes and there's no data for the
 * rest of the day.
 *
 * Cache strategy:
 *   - 3-hour module cache (24h / 10 calls ≈ 2.4h floor)
 *   - Refresh is allowed but throttled by a 15-minute local
 *     minimum so a rage-click on the button doesn't burn budget
 *   - Once daily quota is exhausted upstream, we surface the
 *     stale cache with a "rate limited — try again after
 *     midnight UTC" flag instead of an error
 */

import { NextResponse } from 'next/server';

const CLARITY_API = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;       // 3 hours
const MIN_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 min minimum between manual refreshes

let cached = null;
let cachedAt = 0;
let lastRefreshAt = 0;
let inFlight = null;
let dailyExhausted = false;
let dailyExhaustedAt = 0;

function isConfigured() {
  return !!process.env.CLARITY_API_TOKEN;
}

/**
 * Massage Clarity's array-of-metric-objects response into a flat,
 * predictable shape the client can render without conditionals
 * per metric.
 */
function shape(raw) {
  const byName = new Map();
  for (const m of raw || []) {
    byName.set(m.metricName, m.information || []);
  }

  const single = (name, key) => Number(byName.get(name)?.[0]?.[key] ?? 0);
  const info = (name) => byName.get(name) || [];

  const traffic = info('Traffic')[0] || {};
  const engagement = info('EngagementTime')[0] || {};
  const scrollDepth = info('ScrollDepth')[0] || {};

  return {
    sessions: Number(traffic.totalSessionCount || 0),
    botSessions: Number(traffic.totalBotSessionCount || 0),
    distinctUsers: Number(traffic.distinctUserCount || 0),
    pagesPerSession: Number(traffic.pagesPerSessionPercentage || 0),
    totalEngagementSeconds: Number(engagement.totalTime || 0),
    activeEngagementSeconds: Number(engagement.activeTime || 0),
    avgScrollDepth: Number(scrollDepth.averageScrollDepth || 0),
    deadClick: {
      pct: single('DeadClickCount', 'sessionsWithMetricPercentage'),
      sessions: single('DeadClickCount', 'sessionsCount'),
      total: single('DeadClickCount', 'subTotal'),
    },
    rageClick: {
      pct: single('RageClickCount', 'sessionsWithMetricPercentage'),
      sessions: single('RageClickCount', 'sessionsCount'),
      total: single('RageClickCount', 'subTotal'),
    },
    quickback: {
      pct: single('QuickbackClick', 'sessionsWithMetricPercentage'),
      sessions: single('QuickbackClick', 'sessionsCount'),
      total: single('QuickbackClick', 'subTotal'),
    },
    excessiveScroll: {
      pct: single('ExcessiveScroll', 'sessionsWithMetricPercentage'),
      sessions: single('ExcessiveScroll', 'sessionsCount'),
      total: single('ExcessiveScroll', 'subTotal'),
    },
    errorClick: {
      sessions: single('ErrorClickCount', 'sessionsCount'),
      total: single('ErrorClickCount', 'subTotal'),
    },
    scriptError: {
      sessions: single('ScriptErrorCount', 'sessionsCount'),
      total: single('ScriptErrorCount', 'subTotal'),
    },
    browsers: (info('Browser') || []).map((b) => ({
      name: b.name,
      sessions: Number(b.sessionsCount || 0),
    })),
    devices: (info('Device') || []).map((d) => ({
      name: d.name,
      sessions: Number(d.sessionsCount || 0),
    })),
    operatingSystems: (info('OS') || []).map((o) => ({
      name: o.name,
      sessions: Number(o.sessionsCount || 0),
    })),
    countries: (info('Country') || []).map((c) => ({
      name: c.name,
      sessions: Number(c.sessionsCount || 0),
    })),
    referrers: (info('ReferrerUrl') || []).map((r) => ({
      name: r.name,
      sessions: Number(r.sessionsCount || 0),
    })),
    urls: (info('Url') || []).map((u) => ({
      name: u.name,
      sessions: Number(u.sessionsCount || 0),
    })),
  };
}

async function fetchClarity() {
  const res = await fetch(`${CLARITY_API}?numOfDays=3`, {
    headers: { Authorization: `Bearer ${process.env.CLARITY_API_TOKEN}` },
    cache: 'no-store',
  });

  if (res.status === 429) {
    dailyExhausted = true;
    dailyExhaustedAt = Date.now();
    const body = await res.text().catch(() => '');
    const err = new Error(`Clarity 429 — daily quota exhausted: ${body.slice(0, 200)}`);
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Clarity ${res.status}: ${body.slice(0, 200)}`);
  }
  const raw = await res.json();
  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    window: { days: 3 },
    metrics: shape(raw),
  };
}

export async function GET(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'CLARITY_API_TOKEN missing on server' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const bypass = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  // 15-minute manual-refresh floor so a rage-click on the panel's
  // Refresh button doesn't torch the daily budget.
  if (bypass && lastRefreshAt && now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        throttled: true,
        note: `Refresh throttled — wait ${Math.ceil((MIN_REFRESH_INTERVAL_MS - (now - lastRefreshAt)) / 60000)} more minutes`,
      });
    }
  }

  // Daily-quota lock: if we hit 429 in the last 12 hours, serve
  // the last known payload instead of burning another call.
  if (dailyExhausted && now - dailyExhaustedAt < 12 * 60 * 60 * 1000 && cached) {
    return NextResponse.json({
      ...cached,
      cached: true,
      rateLimited: true,
      note: 'Daily 10-call quota exhausted upstream — showing last cached snapshot',
    });
  }

  if (!bypass && cached && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cached,
      cached: true,
      cachedAgeMs: now - cachedAt,
    });
  }

  if (inFlight) {
    try {
      const payload = await inFlight;
      return NextResponse.json({ ...payload, cached: true, coalesced: true });
    } catch (err) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
  }

  inFlight = fetchClarity()
    .then((payload) => {
      cached = payload;
      cachedAt = Date.now();
      lastRefreshAt = Date.now();
      dailyExhausted = false;
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    const payload = await inFlight;
    return NextResponse.json(payload);
  } catch (err) {
    // On 429, fall back to whatever we last had cached rather than
    // showing an angry red banner — the operator can wait.
    if (err.status === 429 && cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        rateLimited: true,
        note: 'Daily 10-call quota exhausted upstream — showing last cached snapshot',
      });
    }
    return NextResponse.json(
      { ok: false, error: err.message || 'Clarity request failed' },
      { status: 502 },
    );
  }
}
