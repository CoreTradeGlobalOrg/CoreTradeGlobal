'use client';

/**
 * useLiveCurrency — Singleton polling hook for live exchange rates
 *
 * Module-level variables ensure a single fetch cycle regardless of how many
 * components call this hook simultaneously (e.g. CurrencyTicker on homepage
 * and CurrencyConvertPanel in DealSidebar both calling useLiveCurrency).
 *
 * Data flow:
 * 1. On first subscriber mount: load localStorage cache, then fetch fresh rates
 * 2. setInterval fires every 60s — skips if tab is hidden (Pitfall 3)
 * 3. All localStorage access is inside effects or guarded (Pitfall 4)
 * 4. On last subscriber unmount: clear interval
 *
 * Returns: { rates, previousRates, fetchedAt, isStale, cacheExpired, error, loading }
 */

import { useState, useEffect } from 'react';
import {
  FRANKFURTER_BASE_URL,
  CURRENCY_CACHE_KEY,
  CURRENCY_CACHE_TTL,
  POLL_INTERVAL,
} from '@/core/constants/currencyConstants';

// ── Module-level singleton state ──────────────────────────────────────────────
// Shared across all hook instances — prevents duplicate intervals and fetches.

/** @type {Object|null} Current rates keyed by currency code (all vs EUR base) */
let _rates = null;

/** @type {Object|null} Rates from the previous successful fetch (for arrow indicators) */
let _previousRates = null;

/** @type {number|null} Date.now() timestamp of last successful fetch */
let _fetchedAt = null;

/** @type {ReturnType<typeof setInterval>|null} */
let _intervalId = null;

/** @type {boolean} True while the first fetch is in flight */
let _loading = true;

/** @type {string|null} Error message from last failed fetch */
let _error = null;

/** @type {Set<Function>} Subscriber callbacks — each hook instance adds one */
const _subscribers = new Set();

// ── Cache helpers ─────────────────────────────────────────────────────────────

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rates || !parsed.fetchedAt) return null;
    return parsed; // May be expired — caller checks TTL
  } catch {
    return null;
  }
}

function saveToCache(rates, fetchedAt) {
  try {
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({ rates, fetchedAt }));
  } catch {
    // localStorage may be unavailable in private browsing — silently ignore
  }
}

// ── Notification helper ───────────────────────────────────────────────────────

function notifySubscribers() {
  const snapshot = {
    rates: _rates,
    previousRates: _previousRates,
    fetchedAt: _fetchedAt,
    loading: _loading,
    error: _error,
  };
  _subscribers.forEach((fn) => fn(snapshot));
}

// ── Fetch logic ───────────────────────────────────────────────────────────────

async function fetchAndNotify() {
  // Skip fetch on hidden tabs to avoid unnecessary API calls (Pitfall 3)
  if (typeof document !== 'undefined' && document.hidden) return;

  try {
    const response = await fetch(
      `${FRANKFURTER_BASE_URL}/rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY,AED,SAR`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    // data.rates: { USD: 1.08, GBP: 0.85, ... } — all vs EUR base
    // Also include EUR itself as 1 (base) for convenience in convertAmount
    const newRates = { EUR: 1, ...data.rates };

    _previousRates = _rates; // Save previous for arrow direction comparison
    _rates = newRates;
    _fetchedAt = Date.now();
    _loading = false;
    _error = null;

    // Persist to localStorage (guarded: only runs in browser, inside async fn)
    if (typeof window !== 'undefined') {
      saveToCache(_rates, _fetchedAt);
    }

    notifySubscribers();
  } catch (err) {
    // Fetch failed — try to serve from localStorage cache
    if (typeof window !== 'undefined') {
      const cached = loadFromCache();
      if (cached) {
        _rates = cached.rates;
        _fetchedAt = cached.fetchedAt;
        _loading = false;
        // Error is set so the ticker can show stale warning badge
        _error = 'Using cached rates';
      } else {
        _loading = false;
        _error = err.message || 'Failed to fetch rates';
      }
    } else {
      _loading = false;
      _error = err.message || 'Failed to fetch rates';
    }

    notifySubscribers();
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveCurrency() {
  const [state, setState] = useState({
    rates: _rates,
    previousRates: _previousRates,
    fetchedAt: _fetchedAt,
    loading: _loading,
    error: _error,
  });

  useEffect(() => {
    // Subscriber callback: updates local component state when module state changes
    const update = (snapshot) => setState(snapshot);
    _subscribers.add(update);

    // First subscriber: hydrate from cache immediately, then start polling
    if (_subscribers.size === 1) {
      // Hydrate from localStorage cache before first fetch completes (Pitfall 4)
      if (typeof window !== 'undefined') {
        const cached = loadFromCache();
        if (cached && _rates === null) {
          _rates = cached.rates;
          _fetchedAt = cached.fetchedAt;
          // Mark stale so UI can show "may be delayed" — fresh fetch will clear it
          _error = 'Using cached rates';
          _loading = false;
        }
      }

      // Trigger immediate fetch
      fetchAndNotify();

      // Start 60s polling interval
      _intervalId = setInterval(fetchAndNotify, POLL_INTERVAL);
    } else {
      // Late subscriber: push current module state to the new component immediately
      update({
        rates: _rates,
        previousRates: _previousRates,
        fetchedAt: _fetchedAt,
        loading: _loading,
        error: _error,
      });
    }

    return () => {
      _subscribers.delete(update);
      // Last subscriber: stop polling
      if (_subscribers.size === 0 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
    };
  }, []);

  // Derive computed flags from raw state
  const isStale =
    state.fetchedAt !== null &&
    state.error !== null &&
    state.error === 'Using cached rates';

  const cacheExpired =
    state.fetchedAt !== null &&
    Date.now() - state.fetchedAt > CURRENCY_CACHE_TTL;

  return {
    rates: state.rates,
    previousRates: state.previousRates,
    fetchedAt: state.fetchedAt,
    loading: state.loading,
    error: state.rates === null ? state.error : null, // Only expose error if no data at all
    isStale,
    cacheExpired,
  };
}

// ── Helper: convertAmount ─────────────────────────────────────────────────────

/**
 * Converts an amount between any two of the 8 supported currencies using
 * EUR as the intermediary base (since all rates are stored vs EUR).
 *
 * @param {number} amount - The source amount to convert
 * @param {string} fromCurrency - ISO 4217 code of source currency (e.g. 'USD')
 * @param {string} toCurrency - ISO 4217 code of target currency (e.g. 'GBP')
 * @param {Object|null} rates - Rates object from useLiveCurrency (keyed by code, vs EUR base)
 * @returns {number|null} Converted amount, or null if rates are unavailable
 */
export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (!rates || amount === null || amount === undefined) return null;
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency]; // fromCurrency per EUR
  const toRate = rates[toCurrency]; // toCurrency per EUR

  if (!fromRate || !toRate) return null;

  // Convert to EUR first, then to target currency
  // amount / fromRate = amount in EUR
  // * toRate = amount in toCurrency
  return (amount / fromRate) * toRate;
}
