/**
 * /api/analytics/hubspot — HubSpot CRM read-only aggregator.
 *
 * The Private App access token is server-only; it never leaves this
 * route. Client calls this endpoint, gets a plain JSON summary, and
 * renders it in the HubSpot section. Data is fetched fresh per call
 * for now — Bölüm 13 (sync-to-Firestore via cron) is a follow-up
 * that eliminates the per-request HubSpot round-trip.
 *
 * Auth: admin session cookie (via middleware) is expected upstream;
 * this handler itself just checks the token is present.
 */

import { NextResponse } from 'next/server';

const HUBSPOT_API = 'https://api.hubapi.com';

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
    // Never cache API responses at the fetch layer — the panel
    // has its own refresh button and CDN caching a token-scoped
    // response is a leaky idea.
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HubSpot ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Count objects with a filter — cheaper than paginating everything
 * when we just need a number.
 */
async function countWithFilter(objectType, filterGroups = []) {
  const body = {
    filterGroups,
    limit: 1,
    properties: ['hs_object_id'],
  };
  const data = await hs(`/crm/v3/objects/${objectType}/search`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.total ?? 0;
}

export async function GET() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'HUBSPOT_ACCESS_TOKEN missing', ok: false },
      { status: 500 },
    );
  }

  try {
    const now = Date.now();
    const startOfLast7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfLast30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // --- Parallel counts ---
    const [
      contactsTotal,
      contactsLast7,
      contactsLast30,
      companiesTotal,
      dealsTotal,
      dealsOpen,
      dealsClosedWon,
      dealsClosedLost,
      // Recent contacts + deals for the timeline tables.
      recentContactsRes,
      recentDealsRes,
      lifecycleBucketsRes,
    ] = await Promise.all([
      countWithFilter('contacts'),
      countWithFilter('contacts', [
        { filters: [{ propertyName: 'createdate', operator: 'GTE', value: startOfLast7 }] },
      ]),
      countWithFilter('contacts', [
        { filters: [{ propertyName: 'createdate', operator: 'GTE', value: startOfLast30 }] },
      ]),
      countWithFilter('companies'),
      countWithFilter('deals'),
      countWithFilter('deals', [
        { filters: [{ propertyName: 'dealstage', operator: 'NOT_IN', values: ['closedwon', 'closedlost'] }] },
      ]),
      countWithFilter('deals', [
        { filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' }] },
      ]),
      countWithFilter('deals', [
        { filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedlost' }] },
      ]),
      // Recent — order by createdate desc.
      hs('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
          properties: ['firstname', 'lastname', 'email', 'lifecyclestage', 'createdate', 'company', 'jobtitle'],
          limit: 10,
        }),
      }),
      hs('/crm/v3/objects/deals/search', {
        method: 'POST',
        body: JSON.stringify({
          sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
          properties: ['dealname', 'amount', 'dealstage', 'pipeline', 'createdate', 'closedate'],
          limit: 10,
        }),
      }),
      // Lifecycle distribution — batch a couple of the common stages.
      Promise.all([
        'subscriber',
        'lead',
        'marketingqualifiedlead',
        'salesqualifiedlead',
        'opportunity',
        'customer',
        'evangelist',
        'other',
      ].map(async (stage) => ({
        stage,
        count: await countWithFilter('contacts', [
          { filters: [{ propertyName: 'lifecyclestage', operator: 'EQ', value: stage }] },
        ]),
      }))),
    ]);

    const recentContacts = (recentContactsRes.results || []).map((c) => ({
      id: c.id,
      firstName: c.properties.firstname || '',
      lastName: c.properties.lastname || '',
      email: c.properties.email || '',
      company: c.properties.company || '',
      lifecycleStage: c.properties.lifecyclestage || '',
      createdAt: c.properties.createdate || null,
      jobTitle: c.properties.jobtitle || '',
    }));

    const recentDeals = (recentDealsRes.results || []).map((d) => ({
      id: d.id,
      name: d.properties.dealname || '',
      amount: d.properties.amount ? Number(d.properties.amount) : null,
      stage: d.properties.dealstage || '',
      pipeline: d.properties.pipeline || '',
      createdAt: d.properties.createdate || null,
      closeDate: d.properties.closedate || null,
    }));

    return NextResponse.json({
      ok: true,
      snapshotAt: new Date().toISOString(),
      contacts: {
        total: contactsTotal,
        newLast7: contactsLast7,
        newLast30: contactsLast30,
      },
      companies: { total: companiesTotal },
      deals: {
        total: dealsTotal,
        open: dealsOpen,
        won: dealsClosedWon,
        lost: dealsClosedLost,
      },
      lifecycleDistribution: lifecycleBucketsRes.filter((b) => b.count > 0),
      recentContacts,
      recentDeals,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || 'HubSpot request failed' },
      { status: 502 },
    );
  }
}
