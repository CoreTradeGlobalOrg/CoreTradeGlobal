/**
 * /api/analytics/ga4 — Google Analytics 4 aggregator.
 *
 * Server-only. Reuses the same service account credentials the
 * SEO route uses (GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY) — the
 * account is a Viewer on both Search Console and the GA4 property.
 *
 * 28-day window ending today. GA4 has no data lag worth
 * accommodating for our scale.
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const CACHE_TTL_MS = 30 * 60 * 1000;

let cached = null;
let cachedAt = 0;
let inFlight = null;

function isConfigured() {
  return !!(
    process.env.GSC_CLIENT_EMAIL &&
    process.env.GSC_PRIVATE_KEY &&
    process.env.GA4_PROPERTY_ID
  );
}

function getClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GSC_CLIENT_EMAIL,
      private_key: (process.env.GSC_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  return google.analyticsdata({ version: 'v1beta', auth });
}

async function runReport(client, property, body) {
  const res = await client.properties.runReport({ property, requestBody: body });
  return res.data || {};
}

function shapeRow(row) {
  const dims = row.dimensionValues || [];
  const metrics = (row.metricValues || []).map((m) => Number(m.value) || 0);
  return { dims: dims.map((d) => d.value), metrics };
}

async function loadGa4Summary() {
  const client = getClient();
  const property = `properties/${process.env.GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: '28daysAgo', endDate: 'today' }];

  const [totals, dailyTrend, topPages, sources, countries, devices] = await Promise.all([
    // Top-line totals
    runReport(client, property, {
      dateRanges,
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
      ],
    }),
    // Daily trend
    runReport(client, property, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 100,
    }),
    // Top landing pages
    runReport(client, property, {
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    }),
    // Traffic sources — session-scoped
    runReport(client, property, {
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
    // Country breakdown
    runReport(client, property, {
      dateRanges,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 15,
    }),
    // Device category
    runReport(client, property, {
      dateRanges,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 3,
    }),
  ]);

  const totalsRow = totals.rows?.[0]?.metricValues || [];
  const [au, sess, pv, br, avgSess, eng] = totalsRow.map((m) => Number(m.value) || 0);

  const dailyTrendArr = (dailyTrend.rows || []).map((r) => {
    const { dims, metrics } = shapeRow(r);
    // GA4 returns date as YYYYMMDD
    const raw = dims[0];
    const iso = raw ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : null;
    return { date: iso, activeUsers: metrics[0] || 0, sessions: metrics[1] || 0 };
  });

  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    window: { startDate: '28daysAgo', endDate: 'today', days: 28 },
    propertyId: process.env.GA4_PROPERTY_ID,
    totals: {
      activeUsers: au,
      sessions: sess,
      pageViews: pv,
      bounceRate: br,
      avgSessionSeconds: avgSess,
      engagementRate: eng,
    },
    dailyTrend: dailyTrendArr,
    topPages: (topPages.rows || []).map((r) => {
      const { dims, metrics } = shapeRow(r);
      return {
        path: dims[0] || '',
        pageViews: metrics[0] || 0,
        activeUsers: metrics[1] || 0,
        avgSessionSeconds: metrics[2] || 0,
      };
    }),
    sources: (sources.rows || []).map((r) => {
      const { dims, metrics } = shapeRow(r);
      return { channel: dims[0] || '(other)', sessions: metrics[0] || 0, activeUsers: metrics[1] || 0 };
    }),
    countries: (countries.rows || []).map((r) => {
      const { dims, metrics } = shapeRow(r);
      return { country: dims[0] || '(unknown)', activeUsers: metrics[0] || 0, sessions: metrics[1] || 0 };
    }),
    devices: (devices.rows || []).map((r) => {
      const { dims, metrics } = shapeRow(r);
      return { device: dims[0] || '(unknown)', activeUsers: metrics[0] || 0, sessions: metrics[1] || 0, bounceRate: metrics[2] || 0 };
    }),
  };
}

export async function GET(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'GA4 not configured — need GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, and GA4_PROPERTY_ID on the server',
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

  inFlight = loadGa4Summary()
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
    if (/permission|403|access/i.test(message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'GA4 rejected the request. Confirm the service account has Viewer access on the GA4 property (Admin → Property access management).',
          detail: message,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ok: false, error: message || 'GA4 request failed' },
      { status: 502 },
    );
  }
}
