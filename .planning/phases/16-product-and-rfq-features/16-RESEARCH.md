# Phase 16: Product and RFQ Features - Research

**Researched:** 2026-04-22
**Domain:** Product browsing enhancements, RFQ flow fixes, admin CSV upload, Firebase Firestore/Storage, React UI patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Favorites:** Star icon top-right of product cards and product detail. `favoriteProductIds` array on user document. Dedicated `/favorites` page from profile.
- **Share Button:** Web Share API on product detail page. Fallback: copy link to clipboard + toast. Same pattern as news article share (Phase 12).
- **Category Sidebar:** Persistent left sidebar on All Products page. Parent categories as headers, sub-categories indented. Search box at top. URL query param filtering. Active category highlighted.
- **Product Image Zoom:** Desktop hover magnifier only — shows magnified view in a lens/overlay next to the image. No click-to-lightbox.
- **CSV Bulk Upload:** Admin-only. Admin selects member via user picker. UI: "Bulk Upload" button in admin Products tab. Preview + validate before creating. CSV columns: Product Name, Category, Price, Currency, Quantity, Unit, Description, Image URLs (comma-separated). System downloads and stores images from provided URLs.
- **RFQ Modal Fix:** Keep existing modal approach, prevent closing on outside click, add explicit close/cancel button.
- **Quote Details Enhancement:** Keep existing QuotesSection, enhance with more detail fields and better formatting. No layout change.
- **Deal Start from Product Detail:** "Start Deal" button on product detail page, visible to non-owners only. Navigates to `/deals/new?productId=X&sellerId=Y`. Pre-fills product name, price, quantity.
- **RFQ Notifications (item 10):** Already implemented in Phase 12 (`onRFQCreated` CF). No action needed.
- **Deferred items:** RFQ reporting (V2), target budget range (V2).

### Claude's Discretion
- Star icon exact placement and animation
- Category sidebar mobile behavior (drawer, collapse, or hide)
- Magnifier lens size and zoom level
- CSV preview table styling and error highlighting
- QuotesSection enhancement — which fields to add and how to format them
- Image URL download error handling (skip invalid URLs, show partial results)

