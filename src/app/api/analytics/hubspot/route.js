/**
 * /api/analytics/hubspot — HubSpot CRM summary aggregator.
 *
 * See src/lib/analytics/hubspotServer.js for the shared client
 * (rate-limit retry, serial runner, upsert helpers). This route
 * only concerns itself with the discovery + summary shape rendered
 * by the HubSpot section.
 *
 * Caching:
 *   Module-scope memo, 5 minutes. Coalesces simultaneous cache
 *   misses so a page refresh burst doesn't kick off two batches.
 *   ?refresh=1 bypasses the cache.
 */

import { NextResponse } from 'next/server';
import { hs, runSerial } from '@/lib/analytics/hubspotServer';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPayload = null;
let cachedAt = 0;
let inFlight = null;

async function countWithFilter(objectType, filterGroups = []) {
  const data = await hs(`/crm/v3/objects/${objectType}/search`, {
    method: 'POST',
    body: JSON.stringify({ filterGroups, limit: 1, properties: ['hs_object_id'] }),
  });
  return data.total ?? 0;
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
    ...LIFECYCLE_STAGES.map((stage) => () =>
      countWithFilter('contacts', [
        { filters: [{ propertyName: 'lifecyclestage', operator: 'EQ', value: stage }] },
      ]).then((v) => [`lifecycle:${stage}`, v]),
    ),
  ];

  const settled = await runSerial(tasks);
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

  if (!bypass && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedPayload,
      cached: true,
      cachedAgeMs: now - cachedAt,
    });
  }

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
