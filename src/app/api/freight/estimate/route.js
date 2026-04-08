/**
 * Freight Estimate Proxy — /api/freight/estimate
 *
 * INTEL-04 deviation: This proxy exists only as CORS fallback. Ideally all
 * Freightos calls go directly from browser. When proxied, all requests share
 * the server's IP for rate limiting (100 req/hr), reducing per-user budget.
 *
 * The FreightEstimatorWidget (client-side) first attempts a direct fetch to
 * the Freightos public API. Only when a TypeError (CORS/network block) is
 * thrown does the hook retry through this route.
 *
 * GET /api/freight/estimate?origin=...&destination=...&weight=...&loadtype=...
 * Forwards all query params as-is to the Freightos shipping calculator.
 */

import { NextResponse } from 'next/server';

const FREIGHTOS_BASE_URL = 'https://ship.freightos.com/api/shippingCalculator';

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// Limits server-side proxy calls to avoid exhausting the shared IP allowance.
// In production, replace with Redis-backed limiter for multi-instance deployments.

const PROXY_RATE_LIMIT = 50; // requests per window per server process
const PROXY_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

let _proxyCallCount = 0;
let _proxyWindowStart = Date.now();

function checkProxyRateLimit() {
  const now = Date.now();
  // Reset window if expired
  if (now - _proxyWindowStart > PROXY_RATE_WINDOW_MS) {
    _proxyCallCount = 0;
    _proxyWindowStart = now;
  }
  if (_proxyCallCount >= PROXY_RATE_LIMIT) {
    return false; // Rate limited
  }
  _proxyCallCount++;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  // Apply proxy-level rate limit before forwarding
  if (!checkProxyRateLimit()) {
    return NextResponse.json(
      { error: 'Proxy rate limit reached. Estimate limit reached. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  // Forward all query params to Freightos unchanged
  const { searchParams } = new URL(request.url);
  const forwardUrl = `${FREIGHTOS_BASE_URL}?${searchParams.toString()}`;

  try {
    const upstream = await fetch(forwardUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (upstream.status === 429) {
      return NextResponse.json(
        { error: 'Upstream rate limit reached.' },
        { status: 429 }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/freight/estimate] Upstream fetch failed:', err?.message);
    return NextResponse.json(
      { error: 'Failed to reach freight estimation service.' },
      { status: 502 }
    );
  }
}
