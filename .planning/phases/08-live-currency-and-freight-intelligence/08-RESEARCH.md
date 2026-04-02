# Phase 8: Live Currency and Freight Intelligence - Research

**Researched:** 2026-04-02
**Domain:** Client-side third-party API integration (Frankfurter currency API, Freightos freight estimation API), React polling hooks, CSS marquee animation, localStorage caching
**Confidence:** HIGH (Frankfurter), MEDIUM (Freightos CORS behavior), HIGH (project patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Currency Ticker (Homepage)**
- Auto-scrolling marquee bar positioned above the hero section, scrolls away with page content
- Dark background with gold #FFD700 accents for currency codes, white for rate values — matches platform theme
- 8 currencies: USD, EUR, GBP, TRY, CNY, JPY, AED, SAR
- Rates shown using conventional market quoting direction for each pair (both ways, e.g., EUR/USD 1.08 and USD/EUR 0.92)
- Arrow-only change indicators (▲/▼) — no percentage change shown
- "Updated Xs ago" relative timestamp appended at the end of the scrolling marquee
- Same marquee on mobile with smaller text — responsive, not hidden
- Homepage only — not on deal pages or other routes

**Deal Currency Conversion Panel**
- Positioned in DealSidebar, below the existing offer summary section
- Two dropdown selectors for target currencies — user picks from the same 8 currencies as the ticker
- Default target currencies: EUR and USD (before user customizes)
- Selection persisted to localStorage
- Shows both unit price and estimated total (price × quantity) converted to each target currency
- Auto-refreshes on the same 60s polling interval as the homepage ticker (shared useLiveCurrency hook)
- Appears on both negotiation pages and Trade Summary tab — wherever price/cost info is displayed

**Freight Estimator Widget**
- Positioned in DealSidebar, collapsible section expanded by default
- Origin/destination fields auto-populate from deal's Incoterms named places — user can override
- Weight field with unit auto-detected from deal product entity; falls back to kg for manual entry
- Optional dimensions field (L×W×H) for volumetric weight calculation — higher of actual/volumetric used
- Load type auto-detected from weight/volume — system suggests appropriate transport modes (sea FCL, sea LCL, air, road)
- Results displayed as stacked cards per transport mode, each showing min/max cost range and transit time estimate
- Freight costs shown in deal's base currency (converted from USD via live rates)
- User must click "Get Estimate" button — no auto-run on page load (preserves 100 req/hr per-IP rate limit)
- "Powered by Freightos" attribution link below results, opens freightos.com in new tab
- Available across all deal stages in the sidebar (not hidden after provider selection)

**Fallback and Degradation**
- Currency API failure: show last-known cached rates with a warning badge ("Rates from X hours ago"); cache stored in localStorage with 24-hour TTL
- Single warning style for both stale and unavailable states — no severity tiers
- Warning auto-dismisses silently on next successful 60s fetch — no toast or notification
- When cache expires (24h+ with no API recovery): show "Currency rates temporarily unavailable" message
- Freight API failure: show "Unable to fetch freight estimates" error message with retry button — no cached freight data
- Rate limit (429 response): show "Estimate limit reached. Try again in a few minutes." — only surfaced when actually hit
- Loading states use skeleton loaders (animate-pulse) matching existing DealSidebar patterns (PartyCard precedent)

### Claude's Discretion
- Exact marquee scroll speed and animation implementation
- Specific Frankfurter API endpoint structure and polling mechanism
- Freightos API integration details and response parsing
- Volumetric weight calculation formula and mode suggestion thresholds
- Skeleton loader specific shapes and sizes
- Exact dropdown styling and positioning within the sidebar
- How to handle edge cases (e.g., deal with no currency set, product with no weight info)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEL-01 | Homepage displays a live currency ticker (USD, EUR, GBP, TRY, CNY minimum) with auto-refresh and last-updated timestamp — no login required | Frankfurter API v2 confirmed: free, no auth, CORS-open, 60s polling viable. Marquee animation approach identified (CSS keyframes). |
| INTEL-02 | Deal negotiation page shows offer amounts in base currency plus two user-selected target currencies with live conversion | Shared `useLiveCurrency` hook with localStorage persistence. Reads `offer.price`, `offer.currency`, `offer.quantity` directly from existing Offer entity. |
| INTEL-03 | Deal page sidebar freight estimator accepts origin, destination, load type, weight and returns min/max range per transport mode via Freightos API with attribution link | Freightos `shippingCalculator` API documented: public (no API key), returns per-mode quotes with min/max, attribution link required by ToS. |
| INTEL-04 | Freight estimator runs client-side (browser-to-Freightos) — server never proxies Freightos calls, per-IP rate limits apply per user | CORS behavior of Freightos public API is LOW confidence (not explicitly documented). Contingency plan required — see Pitfall 2. |
| INTEL-05 | Both currency and freight widgets show graceful fallback states when external APIs are unavailable — deal flow is never blocked | localStorage cache with 24h TTL for currency. Error state + retry button for freight. Skeleton loaders per PartyCard pattern. |
</phase_requirements>

---

## Summary

Phase 8 adds three client-side intelligence widgets to the platform: a homepage currency ticker (Frankfurter API), a deal sidebar currency conversion panel (shared hook), and a deal sidebar freight cost estimator (Freightos API). All data flows browser-to-third-party — the Next.js server is never in the call chain for either API.

The Frankfurter API (api.frankfurter.dev/v2) is well-documented, free, requires no authentication, and has no rate limits. It publishes ECB daily rates for 160+ currencies. Polling every 60s is appropriate since rates update once per trading day; the hook must cache responses in localStorage with a 24h TTL to serve users if the API becomes unreachable.

The Freightos public `shippingCalculator` API (ship.freightos.com) requires no API key for public marketplace estimates, enforces a 100 req/hr per-IP rate limit, and mandates a "Powered by Freightos" attribution link. The critical uncertainty is whether it sends CORS headers permitting browser-originating fetch calls. The Freightos documentation describes client-side embed widgets (custom element + script, iframe) but does not explicitly confirm that `fetch()` from a third-party origin succeeds. The implementation plan must include a CORS verification step before betting on direct fetch — and include a Next.js API route fallback path if CORS is blocked.

**Primary recommendation:** Implement `useLiveCurrency` as a singleton-style hook (module-level cache prevents duplicate fetches on multiple renders), use CSS keyframes marquee (no new dependency needed), and front-load a CORS probe against the Freightos endpoint before building the client-direct integration.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Frankfurter API | v2 (api.frankfurter.dev/v2) | Live exchange rates | Free, no auth, no limits, ECB-sourced, CORS-open, open source |
| Freightos shippingCalculator | Public (ship.freightos.com) | Freight cost estimates | The only free public freight API with multi-mode results; mandated by phase requirements |
| framer-motion | ^12.33.0 (already installed) | Marquee animation (alternative) | Already in package.json; can be used for marquee if CSS keyframes prove insufficient |
| Tailwind CSS | ^4 (already installed) | Skeleton loaders, layout | Already in project; animate-pulse class for skeleton loading states |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage (browser native) | N/A | Currency cache (24h TTL), target currency selection | Always — no additional dependency |
| Intl.NumberFormat (browser native) | N/A | Currency formatting | Already used in `OfferSummary` in DealSidebar |
| lucide-react | ^0.560.0 (already installed) | Transport mode icons (Ship, Plane, Truck) | Already installed |
| date-fns | ^4.1.0 (already installed) | Relative timestamps ("Updated Xs ago") | Already installed; use `formatDistanceToNow` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS keyframes marquee | react-fast-marquee 1.6.5 | react-fast-marquee is lightweight (~4kB) but last published July 2024, introduces new dependency; CSS keyframes approach has zero bundle cost and is already sufficient |
| CSS keyframes marquee | framer-motion animate | framer-motion is already installed; can produce smooth marquee with no new dep — valid fallback if CSS approach has rendering issues |
| Frankfurter API | Open Exchange Rates | OXR requires API key and has a 1000 req/mo free tier; Frankfurter is fully free with no limits |
| Direct Freightos fetch | Next.js API route proxy | Proxy violates INTEL-04 requirement; proxy adds server cost; only use as fallback if CORS is blocked |

**Installation:**
```bash
# No new npm packages required for this phase.
# All required libraries are already in package.json or available as browser natives.
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/constants/
│   └── currencyConstants.js          # 8 supported currencies (replaces/extends currencies.js)
├── presentation/
│   ├── hooks/
│   │   └── intelligence/
│   │       ├── useLiveCurrency.js    # Polling hook, localStorage cache, 60s interval
│   │       └── useFreightEstimate.js # On-demand fetch, Freightos API
│   └── components/
│       ├── homepage/
│       │   └── CurrencyTicker/
│       │       └── CurrencyTicker.jsx   # Marquee bar, above HeroSection
│       └── features/deal/
│           └── DealSidebar/
│               ├── CurrencyConvertPanel.jsx   # Two-dropdown conversion
│               └── FreightEstimatorWidget.jsx  # Collapsible, "Get Estimate" button
```

### Pattern 1: Module-Level Cache for useLiveCurrency

**What:** The hook stores rates data and the last-fetch timestamp as module-level variables (outside the hook function) so multiple component instances share a single fetch cycle. Only one `setInterval` runs regardless of how many components call the hook.

**When to use:** Any hook that polls an external API on a timer where multiple components may mount the same hook simultaneously (CurrencyTicker on homepage and CurrencyConvertPanel in DealSidebar both call useLiveCurrency).

**Example:**
```javascript
// Source: ECMAScript module scope — module variables persist for the page lifetime
let _rates = null;
let _fetchedAt = null;
let _intervalId = null;
let _subscribers = new Set();

function notifySubscribers() {
  _subscribers.forEach(fn => fn({ rates: _rates, fetchedAt: _fetchedAt }));
}

export function useLiveCurrency() {
  const [rates, setRates] = useState(_rates);
  const [fetchedAt, setFetchedAt] = useState(_fetchedAt);
  const [error, setError] = useState(null);

  useEffect(() => {
    const update = ({ rates: r, fetchedAt: t }) => {
      setRates(r);
      setFetchedAt(t);
    };
    _subscribers.add(update);

    // First subscriber starts the polling interval
    if (_subscribers.size === 1) {
      fetchAndNotify();
      _intervalId = setInterval(fetchAndNotify, 60_000);
    }

    return () => {
      _subscribers.delete(update);
      // Last subscriber stops polling
      if (_subscribers.size === 0 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
    };
  }, []);

  return { rates, fetchedAt, error };
}
```

### Pattern 2: localStorage Currency Cache

**What:** On each successful Frankfurter fetch, write rates + timestamp to localStorage. On initial mount (before first successful fetch), hydrate state from localStorage. Show stale warning if `Date.now() - cachedAt > 60_000`.

**When to use:** Any external API that has per-user display fallback requirements without server-side data.

**Example:**
```javascript
// Source: LegalBanner pattern in this project (per-deal localStorage keys)
const CACHE_KEY = 'ctg_live_rates_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { rates, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > TTL_MS) return null; // Expired
    return { rates, fetchedAt };
  } catch {
    return null;
  }
}

function saveToCache(rates, fetchedAt) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt }));
  } catch {
    // localStorage may be unavailable in private browsing — silently ignore
  }
}
```

### Pattern 3: Frankfurter Multi-Currency Fetch

**What:** Fetch all 8 required pairs in a single API call by specifying a base and requesting multiple quotes. Then compute reciprocal rates mathematically instead of making separate API calls.

**When to use:** When you need "both directions" (EUR/USD and USD/EUR) — math is exact and avoids doubling API calls.

**Example:**
```javascript
// Source: api.frankfurter.dev/v2 documentation
// Fetch all pairs relative to EUR base in one call:
// GET https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY,AED,SAR
// Then: USD/EUR = 1 / EUR_USD_rate (mathematical reciprocal)
async function fetchRates() {
  const response = await fetch(
    'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY,AED,SAR'
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  // data.rates: { USD: 1.08, GBP: 0.85, TRY: 35.2, ... }
  // data.date: "2026-04-02"
  return data;
}
```

**Note on AED and SAR:** The Frankfurter API covers ECB-sourced currencies. AED (UAE Dirham) and SAR (Saudi Riyal) are Gulf currencies not published by the ECB. Verify at runtime whether Frankfurter v2 includes them — if not, fall back to showing only currencies available in the response.

### Pattern 4: Freightos shippingCalculator Request

**What:** Construct a GET request to the public Freightos endpoint with required parameters. No API key needed.

**When to use:** Only called when user explicitly clicks "Get Estimate" button.

**Example:**
```javascript
// Source: Freightos Apiary documentation — https://jsapi.apiary.io/apis/freightos/reference/0/fast-shipping-estimates-public.html
// Public endpoint — no apiKey parameter for marketplace estimates
const BASE_URL = 'https://ship.freightos.com/api/shippingCalculator';

async function fetchFreightEstimate({ origin, destination, weight, loadtype, width, height, length }) {
  const params = new URLSearchParams({
    origin,
    destination,
    weight: String(weight),
    loadtype,       // e.g. 'boxes', 'pallets', 'container20', etc.
    format: 'json',
    resultSet: 'cheapestEachMode', // one result per transport mode
  });
  if (width && height && length) {
    params.append('width', String(width));
    params.append('height', String(height));
    params.append('length', String(length));
  }

  const response = await fetch(`${BASE_URL}?${params.toString()}`);
  if (response.status === 429) throw new RateLimitError();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

### Pattern 5: Marquee Animation (CSS Keyframes, No Dependency)

**What:** Pure CSS infinite scroll using `@keyframes` in the Tailwind config or a `<style>` block inside the component. Content is duplicated in JSX to create a seamless loop.

**When to use:** Horizontal auto-scrolling content strip. No need for external library.

**Example:**
```jsx
// Source: Pattern established at https://jackwhiting.co.uk/posts/creating-a-marquee-with-tailwind-css
// Tailwind v4 arbitrary values in className or globals.css @keyframes
// In globals.css:
//   @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
//   .animate-marquee { animation: marquee 30s linear infinite; }

function CurrencyTicker({ rates }) {
  return (
    <div className="overflow-hidden bg-[#0A1628] border-b border-[#2A3B52] py-1.5">
      <div className="flex animate-marquee whitespace-nowrap">
        {/* Content duplicated — first copy + identical second copy for seamless loop */}
        <TickerItems rates={rates} />
        <TickerItems rates={rates} aria-hidden="true" />
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Multiple setInterval per hook instance:** If useLiveCurrency is used in both CurrencyTicker and CurrencyConvertPanel, each mount would start its own 60s timer. Use module-level singleton pattern (Pattern 1) to prevent this.
- **Auto-fetching freight on component mount:** Violates the 100 req/hr rate limit design. The widget must only call Freightos when user explicitly clicks "Get Estimate".
- **Storing rates in Firestore or Firebase RTDB:** Introduces server-side currency data storage — the design intent is fully client-side. Do not add any Firestore writes for currency data.
- **Proxying Freightos through Next.js API route (primary path):** Violates INTEL-04. If CORS forces a proxy fallback, document it explicitly and note the tradeoff in comments.
- **Hardcoding precise Freightos response fields without verifying:** The Freightos response has nested structure. Parse defensively with optional chaining.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Custom number formatter | `Intl.NumberFormat` with `style: 'currency'` (already used in OfferSummary) | Browser native, handles locale, already established in this codebase |
| Relative timestamp ("3 minutes ago") | Custom time-diff string builder | `date-fns` `formatDistanceToNow` (already installed) | Already in package.json; handles pluralization, edge cases |
| Exchange rate calculations | Custom floating-point rate math | Simple division/multiplication — rates are floating point, JavaScript handles it fine; use `toFixed(4)` for display | Not a "library" gap — just basic arithmetic |
| Volumetric weight | Custom formula | Standard formula: `(L × W × H) / 5000` (cm³ to kg, air industry standard) | Industry standard, single formula, no library needed |

**Key insight:** This phase has zero npm dependencies to add. All required utilities (formatting, animation, caching, fetch) are either browser-native, already installed, or trivially implemented.

---

## Common Pitfalls

### Pitfall 1: AED and SAR Not in Frankfurter/ECB Dataset
**What goes wrong:** The ECB publishes reference rates for ~33 currencies — AED (UAE Dirham) and SAR (Saudi Riyal) are Gulf Cooperation Council currencies not tracked by the ECB. The Frankfurter API may return a 404 or empty rate for these two currencies.
**Why it happens:** The user specified 8 currencies including two that may not be in the ECB dataset.
**How to avoid:** Fetch all 8 and display only the ones returned by the API. Document in `currencyConstants.js` which currencies are ECB-sourced vs. potentially unavailable. On first fetch, log which currencies were missing. Consider a fallback to a secondary source or simply omit those pairs gracefully if not returned.
**Warning signs:** Response `data.rates` object missing `AED` or `SAR` keys.

### Pitfall 2: Freightos API CORS Headers — Unknown at Research Time
**What goes wrong:** The Freightos `ship.freightos.com` endpoint may not send `Access-Control-Allow-Origin` headers permitting cross-origin browser requests. The documentation primarily describes widget embed (iframe/custom element) integration, not direct `fetch()` calls from third-party origins.
**Why it happens:** Many legacy APIs designed for server-to-server use do not set CORS headers even when technically "public."
**How to avoid:** The first implementation task must include a CORS probe: try `fetch()` from the browser and check if it succeeds. If it fails with a CORS error, implement a minimal Next.js API route (`/api/freight/estimate`) that proxies the call to Freightos — but note this technically violates the per-IP rate limit intent of INTEL-04 (server IP rate-limits instead of user IP). Document the decision clearly in code comments.
**Warning signs:** Browser console shows "Access to fetch at 'ship.freightos.com' from origin 'localhost:3000' has been blocked by CORS policy."

### Pitfall 3: 60s Polling on Hidden Tabs
**What goes wrong:** If the user has the deal page open in a background tab, `setInterval` continues polling Frankfurter every 60s unnecessarily.
**Why it happens:** Browser timers run regardless of tab visibility.
**How to avoid:** Check `document.hidden` before executing the fetch inside the interval callback. Skip the fetch if the tab is hidden — the existing `useDeal` hook uses the same pattern for the notification chime (`if (document.hidden) return`).
**Warning signs:** Unexpectedly high API request counts in browser devtools network tab.

### Pitfall 4: localStorage Access During SSR
**What goes wrong:** Next.js renders components server-side where `localStorage` is undefined. Any direct `localStorage.getItem()` call outside a `useEffect` will throw `ReferenceError: localStorage is not defined`.
**Why it happens:** Next.js App Router renders server components and client components' initial render on the server.
**How to avoid:** All localStorage access MUST be inside `useEffect` or wrapped in `typeof window !== 'undefined'` guards. Both the cache read (initial hydration) and cache write (after successful fetch) must be in effects.
**Warning signs:** Build error `ReferenceError: localStorage is not defined` or hydration mismatch errors.

### Pitfall 5: Freightos Response Structure Mismatch
**What goes wrong:** The documented Freightos response structure (deep nested JSON with `response.Quotes[].mode`, `response.Quotes[].totalPrice.amount`, etc.) may differ from actual API responses, especially for the public no-auth endpoint vs. the authenticated endpoint examples in documentation.
**Why it happens:** The Apiary documentation shows authenticated API responses; the public endpoint may return a different or simplified structure.
**How to avoid:** Log the raw response on first integration. Parse defensively with optional chaining. Show "no results" gracefully if expected fields are absent.
**Warning signs:** `Cannot read properties of undefined` errors when parsing the freight response.

### Pitfall 6: Currency Conversion Panel Mounted in Both DealSidebar and TradeSummaryTab
**What goes wrong:** If useLiveCurrency is not a shared singleton, both components subscribe independently and make separate Frankfurter API calls on the same page load.
**Why it happens:** Normal React hook behavior — each call to a hook creates an independent instance.
**How to avoid:** Use the module-level singleton pattern described in Pattern 1. The subscriber count controls the single interval lifecycle.
**Warning signs:** Network tab shows multiple simultaneous requests to `api.frankfurter.dev` when loading a deal page.

---

## Code Examples

### Frankfurter API Response Structure
```javascript
// Source: https://frankfurter.dev/docs (api.frankfurter.dev/v2)
// GET https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY
{
  "amount": 1.0,
  "base": "EUR",
  "date": "2026-04-01",           // Last trading day the ECB published rates
  "rates": {
    "USD": 1.0818,
    "GBP": 0.8567,
    "TRY": 37.42,
    "CNY": 7.842,
    "JPY": 162.58
  }
}
// Note: rates update once per trading day ~16:00 CET. Weekends/holidays return most recent prior date.
```

### Freightos shippingCalculator Response Structure (Authenticated example — public may differ)
```javascript
// Source: https://jsapi.apiary.io/apis/freightos/reference/0/fast-shipping-estimates-public.html
// Parse defensively — public endpoint response structure may vary
{
  "response": {
    "number": 2,
    "Quotes": [
      {
        "id": "abc123",
        "mode": "air",           // "air" | "LCL" | "FCL" | "LTL" | "FTL"
        "totalPrice": {
          "amount": 850.00,
          "currency": "USD"
        },
        "estimatedTotalPrice": {
          "amount": 850.00,
          "currency": "USD"
        }
        // Transit time fields may be present depending on endpoint version
      }
    ]
  }
}
```

### Freightos LoadType Constants
```javascript
// Source: Freightos Apiary documentation
// Relevant values for trade goods:
const FREIGHTOS_LOADTYPES = {
  BOXES: 'boxes',
  PALLETS: 'pallets',
  PALLET_EUR1: 'pallet_EUR1',
  CONTAINER_20: 'container20',
  CONTAINER_40: 'container40',
  CONTAINER_40HC: 'container40HC',
  CRATE: 'crate',
};
// Auto-detect logic: weight < 100kg && !hasDimensions → 'boxes'
//                    weight >= 100kg && weight < 1000kg → 'pallets'
//                    weight >= 1000kg → 'container20' (suggest FCL mode)
```

### Volumetric Weight Calculation
```javascript
// Source: Standard air freight industry formula (CBM method)
// Volumetric weight (kg) = L(cm) × W(cm) × H(cm) / 5000
// Use the higher of actual weight vs volumetric weight
function getChargeableWeight(actualKg, lengthCm, widthCm, heightCm) {
  if (!lengthCm || !widthCm || !heightCm) return actualKg;
  const volumetricKg = (lengthCm * widthCm * heightCm) / 5000;
  return Math.max(actualKg, volumetricKg);
}
```

### Conversion Panel State Shape
```javascript
// Source: CONTEXT.md decisions + Offer entity fields
// useLiveCurrency return shape:
{
  rates: { USD: 1.0818, GBP: 0.8567, TRY: 37.42, ... }, // All vs EUR base
  fetchedAt: 1712060000000,  // Date.now() when last fetched
  isStale: false,            // true if cached and > 60s old
  cacheExpired: false,       // true if localStorage TTL > 24h expired
  error: null,               // string error message or null
}

// CurrencyConvertPanel props consumed from useLiveCurrency + latestOffer:
// offer.price (number), offer.currency (ISO 4217), offer.quantity (number)
// target1, target2 (from localStorage, default EUR + USD)
```

### localStorage Keys
```javascript
// Source: CONTEXT.md pattern — LegalBanner uses per-deal localStorage keys
// New keys for Phase 8:
const KEYS = {
  RATES_CACHE: 'ctg_live_rates_v1',          // { rates, fetchedAt } — 24h TTL
  CURRENCY_TARGET_1: 'ctg_currency_target_1', // ISO code string, default 'EUR'
  CURRENCY_TARGET_2: 'ctg_currency_target_2', // ISO code string, default 'USD'
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<marquee>` HTML element | CSS `@keyframes` animation with `transform: translateX` | HTML5 deprecation | No browser compatibility issues; smooth GPU-accelerated animation |
| Frankfurter v1 (api.frankfurter.app) | Frankfurter v2 (api.frankfurter.dev/v2) | API migrated ~2024 | v1 still works but v2 is canonical — redirects from .app to .dev are active |
| Exchange rate APIs requiring API keys | Frankfurter (no auth, no limits) | Ongoing | Open APIs are sufficient for display-only purposes |

**Deprecated/outdated:**
- `api.frankfurter.app` (v1): Domain now redirects to `frankfurter.dev`. The old base URL `https://api.frankfurter.app` returns 301 to `https://api.frankfurter.dev`. Use v2 endpoint directly to avoid redirect latency.

---

## Open Questions

1. **AED and SAR availability in Frankfurter v2**
   - What we know: Frankfurter sources ECB data; ECB publishes ~33 currencies, primarily major and European.
   - What's unclear: Whether AED and SAR are in the ECB dataset and available via Frankfurter v2.
   - Recommendation: In the first implementation task, make a test fetch for all 8 currencies and document which are returned. If AED/SAR are absent, display only available currencies in the ticker without errors.

2. **Freightos CORS headers for browser-originating fetch**
   - What we know: Freightos documentation describes widget embed (iframe, custom element), not direct fetch. Rate limit is per IP (100/hr).
   - What's unclear: Whether `ship.freightos.com` sends `Access-Control-Allow-Origin: *` headers.
   - Recommendation: In the FreightEstimatorWidget implementation task, probe CORS before building the full integration. If CORS is blocked, implement a thin Next.js proxy at `/api/freight/estimate` and note the INTEL-04 deviation in code comments. The rate-limit intent is best-effort.

3. **Freightos public response structure for no-auth requests**
   - What we know: Documented responses show authenticated API shape. Public endpoint confirmed to exist at same URL without `apiKey`.
   - What's unclear: Whether public endpoint returns same JSON structure or a simplified/different schema.
   - Recommendation: Log and inspect raw response during the first integration test. Build a defensive parser with optional chaining throughout.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — this section is omitted per config rules.

---

## Sources

### Primary (HIGH confidence)
- `https://frankfurter.dev/docs` (redirected to `https://frankfurter.dev/docs`) — API endpoints, base URL, rate limits, no-auth policy, response format
- `https://api.frankfurter.dev/v2` — Confirmed base URL, endpoint structure
- Existing codebase: `DealSidebar.jsx`, `useDeal.js`, `useTradeSummary.js`, `PartyCard` pattern, `currencies.js`, `package.json` — project patterns, installed dependencies, integration points

### Secondary (MEDIUM confidence)
- `https://jsapi.apiary.io/apis/freightos/reference/0/fast-shipping-estimates-public.html` — Freightos API parameters, loadtype values, response structure, attribution requirements, rate limits (100 req/hr)
- `https://ship.freightos.com/api/shippingCalculator` — Confirmed public endpoint exists; error response structure
- WebSearch results confirming Freightos attribution requirement: "any use requires clear acknowledgement of Freightos with a link to www.freightos.com"

### Tertiary (LOW confidence)
- CORS behavior of Freightos public endpoint: Not confirmed by official documentation. Must be probed during implementation.
- AED/SAR availability in Frankfurter v2: Not verified — ECB coverage for Gulf currencies is uncertain.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Frankfurter fully documented; all other tools already in package.json
- Architecture: HIGH — Hook patterns follow established project conventions (useDeal, useTradeSummary, LegalBanner localStorage)
- Pitfalls: HIGH (currency API) / MEDIUM (Freightos CORS) — currency side well-understood; Freightos CORS is genuine uncertainty
- Integration points: HIGH — DealSidebar, TradeSummaryTab, homepage page.js all read and confirmed

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (Frankfurter is stable; Freightos API could change at any time — verify before building)