### Deferred Ideas (OUT OF SCOPE)
- RFQ reporting + communicate with reporter via messages — V2
- Target budget range "0 = will be negotiated" — V2
- RFQ notifications (item #10) — already implemented in Phase 12
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROD-01 | Favorite products — star icon toggle on product cards and detail page, `favoriteProductIds` on user doc, `/favorites` page | User doc array update pattern via UserRepository; Firestore `arrayUnion`/`arrayRemove` for toggle |
| PROD-02 | Share button on product detail — Web Share API with clipboard fallback + toast | Existing pattern in `NewsDetailClient.jsx` (navigator.share + navigator.clipboard) |
| PROD-03 | Product category sidebar on All Products page — persistent left sidebar with parent/sub categories, search, URL filter, active highlight | `CategoryRepository.getParentCategories()` + `getSubCategories()`; URL query param pattern already in `products/page.jsx` |
| PROD-04 | Product image zoom on hover — magnifier lens/overlay next to image, desktop only | Pure CSS/JS implementation; no library needed (see Architecture Patterns) |
| PROD-05 | CSV bulk product upload — admin-only, member picker, preview/validate, image URL download | `CreateProductUseCase` + `ProductRepository.uploadProductImages()`; Cloud Function or client-side fetch for image URLs |
| PROD-06 | RFQ creation modal fix — prevent outside-click close, add explicit cancel button | Modal component already has `onClick={onClose}` on backdrop; remove or guard it |
| PROD-07 | Quote details enhancement — more fields + better formatting in existing QuotesSection | `QuotesSection.jsx` already has expand/collapse; add supplier info fields |
| PROD-08 | Deal start button on product detail — "Start Deal" button, non-owner only, navigates to `/deals/new?productId=X&sellerId=Y` | `/deals/new/page.jsx` already reads `productId` from query; needs `sellerId` param support added |
| PROD-09 | `/favorites` page — lists all products favorited by current user | `ProductRepository.getById()` for each id in `favoriteProductIds`; or batch query |
| PROD-10 | RFQ notifications — verify already done | Confirmed implemented in Phase 12 `onRFQCreated` CF. No work needed. |
</phase_requirements>

---

## Summary

Phase 16 is a UI-and-data-layer enhancement phase. It adds new user-facing features (favorites, share, category sidebar, image zoom, favorites page, deal-start button) on top of the existing product browsing infrastructure, fixes a known UX bug in the RFQ modal, and adds admin tooling (CSV bulk upload). There are no new Cloud Functions required beyond what already exists — all features are achievable through direct Firestore writes, existing use cases, and client-side logic.

The most architecturally significant task is the CSV bulk upload, which requires server-side (Cloud Function) image downloading to securely fetch and store images from external URLs into Firebase Storage. All other features follow patterns already established in the codebase (Web Share API from Phase 12, URL query params from the products page, react-hook-form + zod for forms, arrayUnion/arrayRemove for Firestore array fields).

The `/deals/new` page currently requires both `conversationId` and `productId` query params — the "Start Deal" button path (`/deals/new?productId=X&sellerId=Y`) omits `conversationId` and requires an adjustment to the validation logic on that page.

**Primary recommendation:** Implement in waves: (1) pure UI additions (favorites toggle, share button, image zoom), (2) layout change (category sidebar), (3) data-layer additions (favorites page, deal-start navigation), (4) admin tooling (CSV upload), (5) RFQ/quote fixes (modal, QuotesSection).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React / Next.js App Router | Existing | Component rendering | Already in use throughout |
| Firestore (`arrayUnion`, `arrayRemove`) | Firebase SDK | Toggle `favoriteProductIds` on user doc | Race-condition-safe array mutation; project-established pattern |
| react-hook-form + zodResolver | Existing | CSV preview validation form | Project standard for all forms |
| react-hot-toast | Existing | User feedback toasts | Project-wide toast system |
| lucide-react | Existing | Icons (Star, Share2, etc.) | Project icon library |
| papaparse | ^5.x | CSV parsing client-side | Zero-config CSV parser; handles edge cases (quoted commas, BOM, encoding) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Share API (browser built-in) | N/A | Native share sheet on mobile | Product detail share button — no install needed |
| `navigator.clipboard` (browser built-in) | N/A | Copy-to-clipboard fallback | When Web Share API unavailable |
| CSS `transform: scale()` + `overflow: hidden` | N/A | Image zoom magnifier | Desktop hover zoom — pure CSS/JS, no library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| papaparse | Manual CSV split | papaparse handles quoted fields, BOM, encoding — hand-rolling breaks on edge cases |
| Firestore arrayUnion/arrayRemove | Get-then-set for favorites | arrayUnion/arrayRemove are atomic — concurrent clicks safe |
| CSS zoom overlay | react-zoom-pan-pinch | Library is overkill for hover-only desktop zoom; pure CSS is zero dependency |

**Installation (new dependency only):**
```bash
npm install papaparse
```

---

## Architecture Patterns

### Recommended Project Structure for New Files
```
src/
├── presentation/
│   ├── components/
│   │   ├── features/
│   │   │   ├── product/
│   │   │   │   ├── ProductCard/
│   │   │   │   │   └── ProductCard.jsx          # add star icon toggle
│   │   │   │   ├── ProductCategorySidebar/
│   │   │   │   │   └── ProductCategorySidebar.jsx  # NEW
│   │   │   │   └── ProductImageZoom/
│   │   │   │       └── ProductImageZoom.jsx        # NEW (wraps ProductGallery)
│   │   │   └── admin/
│   │   │       └── ProductsRequestsManager/
│   │   │           └── ProductsRequestsManager.jsx  # add Bulk Upload section
│   ├── hooks/
│   │   ├── product/
│   │   │   └── useFavoriteProduct.js              # NEW
│   │   └── user/
│   │       └── useUserFavorites.js                # NEW (reads favoriteProductIds)
├── app/
│   └── (main)/
│       ├── products/
│       │   └── page.jsx                           # add sidebar layout
│       ├── product/[productId]/
│       │   └── page.jsx                           # add share + star + Start Deal
│       ├── favorites/
│       │   └── page.jsx                           # NEW
│       └── deals/new/
│           └── page.jsx                           # extend to support sellerId param
```

### Pattern 1: Favorites Toggle with arrayUnion/arrayRemove

**What:** Toggle a product ID in `favoriteProductIds` array on the user's Firestore document.
**When to use:** Any add/remove from a Firestore array field where concurrent writes are possible.

```javascript
// Source: Firebase Firestore docs — arrayUnion / arrayRemove
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

async function toggleFavorite(userId, productId, isFavorited) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    favoriteProductIds: isFavorited
      ? arrayRemove(productId)
      : arrayUnion(productId),
  });
}
```

### Pattern 2: Web Share API with clipboard fallback

**What:** Use `navigator.share` on mobile, fall back to clipboard on desktop.
**When to use:** Share button on product detail page — identical to news article share pattern.

```javascript
// Source: Existing NewsDetailClient.jsx (Phase 12 pattern)
const handleShare = async () => {
  const productUrl = `${window.location.origin}/product/${productId}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: product.name, url: productUrl });
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Share failed');
    }
  } else {
    navigator.clipboard.writeText(productUrl);
    toast.success('Link copied to clipboard!');
  }
};
```

### Pattern 3: Category Sidebar with URL query param filter

**What:** Left sidebar with parent/sub-category navigation that sets `?categoryId=` in the URL. ProductGrid already reads `categoryIdFilter` prop from `useSearchParams`.
**When to use:** All Products page layout — sidebar sits at ~w-56, grid takes remaining width.

```jsx
// Sidebar click handler — mirrors existing handleSearch pattern in products/page.jsx
const handleCategorySelect = (categoryId) => {
  const params = new URLSearchParams(searchParams.toString());
  if (categoryId) {
    params.set('categoryId', categoryId);
    params.delete('category');
  } else {
    params.delete('categoryId');
    params.delete('category');
  }
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
};
```

### Pattern 4: CSV Parsing with papaparse

**What:** Parse uploaded CSV file client-side, validate rows, show preview table, then batch-create products on confirm.
**When to use:** Admin CSV bulk upload.

```javascript
// Source: papaparse docs — https://www.papaparse.com/docs
import Papa from 'papaparse';

