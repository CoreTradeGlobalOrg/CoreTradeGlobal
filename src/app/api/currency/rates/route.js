/**
 * Currency Rates Proxy — /api/currency/rates
 *
 * Proxies requests to the Frankfurter API server-side to avoid CORS issues.
 * Frankfurter's public API does not set Access-Control-Allow-Origin headers,
 * so direct browser fetches are blocked.
 *
 * GET /api/currency/rates
 * Returns: array of {date, base, quote, rate} from Frankfurter v2
 *
 * Frankfurter (ECB) publishes once per working day, so the success response
 * is cached on Vercel's CDN for 1h and served stale for up to 24h while it
 * revalidates in the background — most requests never invoke the function.
 */

import { NextResponse } from 'next/server';

const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
const NO_STORE = 'no-store';

const FRANKFURTER_URL =
  'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,TRY,JPY,CHF,CNY,INR,MXN,SGD,AUD,CAD,BRL,NZD,PLN,SEK,AED,SAR';

export async function GET() {
  try {
    const upstream = await fetch(FRANKFURTER_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }, // Next data cache for the upstream call (not the CDN)
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${upstream.status}` },
        { status: upstream.status, headers: { 'Cache-Control': NO_STORE } }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': SUCCESS_CACHE_CONTROL },
    });
  } catch (err) {
    console.error('[/api/currency/rates] Upstream fetch failed:', err?.message);
    return NextResponse.json(
      { error: 'Failed to reach currency rate service.' },
      { status: 502, headers: { 'Cache-Control': NO_STORE } }
    );
  }
}
