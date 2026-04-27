/**
 * Currency Rates Proxy — /api/currency/rates
 *
 * Proxies requests to the Frankfurter API server-side to avoid CORS issues.
 * Frankfurter's public API does not set Access-Control-Allow-Origin headers,
 * so direct browser fetches are blocked.
 *
 * GET /api/currency/rates
 * Returns: array of {date, base, quote, rate} from Frankfurter v2
 */

import { NextResponse } from 'next/server';

const FRANKFURTER_URL =
  'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY,AED,SAR';

export async function GET() {
  try {
    const upstream = await fetch(FRANKFURTER_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 }, // Cache for 60s at the edge
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/currency/rates] Upstream fetch failed:', err?.message);
    return NextResponse.json(
      { error: 'Failed to reach currency rate service.' },
      { status: 502 }
    );
  }
}
