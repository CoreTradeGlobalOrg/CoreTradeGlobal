/**
 * /api/analytics/hubspot — HubSpot CRM read-only aggregator.
 *
 * The Private App access token is server-only; it never leaves this
 * route. Client calls this endpoint, gets a plain JSON summary, and
 * renders it in the HubSpot section.
 *
 * Two constraints shape the implementation:
 *   1. HubSpot Search API has a 5 req/s rate limit on Free tier.
 *      We batch the ~19 discovery calls in chunks of 3 with tiny
 *      pauses so we stay under the SECONDLY policy.
 *   2. Panel opens are cheap on the client but HubSpot's quotas
 *      are not — cache the whole summary in module scope for 5
 *      minutes so a page refresh doesn't hit HubSpot again.
 *
 * Bölüm 13 (sync-to-Firestore via cron) is the follow-up that
 * eliminates the per-panel-open HubSpot round-trip entirely.
 */

import { NextResponse } from 'next/server';

const HUBSPOT_API = 'https://api.hubapi.com';
const CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const REQUEST_CONCURRENCY = 3;         // stay under the 5 req/s search-API limit
const REQUEST_STAGGER_MS = 350;        // gap between batches

// Module-scope cache. Route handlers on Vercel Fluid Compute share
// instances across concurrent invocations, so this is a real cache,
// not per-request. On cold start it resets — that's fine, still
// beats hitting HubSpot every panel open.
let cachedPayload = null;
let cachedAt = 0;
let inFlight = null;

async function hs(path, options = {}) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN missing');
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HubSpot ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function countWithFilter(objectType, filterGroups = []) {
  const data = await hs(`/crm/v3/objects/${objectType}/search`, {
    method: 'POST',
    body: JSON.stringify({ filterGroups, limit: 1, properties: ['hs_object_id'] }),
  });
  return data.total ?? 0;
}

/**
 * Run `tasks` (array of thunks returning promises) in batches of
 * REQUEST_CONCURRENCY with a short pause between batches. Keeps
 * us safely under HubSpot's 5 req/s search-endpoint quota while
 * still parallelising what we can.
 */
async function runChunked(tasks) {
  const results = [];
  for (let i = 0; i < tasks.length; i += REQUEST_CONCURRENCY) {
    const chunk = tasks.slice(i, i + REQUEST_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const settled = await Promise.all(chunk.map((fn) => fn()));
    results.push(...settled);
    if (i + REQUEST_CONCURRENCY < tasks.length) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, REQUEST_STAGGER_MS));
    }
  }
  return results;
}

async function loadHubspotSummary() {
  const now = Date.now();
  const startOfLast7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfLast30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const LIFECYCLE_STAGES = [
    'subscriber',
    'lead',
    'marketingqualifiedlead',
    'salesqualifiedlead',
    'opportunity',
    'customer',
    'evangelist',
    'other',
  ];

  const tasks = [
    // Count tasks — 8 of these
    () => countWithFilter('contacts').then((v) => ['contactsTotal', v]),
    () => countWithFilter('contacts', [
      { filters: [{ propertyName: 'createdate', operator: 'GTE', value: startOfLast7 }] },
    ]).then((v) => ['contactsLast7', v]),
    () => countWithFilter('contacts', [
      { filters: [{ propertyName: 'createdate', operator: 'GTE', value: startOfLast30 }] },
    ]).then((v) => ['contactsLast30', v]),
    () => countWithFilter('companies').then((v) => ['companiesTotal', v]),
    () => countWithFilter('deals').then((v) => ['dealsTotal', v]),
    () => countWithFilter('deals', [
      { filters: [{ propertyName: 'dealstage', operator: 'NOT_IN', values: ['closedwon', 'closedlost'] }] },
    ]).then((v) => ['dealsOpen', v]),
    () => countWithFilter('deals', [
      { filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' }] },
    ]).then((v) => ['dealsWon', v]),
    () => countWithFilter('deals', [
      { filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedlost' }] },
    ]).then((v) => ['dealsLost', v]),
    // Recent lists — 2 more
    () => hs('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify({
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        properties: ['firstname', 'lastname', 'email', 'lifecyclestage', 'createdate', 'company', 'jobtitle'],
        limit: 10,
      }),
    }).then((v) => ['recentContactsRes', v]),
    () => hs('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify({
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        properties: ['dealname', 'amount', 'dealstage', 'pipeline', 'createdate', 'closedate'],
        limit: 10,
      }),
    }).then((v) => ['recentDealsRes', v]),
    // Lifecycle counts — 8 more
    ...LIFECYCLE_STAGES.map((stage) => () =>
      countWithFilter('contacts', [
        { filters: [{ propertyName: 'lifecyclestage', operator: 'EQ', value: stage }] },
      ]).then((v) => [`lifecycle:${stage}`, v]),
    ),
  ];

  const settled = await runChunked(tasks);
  const map = Object.fromEntries(settled);

  const recentContacts = (map.recentContactsRes?.results || []).map((c) => ({
    id: c.id,
    firstName: c.properties.firstname || '',
    lastName: c.properties.lastname || '',
    email: c.properties.email || '',
    company: c.properties.company || '',
    lifecycleStage: c.properties.lifecyclestage || '',
    createdAt: c.properties.createdate || null,
    jobTitle: c.properties.jobtitle || '',
  }));

  const recentDeals = (map.recentDealsRes?.results || []).map((d) => ({
    id: d.id,
    name: d.properties.dealname || '',
    amount: d.properties.amount ? Number(d.properties.amount) : null,
    stage: d.properties.dealstage || '',
    pipeline: d.properties.pipeline || '',
    createdAt: d.properties.createdate || null,
    closeDate: d.properties.closedate || null,
  }));

  const lifecycleDistribution = LIFECYCLE_STAGES
    .map((stage) => ({ stage, count: map[`lifecycle:${stage}`] || 0 }))
    .filter((b) => b.count > 0);

  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    contacts: {
      total: map.contactsTotal || 0,
      newLast7: map.contactsLast7 || 0,
      newLast30: map.contactsLast30 || 0,
    },
    companies: { total: map.companiesTotal || 0 },
    deals: {
      total: map.dealsTotal || 0,
      open: map.dealsOpen || 0,
      won: map.dealsWon || 0,
      lost: map.dealsLost || 0,
    },
    lifecycleDistribution,
    recentContacts,
    recentDeals,
  };
}

export async function GET(request) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'HUBSPOT_ACCESS_TOKEN missing' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const bypass = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  // Cache hit — return the memoised payload untouched.
  if (!bypass && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedPayload,
      cached: true,
      cachedAgeMs: now - cachedAt,
    });
  }

  // Coalesce simultaneous cache misses — if a request is already in
  // flight, join it instead of firing a second full batch.
  if (!bypass && inFlight) {
    try {
      const payload = await inFlight;
      return NextResponse.json({ ...payload, cached: true, coalesced: true });
    } catch (err) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
  }

  inFlight = loadHubspotSummary()
    .then((payload) => {
      cachedPayload = payload;
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
    return NextResponse.json(
      { ok: false, error: err.message || 'HubSpot request failed' },
      { status: 502 },
    );
  }
}