const handleCsvFile = (file) => {
  Papa.parse(file, {
    header: true,         // uses first row as field names
    skipEmptyLines: true,
    complete: (results) => {
      // results.data: array of row objects keyed by header
      // results.errors: parse errors per row
      setPreviewRows(results.data);
      setParseErrors(results.errors);
    },
  });
};
```

### Pattern 5: Image URL download in Cloud Function

**What:** For each Image URL in CSV row, fetch the image server-side and upload to Firebase Storage, then attach URL to product.
**When to use:** CSV bulk upload — must run server-side because client cannot bypass CORS on arbitrary image CDNs.

```javascript
// Cloud Function (Node.js) — fetch + upload pattern
const fetch = require('node-fetch');
const { getStorage } = require('firebase-admin/storage');

async function downloadAndStoreImage(userId, productId, imageUrl, index) {
  try {
    const response = await fetch(imageUrl, { timeout: 10000 });
    if (!response.ok) return null; // skip invalid
    const buffer = await response.buffer();
    const ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
    const storagePath = `${userId}/products/${productId}/image_${index}.${ext}`;
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, { metadata: { contentType: response.headers.get('content-type') } });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2030' });
    return url;
  } catch {
    return null; // skip on error; caller accumulates nulls and filters
  }
}
```

### Pattern 6: Deal Start Button — extend `/deals/new` for direct product navigation

**What:** Current `/deals/new` requires `conversationId` + `productId`. The "Start Deal" button provides `productId` + `sellerId` but no conversation. The page must be extended to handle this second entry path.

**Approach:** Add a second code branch: when `sellerId` is present but `conversationId` is absent, fetch product + seller directly and show the DealForm without conversation context. On submit, create conversation first (or pass `null` for `conversationId`).

```javascript
// Extended query param reading in NewDealContent
const conversationId = searchParams.get('conversationId'); // may be null
const productId      = searchParams.get('productId');
const sellerId       = searchParams.get('sellerId');        // NEW

