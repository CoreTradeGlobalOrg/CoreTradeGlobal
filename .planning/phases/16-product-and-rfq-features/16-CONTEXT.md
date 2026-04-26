# Phase 16: Product and RFQ Features - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance product browsing with favorites, sharing, category sidebar, image zoom, and CSV bulk upload. Improve RFQ flow with modal fix, quote display enhancement, and deal start from product detail. Items 1 (RFQ reporting) and 2 (target budget range) are deferred as V2. Item 10 (RFQ notifications) already implemented in Phase 12.

</domain>

<decisions>
## Implementation Decisions

### Favorites / Wishlist
- Star icon on product cards (top-right corner) and product detail page
- Click toggles favorite — stored as `favoriteProductIds` array on the user document
- Dedicated /favorites page accessible from the user's profile
- Star icon filled/highlighted when product is favorited

### Share Button
- Web Share API on product detail page (native share sheet on mobile)
- Fallback: copy link to clipboard with toast confirmation
- Same pattern as news article share from Phase 12

### Product Category Sidebar
- Persistent left sidebar on All Products page showing parent categories as headers, sub-categories as indented items
- Search box at top of sidebar to filter category names
- Clicking a category filters the product grid
- Active category highlighted
- On mobile: sidebar behavior left to Claude's discretion

### Product Image Zoom
- Hover magnifier on desktop — hovering over product image shows magnified view in a lens/overlay next to the image
- No click-to-lightbox — hover only

### CSV Bulk Product Upload
- Admin-only: admin uploads CSV on behalf of members
- Admin selects which member the products belong to via a user picker
- UI location: "Bulk Upload" button in the existing Products tab of the admin panel, opens a section/modal
- Preview + validate before creating: parse CSV, show preview table with validation errors highlighted, admin reviews and confirms
- CSV columns: Product Name, Category, Price, Currency, Quantity, Unit, Description, Image URLs (comma-separated)
- System downloads and stores images from provided URLs

### RFQ Creation Modal Fix
- Keep the existing modal approach but prevent closing on outside click
- Add explicit close/cancel button
- No new standalone page needed

### Quote Details Enhancement
- Keep the existing QuotesSection on the RFQ detail page
- Enhance with more quote detail fields and better formatting
- No layout change (stays below RFQ details)

### Deal Start from Product Detail
- "Start Deal" button on product detail page, visible to non-owners only (owner sees Edit/Delete instead)
- Navigates to `/deals/new?productId=X&sellerId=Y`
- Deal creation form pre-fills product name, price, and quantity from the product

### Claude's Discretion
- Star icon exact placement and animation
- Category sidebar mobile behavior (drawer, collapse, or hide)
- Magnifier lens size and zoom level
- CSV preview table styling and error highlighting
- QuotesSection enhancement — which fields to add and how to format them
- Image URL download error handling (skip invalid URLs, show partial results)

</decisions>

<specifics>
## Specific Ideas

- Favorites page accessible from profile, not from navbar
- CSV upload should have a member selector dropdown so admin picks who the products belong to
- "Start Deal" button should only appear for authenticated members who are not the product owner
- The modal outside-click fix is a simple change to the existing Modal component or its usage

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProductCard` (`src/presentation/components/features/product/ProductCard/ProductCard.jsx`): Add star icon toggle
- `ProductForm` (`src/presentation/components/features/product/ProductForm/`): Reference for CSV column mapping
- `RequestForm` (`src/presentation/components/features/request/RequestForm/RequestForm.jsx`): RFQ form in modal
- `QuotesSection` (`src/presentation/components/features/request/`): Existing quote display — enhance
- `CategoryRepository` (`src/data/repositories/CategoryRepository.js`): `getAll()`, `getParentCategories()`, `getSubCategories()`
- Web Share API pattern from news detail page (`src/app/(main)/news/[newsId]/NewsDetailClient.jsx`)
- `Modal` component (`src/components/ui/Modal`): Needs outside-click behavior change for RFQ

### Established Patterns
- Product entity has `images[]` array — first image is main
- Firebase Storage paths: `{userId}/products/{productId}/image.{ext}`
- Product listing uses IntersectionObserver infinite scroll (Phase 7)
- Category filtering via URL query params (`?category=`, `?categoryId=`)
- react-hook-form + zod for all forms

### Integration Points
- User document: add `favoriteProductIds` array field
- Admin panel Products tab: add Bulk Upload button
- Product detail page: add Start Deal button + share button
- All Products page: add category sidebar layout (grid needs to shrink)
- `/deals/new` page: read `productId` + `sellerId` from query params for pre-fill

</code_context>

<deferred>
## Deferred Ideas

- RFQ reporting + communicate with reporter via messages — V2
- Target budget range "0 = will be negotiated" — V2
- RFQ notifications (item #10) — already implemented in Phase 12 (onRFQCreated CF)

</deferred>

---

*Phase: 16-product-and-rfq-features*
*Context gathered: 2026-04-26*
