/**
 * /api/analytics/seo — Google Search Console aggregator.
 *
 * Server-only. Uses the service account credentials in
 * GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY to talk to the Search Console
 * Data API. Never expose the key on the client.
 *
 * Search Console data lags 2-3 days — the default window ends
 * three days ago so we always get complete rows. Freshness is
 * inherent to GSC, not to us.
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const CACHE_TTL_MS = 30 * 60 * 1000; // GSC data updates once a day; 30 min cache is fine.
const DATA_LAG_DAYS = 3;
const WINDOW_DAYS = 28;

let cached = null;
let cachedAt = 0;
let inFlight = null;

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function isConfigured() {
  return !!(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
}

function getClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GSC_CLIENT_EMAIL,
      // Vercel env vars come in as-is; the private key uses literal
      // `\n` escapes when stored as a single-line env var, replace
      // them with real newlines so the JWT can be parsed.
      private_key: (process.env.GSC_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  return google.searchconsole({ version: 'v1', auth });
}

async function query(sc, siteUrl, body) {
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: body,
  });
  return res.data || {};
}

async function loadSeoSummary() {
  const sc = getClient();
  const siteUrl = process.env.GSC_PROPERTY_URL || 'sc-domain:coretradeglobal.com';

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - DATA_LAG_DAYS);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (WINDOW_DAYS - 1));

  const params = {
    startDate: isoDay(startDate),
    endDate: isoDay(endDate),
    dataState: 'final',
  };

  // Kick off five queries in parallel — they're independent.
  const [totalRow, byDate, topQueries, topPages, byCountry, byDevice] = await Promise.all([
    query(sc, siteUrl, { ...params, dimensions: [], rowLimit: 1 }),
    query(sc, siteUrl, { ...params, dimensions: ['date'], rowLimit: 100 }),
    query(sc, siteUrl, { ...params, dimensions: ['query'], rowLimit: 25 }),
    query(sc, siteUrl, { ...params, dimensions: ['page'], rowLimit: 25 }),
    query(sc, siteUrl, { ...params, dimensions: ['country'], rowLimit: 15 }),
    query(sc, siteUrl, { ...params, dimensions: ['device'], rowLimit: 3 }),
  ]);

  const total = totalRow.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const dailyTrend = (byDate.rows || []).map((r) => ({
    date: r.keys?.[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));

  const rowsToShape = (rows, key) =>
    (rows || []).map((r) => ({
      key: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    })).map((r) => (key ? { [key]: r.key, ...r } : r));

  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    window: {
      startDate: params.startDate,
      endDate: params.endDate,
      days: WINDOW_DAYS,
    },
    siteUrl,
    totals: {
      clicks: total.clicks || 0,
      impressions: total.impressions || 0,
      ctr: total.ctr || 0,
      position: total.position || 0,
    },
    dailyTrend,
    topQueries: rowsToShape(topQueries.rows, 'query'),
    topPages: rowsToShape(topPages.rows, 'page'),
    byCountry: rowsToShape(byCountry.rows, 'country'),
    byDevice: rowsToShape(byDevice.rows, 'device'),
  };
}

export async function GET(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY missing on server' },
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

  inFlight = loadSeoSummary()
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
    // Common failure: service account not yet granted access to
    // the GSC property. Return a friendly hint instead of a raw
    // 403 body dump.
    const message = err?.message || '';
    if (/permission|403/i.test(message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Search Console rejected the request. Ensure the service account email is added ' +
            'as a Restricted user on the property (Settings → Users and permissions).',
          detail: message,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ok: false, error: message || 'GSC request failed' },
      { status: 502 },
    );
  }
}
