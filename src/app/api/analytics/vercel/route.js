/**
 * /api/analytics/vercel — Vercel Web Analytics aggregator.
 *
 * Server-only. Uses VERCEL_ANALYTICS_TOKEN (Vercel API access
 * token) to hit the Web Analytics REST API. Free-tier friendly —
 * available on Hobby with the standard 50K events/month cap.
 *
 * Reporting window: last 7 days (Hobby's default reporting window
 * is 1 month, so 7 days is comfortably inside it).
 */

import { NextResponse } from 'next/server';

const API_BASE = 'https://api.vercel.com/v1/query/web-analytics';
const CACHE_TTL_MS = 30 * 60 * 1000;
const WINDOW_DAYS = 7;

let cached = null;
let cachedAt = 0;
let inFlight = null;

function isConfigured() {
  return !!(
    process.env.VERCEL_ANALYTICS_TOKEN &&
    process.env.VERCEL_PROJECT_ID
  );
}

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function buildParams(extra = {}) {
  const params = new URLSearchParams();
  if (process.env.VERCEL_TEAM_ID) params.set('teamId', process.env.VERCEL_TEAM_ID);
  params.set('projectId', process.env.VERCEL_PROJECT_ID);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  return params.toString();
}

async function query(endpoint, extra = {}) {
  const url = `${API_BASE}/${endpoint}?${buildParams(extra)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_ANALYTICS_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Vercel ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function loadVercelSummary() {
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - WINDOW_DAYS);
  const since = isoDay(startDate);
  const until = isoDay(endDate);

  // Parallel — six independent aggregate/count calls.
  const [totals, dailyTrend, topPages, sources, countries, devices] = await Promise.all([
    query('visits/count', { since, until }),
    query('visits/aggregate', { since, until, by: 'day' }),
    query('visits/aggregate', { since, until, by: 'requestPath', limit: '15' }),
    query('visits/aggregate', { since, until, by: 'referrerHostname', limit: '10' }),
    query('visits/aggregate', { since, until, by: 'country', limit: '15' }),
    query('visits/aggregate', { since, until, by: 'deviceType', limit: '5' }),
  ]);

  const totalsRow = totals.data || {};

  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    window: { since, until, days: WINDOW_DAYS },
    totals: {
      pageviews: Number(totalsRow.pageviews || 0),
      visitors: Number(totalsRow.visitors || 0),
    },
    dailyTrend: (dailyTrend.data || []).map((r) => ({
      date: (r.timestamp || '').slice(0, 10),
      pageviews: Number(r.pageviews || 0),
      visitors: Number(r.visitors || 0),
    })),
    topPages: (topPages.data || []).map((r) => ({
      path: r.requestPath || '(other)',
      pageviews: Number(r.pageviews || 0),
      visitors: Number(r.visitors || 0),
    })),
    sources: (sources.data || []).map((r) => ({
      referrer: r.referrerHostname || '(direct)',
      pageviews: Number(r.pageviews || 0),
      visitors: Number(r.visitors || 0),
    })),
    countries: (countries.data || []).map((r) => ({
      country: r.country || '(unknown)',
      pageviews: Number(r.pageviews || 0),
      visitors: Number(r.visitors || 0),
    })),
    devices: (devices.data || []).map((r) => ({
      device: r.deviceType || '(unknown)',
      pageviews: Number(r.pageviews || 0),
      visitors: Number(r.visitors || 0),
    })),
  };
}

export async function GET(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Vercel Analytics not configured — need VERCEL_ANALYTICS_TOKEN + VERCEL_PROJECT_ID (VERCEL_TEAM_ID for team projects)',
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const bypass = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  if (!bypass && cached && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached, cached: true, cachedAgeMs: now - cachedAt });
  }
  if (!bypass && inFlight) {
    try {
      const payload = await inFlight;
      return NextResponse.json({ ...payload, cached: true, coalesced: true });
    } catch (err) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
  }

  inFlight = loadVercelSummary()
    .then((payload) => {
      cached = payload;
      cachedAt = Date.now();
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    const payload = await inFlight;
    return NextResponse.json(payload);
  } catch (err) {
    const message = err?.message || '';
    if (/not_enabled|not enabled/i.test(message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Web Analytics is not enabled on this Vercel project. Open the project → Analytics tab → Enable Web Analytics.',
          detail: message,
        },
        { status: 403 },
      );
    }
    if (err.status === 403 || /forbidden|unauthorized|401/i.test(message)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vercel rejected the token. Confirm VERCEL_ANALYTICS_TOKEN has access to this project.',
          detail: message,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ok: false, error: message || 'Vercel Analytics request failed' },
      { status: 502 },
    );
  }
}
