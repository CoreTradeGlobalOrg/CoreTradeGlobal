/**
 * /api/analytics/partners — live health check across the external
 * services CTG depends on. No StatusPage.io subscription; each
 * probe hits a lightweight endpoint on the target service so we
 * confirm both connectivity and auth.
 *
 * Cached for 60s so a burst of panel opens doesn't hammer everyone
 * we depend on — the panel has a manual "Refresh" button that
 * bypasses via ?refresh=1.
 */

import { NextResponse } from 'next/server';

const CACHE_TTL_MS = 60 * 1000;
const PROBE_TIMEOUT_MS = 8000;

let cached = null;
let cachedAt = 0;
let inFlight = null;

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
}

async function measure(fn) {
  const start = Date.now();
  try {
    const result = await fn();
    return { latencyMs: Date.now() - start, ...result };
  } catch (err) {
    return {
      latencyMs: Date.now() - start,
      status: 'down',
      note: err.message || 'unknown error',
    };
  }
}

async function probeHubSpot() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return { status: 'not_configured', note: 'HUBSPOT_ACCESS_TOKEN not set' };
  }
  const res = await withTimeout(
    fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }),
    PROBE_TIMEOUT_MS,
    'HubSpot',
  );
  if (res.status === 401) return { status: 'auth_failed', note: 'Token rejected' };
  if (res.status === 429) return { status: 'rate_limited', note: 'HubSpot 429 — still up' };
  if (!res.ok) return { status: 'degraded', note: `HTTP ${res.status}` };
  return { status: 'ok', note: 'CRM API reachable' };
}

async function probeFirebase() {
  // Firestore over REST — cheap, unauth read of a public discovery path.
  // If the project id isn't reachable this fails; otherwise we get a
  // JSON envelope back even for an empty collection.
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return { status: 'not_configured', note: 'Project ID env missing' };
  const res = await withTimeout(
    fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/health-probe?pageSize=1`,
      { cache: 'no-store' },
    ),
    PROBE_TIMEOUT_MS,
    'Firebase',
  );
  // 403 is fine — it means the API is reachable and the project exists,
  // rules just declined the anon call. That still confirms the service
  // is up.
  if (res.status === 403 || res.status === 401 || res.ok) {
    return { status: 'ok', note: `Firestore reachable (project: ${projectId})` };
  }
  if (res.status >= 500) return { status: 'degraded', note: `HTTP ${res.status}` };
  return { status: 'degraded', note: `HTTP ${res.status}` };
}

async function probeVercel() {
  // Vercel's status API — public, no auth. If this endpoint responds
  // we know both DNS and Vercel's edge are healthy.
  const res = await withTimeout(
    fetch('https://www.vercel-status.com/api/v2/status.json', { cache: 'no-store' }),
    PROBE_TIMEOUT_MS,
    'Vercel',
  );
  if (!res.ok) return { status: 'degraded', note: `HTTP ${res.status}` };
  const body = await res.json();
  const indicator = body?.status?.indicator || 'unknown';
  if (indicator === 'none') return { status: 'ok', note: body.status.description || 'All systems normal' };
  if (indicator === 'minor') return { status: 'degraded', note: body.status.description };
  return { status: 'down', note: body.status.description || `Status: ${indicator}` };
}

async function probeResend() {
  // Resend doesn't have a public status page endpoint, but a token
  // ping tells us both auth + connectivity. GET /domains needs a
  // valid API key so this is a two-in-one check.
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: 'not_configured', note: 'RESEND_API_KEY not set (functions env)' };
  const res = await withTimeout(
    fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    }),
    PROBE_TIMEOUT_MS,
    'Resend',
  );
  if (res.status === 401) return { status: 'auth_failed', note: 'API key rejected' };
  if (!res.ok) return { status: 'degraded', note: `HTTP ${res.status}` };
  return { status: 'ok', note: 'API reachable, auth valid' };
}

async function probeGoogleClarity() {
  // Both are edge-cached static assets served via CDN. Not the
  // deepest probe, but distinguishes "our tag couldn't load" from
  // "our tag isn't installed".
  const [ga, clarity] = await Promise.all([
    withTimeout(
      fetch('https://www.googletagmanager.com/gtag/js?id=diag', { cache: 'no-store' }),
      PROBE_TIMEOUT_MS,
      'GA',
    ).catch(() => null),
    withTimeout(
      fetch('https://www.clarity.ms/tag/diag', { cache: 'no-store' }),
      PROBE_TIMEOUT_MS,
      'Clarity',
    ).catch(() => null),
  ]);
  return { ga: !!(ga && ga.ok), clarity: !!(clarity && clarity.ok) };
}

async function collectPartners() {
  const [hubspot, firebase, vercel, resend, tagProbes] = await Promise.all([
    measure(probeHubSpot),
    measure(probeFirebase),
    measure(probeVercel),
    measure(probeResend),
    measure(probeGoogleClarity),
  ]);

  return {
    ok: true,
    snapshotAt: new Date().toISOString(),
    partners: [
      { key: 'firebase', label: 'Firebase (Firestore + Storage + Auth)', ...firebase },
      { key: 'vercel', label: 'Vercel Platform', ...vercel },
      { key: 'hubspot', label: 'HubSpot CRM', ...hubspot },
      { key: 'resend', label: 'Resend (transactional email)', ...resend },
      {
        key: 'ga_clarity',
        label: 'Analytics tag CDN (GA + Clarity)',
        status: tagProbes.ga && tagProbes.clarity
          ? 'ok'
          : tagProbes.ga || tagProbes.clarity
            ? 'degraded'
            : 'down',
        note: `GA ${tagProbes.ga ? '✓' : '✗'} · Clarity ${tagProbes.clarity ? '✓' : '✗'}`,
        latencyMs: tagProbes.latencyMs,
      },
    ],
    env: {
      vercelEnv: process.env.VERCEL_ENV || 'development',
      vercelRegion: process.env.VERCEL_REGION || null,
      commitSha: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      deployedAt: process.env.VERCEL_DEPLOY_CREATED_AT || null,
    },
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const bypass = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  if (!bypass && cached && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached, cached: true, cachedAgeMs: now - cachedAt });
  }
  if (!bypass && inFlight) {
    const payload = await inFlight;
    return NextResponse.json({ ...payload, cached: true, coalesced: true });
  }

  inFlight = collectPartners()
    .then((payload) => {
      cached = payload;
      cachedAt = Date.now();
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });

  const payload = await inFlight;
  return NextResponse.json(payload);
}