// Guard: accept either (conversationId + productId) OR (productId + sellerId)
const isValidEntry = (conversationId && productId) || (productId && sellerId);
```

### Pattern 7: Product Image Zoom (pure CSS/JS)

**What:** On hover, reveal a magnified region of the image in an overlay panel beside the gallery.
**Implementation:** A `div` overlay positioned to the right of the gallery, with the product image set as `background-image`, `background-size` scaled up (e.g., 200%), and `background-position` tracking mouse `offsetX`/`offsetY` relative to the source image.

```jsx
// Hover zoom — no library required
const handleMouseMove = (e) => {
  const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - left) / width) * 100;
  const y = ((e.clientY - top) / height) * 100;
  setZoomPos({ x, y });
};
```

### Anti-Patterns to Avoid
- **Storing full product objects in `favoriteProductIds`:** Store only IDs; fetch products separately to avoid stale denormalized data.
- **Parsing CSV on every re-render:** Parse once on file input change; store results in state.
- **Blocking product creation when image URL download fails:** Skip failed images, log them, and proceed with partial image list (user decision: graceful degradation).
- **Closing RFQ modal on backdrop click after fix:** Remove the `onClick={onClose}` from the backdrop `div` in the RFQ modal usage, or pass a `noBackdropClose` prop. Do not change the global Modal component behavior — other modals expect click-to-close.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual `split(',')` | papaparse | Quoted commas, multi-line values, BOM, encoding edge cases break naive splits |
| Firestore array toggle | get-then-set pattern | `arrayUnion` / `arrayRemove` | Atomic; safe under concurrent writes |
| Image URL validation | Regex on URL string | Attempt fetch + check Content-Type header | URLs can look valid but return HTML error pages |

**Key insight:** The CSV image download is the only genuinely complex sub-problem. Everything else in this phase is UI composition over existing patterns.

---

## Common Pitfalls

### Pitfall 1: `/deals/new` validation requires both `conversationId` AND `productId`
**What goes wrong:** The existing page throws a "missing conversation or product context" error if `conversationId` is absent, which it will be for the "Start Deal" button path.
**Why it happens:** The original design assumed deals always start from a product conversation. The CONTEXT.md changes this assumption.
**How to avoid:** Add a second valid entry condition: `(productId && sellerId)` bypasses the `conversationId` requirement. Keep the old path fully intact.
**Warning signs:** "Missing conversation or product context" error shown when clicking Start Deal.

### Pitfall 2: Star icon z-index conflict with existing status badge
**What goes wrong:** The status badge is currently at `absolute top-2 right-2`. Placing a star icon there too causes overlap.
**Why it happens:** ProductCard already uses `absolute top-2 right-2` for the status badge.
**How to avoid:** Reposition the status badge slightly (e.g., `top-2 left-2`) or place star at `top-2 right-2` and status badge at `top-2 left-2`. The star icon is higher priority for discovery UX.
**Warning signs:** Star and status badge visually overlapping on product card.

### Pitfall 3: Category sidebar breaks the existing 4-column ProductGrid layout
**What goes wrong:** Adding a left sidebar reduces the available width; the `xl:grid-cols-4` grid overflows or becomes cramped.
**Why it happens:** The sidebar consumes ~224px (`w-56`) and the grid CSS was designed for the full container width.
**How to avoid:** Wrap the All Products page in a flex row: sidebar at `w-56 flex-shrink-0`, grid in a `flex-1 min-w-0` container. Reduce max column count from 4 to 3 when sidebar is visible.

### Pitfall 4: CSV image download CORS in browser
**What goes wrong:** `fetch(imageUrl)` from the browser fails with CORS error for third-party image CDNs.
**Why it happens:** Browser enforces CORS; external image servers rarely send permissive CORS headers for arbitrary origins.
**How to avoid:** Image download must run in a Cloud Function (server-side). The client sends validated CSV row data to a callable CF; the CF fetches + stores images.
**Warning signs:** "Access-Control-Allow-Origin" errors in browser console when testing locally.

### Pitfall 5: Favorites page N+1 query problem
**What goes wrong:** Fetching each favorited product individually (`getById`) for a user with many favorites causes many sequential Firestore reads.
**Why it happens:** `favoriteProductIds` is a plain array of IDs with no denormalized data.
**How to avoid:** Use `Promise.all()` to fetch all favorited products in parallel. Cap display (e.g., 50 items) with "load more". This is acceptable for a favorites page.

### Pitfall 6: Modal outside-click fix must be targeted, not global
**What goes wrong:** Removing the `onClick={onClose}` from the Modal component globally breaks all other modals that rely on backdrop-click-to-close.
**Why it happens:** The global `Modal` component passes `onClick={onClose}` on its backdrop `div`.
**How to avoid:** The fix must be scoped to the RFQ modal usage in `requests/page.jsx` (or wherever RequestForm is opened in a Modal). Options: (a) pass a `disableBackdropClose` prop to Modal, or (b) just remove the onClose handler at the call site. Option (b) is simpler but requires the explicit Cancel button inside the form (already planned).

---

## Code Examples

### Toggle favorite in `useFavoriteProduct.js`
```javascript
// Source: Firebase Firestore SDK — arrayUnion/arrayRemove
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useFavoriteProduct() {
  const toggleFavorite = async (userId, productId, currentlyFavorited) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      favoriteProductIds: currentlyFavorited
        ? arrayRemove(productId)
        : arrayUnion(productId),
    });
  };
  return { toggleFavorite };
}
```

### Star icon in ProductCard (top-right, with stopPropagation)
```jsx
// Stop propagation prevents card click when toggling favorite
<button
  onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
  aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
