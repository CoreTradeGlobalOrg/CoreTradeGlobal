'use client';

/**
 * useFreightEstimate — On-demand Freightos shipping estimate hook
 *
 * Calls the Freightos public shipping calculator API on user demand (NOT on
 * page load). The hook attempts a direct client-side fetch first to preserve
 * per-user IP rate limits (100 req/hr per IP on the public API).
 *
 * CORS fallback: If the direct fetch throws a TypeError (CORS blocked), the
 * hook automatically retries through /api/freight/estimate (a Next.js proxy).
 *
 * INTEL-04 tradeoff: proxy fallback means requests count against server IP
 * rate limit (100/hr) instead of per-user IP. Client-side direct calls preferred.
 *
 * Usage:
 *   const { estimate, loading, error, rateLimited, fetchEstimate, reset } = useFreightEstimate();
 *   // Call fetchEstimate({ origin, destination, weight, loadtype, width, height, length }) on button click
 */

import { useState, useCallback } from 'react';
import {
  FREIGHTOS_BASE_URL,
  FREIGHTOS_PROXY_URL,
} from '@/core/constants/freightConstants';

// ── Response parser ────────────────────────────────────────────────────────────

/**
 * Normalises the Freightos API response into a standard quotes array.
 * Defensive parsing with optional chaining throughout (Pitfall 5).
 *
 * @param {Object} data - Raw JSON response from Freightos API
 * @returns {{ quotes: Array<{ mode, minPrice, maxPrice, currency, transitDays }> }}
 */
function parseFreightosResponse(data) {
  // Freightos response shape: { response: { estimatedFreightRates: { mode: [...] or {}, numQuotes } } }
  // Each mode: { mode, price: { min: { moneyAmount: { amount, currency } }, max: {...} }, transitTimes: { min, max, unit } }
  const freightRates = data?.response?.estimatedFreightRates;
  if (!freightRates) return { quotes: [] };

  // mode can be a single object or an array
  const rawModes = freightRates.mode
    ? (Array.isArray(freightRates.mode) ? freightRates.mode : [freightRates.mode])
    : [];

  if (rawModes.length === 0) return { quotes: [] };

  const quotes = rawModes.map((entry) => {
    const minPrice = entry?.price?.min?.moneyAmount?.amount ?? null;
    const maxPrice = entry?.price?.max?.moneyAmount?.amount ?? minPrice;
    const currency = entry?.price?.min?.moneyAmount?.currency ?? 'USD';
    const transitMin = entry?.transitTimes?.min ?? null;
    const transitMax = entry?.transitTimes?.max ?? null;

    return {
      mode: entry?.mode ?? 'unknown',
      minPrice,
      maxPrice,
      currency,
      transitDays: transitMax ?? transitMin,
      transitMin,
      transitMax,
    };
  }).filter((q) => q.minPrice !== null);

  return { quotes };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   estimate: { quotes: Array } | null,
 *   loading: boolean,
 *   error: string | null,
 *   rateLimited: boolean,
 *   fetchEstimate: (params: object) => Promise<void>,
 *   reset: () => void,
 * }}
 */
export function useFreightEstimate() {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);

  /**
   * Reset all state (useful when form fields change after a result is shown).
   */
  const reset = useCallback(() => {
    setEstimate(null);
    setError(null);
    setRateLimited(false);
  }, []);

  /**
   * Fetch a freight estimate from Freightos.
   *
   * @param {Object} params
   * @param {string} params.origin - UN/LOCODE or city name for shipment origin
   * @param {string} params.destination - UN/LOCODE or city name for shipment destination
   * @param {number} params.weight - Chargeable weight in kilograms
   * @param {string} params.loadtype - One of FREIGHTOS_LOADTYPES values
   * @param {number|null} [params.width] - Package width in cm (optional)
   * @param {number|null} [params.height] - Package height in cm (optional)
   * @param {number|null} [params.length] - Package length in cm (optional)
   */
  const fetchEstimate = useCallback(async ({ origin, destination, weight, loadtype, width, height, length }) => {
    setLoading(true);
    setError(null);
    setRateLimited(false);
    setEstimate(null);

    // Build query parameters — same set for both direct and proxy calls
    // Freightos requires width/length/height/quantity even for pallets/boxes
    const dimWidth = width != null && width > 0 ? width : 50;
    const dimHeight = height != null && height > 0 ? height : 50;
    const dimLength = length != null && length > 0 ? length : 50;

    const params = new URLSearchParams({
      origin,
      destination,
      weight: String(weight),
      loadtype,
      width: String(dimWidth),
      height: String(dimHeight),
      length: String(dimLength),
      quantity: '1',
      format: 'json',
    });

    let data = null;
    let usedProxy = false;

    // ── Attempt 1: Direct client-side fetch ─────────────────────────────────
    try {
      const response = await fetch(`${FREIGHTOS_BASE_URL}?${params.toString()}`);

      if (response.status === 429) {
        setRateLimited(true);
        setLoading(false);
        setError('Estimate limit reached. Try again in a few minutes.');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      data = await response.json();
    } catch (directErr) {
      // TypeError = network/CORS error — fall through to proxy
      // Other errors (HTTP failures etc.) may also benefit from proxy retry
      const isCorsOrNetwork =
        directErr instanceof TypeError ||
        directErr?.message?.toLowerCase().includes('cors') ||
        directErr?.message?.toLowerCase().includes('network') ||
        directErr?.message?.toLowerCase().includes('failed to fetch');

      if (isCorsOrNetwork) {
        // ── Attempt 2: Server-side proxy fallback ──────────────────────────
        // INTEL-04 tradeoff: proxy fallback means requests count against server IP
        // rate limit (100/hr) instead of per-user IP. Client-side direct calls preferred.
        console.warn(
          '[useFreightEstimate] Direct Freightos fetch blocked (CORS/network). ' +
          'Falling back to /api/freight/estimate proxy. ' +
          'INTEL-04: This request now counts against the shared server IP rate limit (100 req/hr).'
        );

        usedProxy = true;

        try {
          const proxyResponse = await fetch(`${FREIGHTOS_PROXY_URL}?${params.toString()}`);

          if (proxyResponse.status === 429) {
            setRateLimited(true);
            setLoading(false);
            setError('Estimate limit reached. Try again in a few minutes.');
            return;
          }

          if (!proxyResponse.ok) {
            throw new Error(`Proxy HTTP ${proxyResponse.status}`);
          }

          data = await proxyResponse.json();
        } catch (proxyErr) {
          setError('Unable to fetch freight estimates. Please check your connection and try again.');
          setLoading(false);
          return;
        }
      } else {
        // Non-CORS error — no point retrying through proxy
        setError('Unable to fetch freight estimates. Please check your connection and try again.');
        setLoading(false);
        return;
      }
    }

    // ── Parse response ───────────────────────────────────────────────────────
    const parsed = parseFreightosResponse(data);

    if (parsed.quotes.length === 0) {
      setError('No freight estimates available for this route.');
      setLoading(false);
      return;
    }

    setEstimate({ quotes: parsed.quotes, _usedProxy: usedProxy });
    setLoading(false);
  }, []);

  return { estimate, loading, error, rateLimited, fetchEstimate, reset };
}
