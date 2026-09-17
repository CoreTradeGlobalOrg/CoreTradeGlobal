/**
 * Currency Constants for Phase 8 Live Intelligence
 *
 * These constants power the homepage ticker and deal sidebar
 * currency conversion panel. Do NOT modify currencies.js —
 * that file is for product form currency dropdowns only.
 *
 * Note on AED and SAR: These Gulf currencies are not tracked by the ECB.
 * Frankfurter v2 may not return rates for them. The hook handles missing
 * keys gracefully — pairs for these currencies are simply omitted from the
 * ticker if rates are unavailable.
 */

export const TICKER_CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'TRY', flag: '🇹🇷', name: 'Turkish Lira' },
  { code: 'CNY', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
];

/**
 * Conventional market quote pairs shown in the marquee.
 * Includes both directions for major pairs (e.g. EUR/USD and USD/EUR).
 * Each pair uses standard forex market quoting conventions.
 *
 * The hook uses EUR as the common base from Frankfurter, then computes
 * cross-rates: if base is EUR, use rates[quote] directly;
 * otherwise rate = rates[quote] / rates[base].
 */
export const TICKER_PAIRS = [
  { base: 'EUR', quote: 'USD', label: 'EUR/USD' },
  { base: 'GBP', quote: 'USD', label: 'GBP/USD' },
  { base: 'USD', quote: 'JPY', label: 'USD/JPY' },
  { base: 'EUR', quote: 'GBP', label: 'EUR/GBP' },
  { base: 'USD', quote: 'CHF', label: 'USD/CHF' },
  { base: 'USD', quote: 'CNY', label: 'USD/CNY' },
  { base: 'EUR', quote: 'CNY', label: 'EUR/CNY' },
  { base: 'USD', quote: 'INR', label: 'USD/INR' },
  { base: 'USD', quote: 'VND', label: 'USD/VND' },
  { base: 'USD', quote: 'MXN', label: 'USD/MXN' },
  { base: 'USD', quote: 'AED', label: 'USD/AED' },
  { base: 'EUR', quote: 'AED', label: 'EUR/AED' },
  { base: 'USD', quote: 'SGD', label: 'USD/SGD' },
  { base: 'USD', quote: 'SAR', label: 'USD/SAR' },
  { base: 'AUD', quote: 'USD', label: 'AUD/USD' },
  { base: 'USD', quote: 'CAD', label: 'USD/CAD' },
  { base: 'USD', quote: 'BRL', label: 'USD/BRL' },
  { base: 'NZD', quote: 'USD', label: 'NZD/USD' },
  { base: 'EUR', quote: 'CHF', label: 'EUR/CHF' },
  { base: 'EUR', quote: 'PLN', label: 'EUR/PLN' },
  { base: 'EUR', quote: 'SEK', label: 'EUR/SEK' },
];

/** Frankfurter v2 base URL — use v2 to avoid redirect latency from old .app domain */
export const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v2';

/** localStorage key for caching live rates */
export const CURRENCY_CACHE_KEY = 'ctg_live_rates_v1';

/** 24-hour cache TTL in milliseconds */
export const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000;

/** Polling interval: 1 hour */
export const POLL_INTERVAL = 60 * 60 * 1000;

/**
 * localStorage keys for persisting user-selected target currencies in the deal sidebar
 * conversion panel (Plan 02). Keys stored here so Plan 02 can import them without
 * defining duplicate constants.
 */
export const TARGET_CURRENCY_KEYS = {
  target1: 'ctg_currency_target_1',
  target2: 'ctg_currency_target_2',
};