>
  <Star
    className={`w-5 h-5 transition-colors ${isFavorited ? 'fill-[#FFD700] text-[#FFD700]' : 'text-white'}`}
  />
</button>
```

### Prevent Modal backdrop close at the call site
```jsx
// In requests page — change onClose on backdrop to noop, keep X button
<Modal
  isOpen={rfqModalOpen}
  onClose={() => {}} // prevent backdrop click from closing
  title="Create RFQ"
>
  <RequestForm
    ...
    onCancel={() => setRfqModalOpen(false)} // explicit cancel inside form
  />
</Modal>
```

### CSV bulk upload CF — callable function signature
```javascript
// Cloud Function: bulkUploadProducts (onCall)
// Input: { userId: string, rows: Array<CSVRow> }
// CSVRow: { name, categoryId, price, currency, quantity, unit, description, imageUrls: string[] }
// Output: { created: number, skipped: number, errors: Array<{row, reason}> }
exports.bulkUploadProducts = onCall(async (request) => {
  // 1. Verify caller is admin
  // 2. For each row: validate, download images, createProduct
  // 3. Return summary
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deal creation only from conversation | Deal creation from product detail page (no conversation) | Phase 16 | `/deals/new` needs dual entry-point support |
| No favorites on user doc | `favoriteProductIds: string[]` added | Phase 16 | UserRepository needs `updateFavorites` method or direct `updateDoc` |
| All Products page: full-width grid only | Sidebar + narrower grid | Phase 16 | Layout wrapper and column count adjustment needed |

**Deprecated/outdated:**
- `/deals/new` validation that mandates `conversationId`: must be relaxed to allow `productId + sellerId` path.

---

## Open Questions

1. **Cloud Function vs client-side for CSV image download**
   - What we know: CORS blocks client-side fetch of arbitrary image URLs.
   - What's unclear: Whether a Cloud Function callable is the right pattern, or if a Next.js API route would work.
   - Recommendation: Cloud Function callable — consistent with the project's existing CF pattern for admin operations and avoids exposing Firebase Admin credentials in a Next.js API route. Use the existing `withRetry` pattern from `ProductsRequestsManager`.

2. **`/favorites` page auth and Firestore rules**
   - What we know: User document has `favoriteProductIds`; reading it requires the user to be authenticated.
   - What's unclear: Whether current Firestore rules allow the authenticated user to read their own `favoriteProductIds` field.
   - Recommendation: Verify `users/{userId}` read rule includes `request.auth.uid == userId` — this is the project standard; add if missing.

3. **Mobile sidebar behavior (Claude's discretion)**
   - What we know: On desktop a persistent left sidebar is required. Mobile behavior is at Claude's discretion.
   - Recommendation: On mobile (`< lg`), hide the sidebar entirely and retain the existing top search bar + category chip behavior. This is the lowest-risk change — no drawer complexity, no layout shift on mobile.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `NewsDetailClient.jsx` (Web Share API pattern)
- Existing codebase — `products/page.jsx` (URL query param filtering pattern)
- Existing codebase — `Modal.jsx` (backdrop click close mechanism)
- Existing codebase — `CreateProductUseCase.js` (product creation pipeline)
- Existing codebase — `ProductsRequestsManager.jsx` (admin user picker + modal pattern)
- Existing codebase — `QuotesSection.jsx` (current quote display structure)
- Existing codebase — `deals/new/page.jsx` (current `productId` + `conversationId` requirement)
- Existing codebase — `CategoryRepository.js` (`getParentCategories`, `getSubCategories`)
- Firebase Firestore docs — `arrayUnion` / `arrayRemove` (atomic array mutation)
- papaparse docs — https://www.papaparse.com/docs (CSV parsing)

### Secondary (MEDIUM confidence)
- Phase 12 STATE.md decision: `LinkedIn share uses share-offsite URL pattern` — confirms Web Share API + clipboard is the project share pattern
- Phase 15 STATE.md: `createDeal CF only denormalizes productName/productImage/productCategory` — no `productPdfUrl` on deal doc, confirmed deal pre-fill fields

### Tertiary (LOW confidence)
- CSS hover magnifier approach — widely used pattern; confidence HIGH from prior usage but no project-specific source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries already in project; papaparse is a trivial addition
- Architecture: HIGH — all patterns are direct extensions of existing code; no novel infrastructure
- Pitfalls: HIGH — derived from reading actual code files (deals/new validation, Modal backdrop, ProductCard z-index, CSS CORS)

**Research date:** 2026-04-22
**Valid until:** 2026-06-01 (stable stack, no fast-moving dependencies)
