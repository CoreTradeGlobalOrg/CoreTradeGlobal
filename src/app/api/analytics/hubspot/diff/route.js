/**
 * /api/analytics/hubspot/diff — HubSpot ↔ Platform reconciliation.
 *
 * Pulls every HubSpot contact (paginated, up to a soft cap) plus
 * every Firestore user, joins by lowercased email, and returns four
 * segments the operator can act on directly:
 *
 *   matched          — email present on both sides
 *   only_platform    — Firestore user with no HubSpot contact
 *   only_hubspot     — HubSpot contact with no Firestore user
 *   conflicting      — same email but different companyName /
 *                      firstName+lastName (possible identity drift)
 *
 * Read-only. Writing (create / update contact) lives at
 * /api/analytics/hubspot/sync.
 */

import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';
import { hs, sleep, CTG_PROPS } from '@/lib/analytics/hubspotServer';

// Soft cap so a runaway HubSpot portal doesn't hang the panel. At
// current scale (~150 members) this is generous. Bump when needed.
const HUBSPOT_HARD_LIMIT = 2000;

const CACHE_TTL_MS = 3 * 60 * 1000;
let cachedPayload = null;
let cachedAt = 0;
let inFlight = null;

async function fetchAllHubspotContacts() {
  const contacts = [];
  let after = null;
  const properties = [
    'email',
    'firstname',
    'lastname',
    'company',
    'lifecyclestage',
    'createdate',
    CTG_PROPS.ctgUserId,
  ];
  do {
    const params = new URLSearchParams({
      limit: '100',
      archived: 'false',
      properties: properties.join(','),
    });
    if (after) params.set('after', after);
    // Regular list endpoint — 10 req/s quota, not the 4 req/s search cap.
    // Still space out pages to be polite.
    // eslint-disable-next-line no-await-in-loop
    const data = await hs(`/crm/v3/objects/contacts?${params.toString()}`);
    contacts.push(...(data.results || []));
    after = data.paging?.next?.after || null;
    if (contacts.length >= HUBSPOT_HARD_LIMIT) break;
    if (after) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(150);
    }
  } while (after);
  return contacts;
}

function fingerprint(row) {
  return [
    (row.firstName || '').trim().toLowerCase(),
    (row.lastName || '').trim().toLowerCase(),
    (row.companyName || '').trim().toLowerCase(),
  ].join('|');
}

async function computeDiff() {
  const [contactsRaw, usersSnap] = await Promise.all([
    fetchAllHubspotContacts(),
    getDocs(collection(db, COLLECTIONS.USERS)),
  ]);

  // Normalise HubSpot contacts.
  const hubspotByEmail = new Map();
  for (const c of contactsRaw) {
    const email = (c.properties?.email || '').trim().toLowerCase();
    if (!email) continue;
    hubspotByEmail.set(email, {
      hubspotId: c.id,
      email,
      firstName: c.properties.firstname || '',
      lastName: c.properties.lastname || '',
      companyName: c.properties.company || '',
      lifecycleStage: c.properties.lifecyclestage || '',
      createdAt: c.properties.createdate || null,
      ctgUserId: c.properties[CTG_PROPS.ctgUserId] || '',
    });
  }

  // Normalise platform users.
  const platformByEmail = new Map();
  usersSnap.forEach((doc) => {
    const d = doc.data() || {};
    if (d.isSuspended) return;
    const email = (d.email || '').trim().toLowerCase();
    if (!email) return;
    platformByEmail.set(email, {
      uid: doc.id,
      email,
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      companyName: (d.companyName || '').trim(),
      displayName: d.fullName || d.displayName || '',
      country: d.country || '',
      role: d.role || 'member',
      emailVerified: !!d.emailVerified,
      adminApproved: !!d.adminApproved,
      createdAt: d.createdAt || null,
    });
  });

  const matched = [];
  const conflicting = [];
  const onlyPlatform = [];
  const onlyHubspot = [];

  for (const [email, user] of platformByEmail.entries()) {
    const contact = hubspotByEmail.get(email);
    if (!contact) {
      onlyPlatform.push(user);
      continue;
    }
    const usersFp = fingerprint(user);
    const contactFp = fingerprint(contact);
    if (usersFp !== contactFp) {
      conflicting.push({ user, contact });
    } else {
      matched.push({ user, contact });
    }
  }

  for (const [email, contact] of hubspotByEmail.entries()) {
    if (!platformByEmail.has(email)) onlyHubspot.push(contact);
  }

  // Sort largest-actionable first.
  onlyPlatform.sort((a, b) => a.email.localeCompare(b.email));
  onlyHubspot.sort((a, b) => a.email.localeCompare(b.email));

  const totalPlatform = platformByEmail.size;
  const totalHubspot = hubspotByEmail.size;
  const matchRatio = totalPlatform > 0
    ? Math.round((matched.length / totalPlatform) * 100)
    : 0;

  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    totals: {
      platform: totalPlatform,
      hubspot: totalHubspot,
      matched: matched.length,
      onlyPlatform: onlyPlatform.length,
      onlyHubspot: onlyHubspot.length,
      conflicting: conflicting.length,
      matchRatio,
    },
    matched,
    onlyPlatform,
    onlyHubspot,
    conflicting,
    truncatedHubspot: contactsRaw.length >= HUBSPOT_HARD_LIMIT,
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

  inFlight = computeDiff()
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
      { ok: false, error: err.message || 'Diff computation failed' },
      { status: 502 },
    );
  }
}
