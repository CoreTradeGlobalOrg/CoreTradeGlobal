# Phase 6: Trade Summary and Shipment Tracking (S4) - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Both deal parties can view a complete trade summary with shipment tracking and milestone timeline. Logistics providers submit shipment status updates. Insurance providers confirm coverage. Every role sees an enhanced dashboard with relevant trade/shipment information. A new DELIVERED deal status marks the true terminal state.

Requirements: TRACK-01, TRACK-02, TRACK-03, TRACK-04

</domain>

<decisions>
## Implementation Decisions

### Trade Summary Access & Visibility
- New tab/section on the existing deal page (`/deals/[dealId]`), not a separate route
- Visible from CONTRACT_APPROVED onwards (not just after providers selected) — sections fill in progressively as deal advances
- Two-column layout: main content left, tracking status + timeline in right sidebar (matches existing DealPage pattern and S4 mockup)

### Trade Summary Content
- **Status hero banner** at top with deal status icon, product name, key stats, and live tracking pill
- **Trade info bar** — horizontal strip below hero with key data: Deal No, Product, Total Amount, Incoterms, Container #, Status
- **Sections (in order):**
  1. Deal overview (product, price, Incoterms, quantities)
  2. Parties & providers (buyer/seller info + selected insurance and logistics providers with quote details)
  3. Cost breakdown (product cost + insurance premium + logistics fee = total)
  4. Documents list (contract PDF available + placeholder slots for insurance certificate, bill of lading, etc.)
  5. Legal consulting info (if either party hired a lawyer — show lawyer name, engagement status, draft approval. Each party sees only their own lawyer info)
- **Legal disclaimer footer** at bottom: "This summary is for informational purposes only and does not constitute a legally binding document."
- **PDF export** button to generate downloadable PDF of the trade summary

### Shipment Tracking — Data Source
- Logistics provider submits status updates manually through their portal
- Insurance provider submits a one-time "Coverage Active" confirmation
- No real carrier API integration in v1 (that's TRACK-V2-02)

### Shipment Tracking — Status Model
- Fixed predefined status list (dropdown): Preparing, Picked Up, In Transit, At Customs, Out for Delivery, Delivered
- Each update includes: status, timestamp, optional note from provider
- Provider enters container number and tracking reference number (at first update, e.g., "Picked Up")
- Provider enters ETA date — displayed as countdown timer on summary page

### Shipment Tracking — Deal Status
- New `DELIVERED` status added to DEAL_STATUS enum
- State transition: PROVIDERS_SELECTED → DELIVERED (when logistics provider marks "Delivered")
- DELIVERED is the true terminal state for the deal lifecycle

### Shipment Tracking — Map
- Static map with origin and destination pins from deal's Incoterms locations
- Styled like the S4 mockup aesthetic (dark theme, route line between pins)
- Not data-driven / no live GPS — purely visual context showing trade route

### Shipment Tracking — Notifications
- Both buyer and seller receive in-app + email notifications when shipment status changes
- Follows existing notification pattern from Phase 2 (Resend email + Firestore in-app)

### Shipment Tracking — Provider UX
- New "Active Shipments" section/tab on existing `/provider/dashboard`
- Logistics providers see deals where they're the selected provider, with status update form
- Insurance providers see deals where they're selected, with "Confirm Coverage" action button

### Order Timeline — Milestones
- Three categories of milestones:
  1. **Deal milestones** (auto-generated): Negotiated → Contract Approved → Providers Selected
  2. **Shipment milestones** (from logistics provider): Preparing → Picked Up → In Transit → At Customs → Out for Delivery → Delivered
  3. **Insurance milestone**: Coverage Active (from insurance provider confirmation)
- Legal milestones excluded from timeline

### Order Timeline — Display
- Vertical timeline in the right sidebar column (extends existing ProgressTracker pattern)
- Each milestone shows: timestamp + actor (who triggered it) + optional notes
- Deal milestones are clickable — navigate to relevant page (contract, quotes)
- Shipment milestones are not clickable
- Real-time updates via Firestore onSnapshot listener

### Order Timeline — Data Model
- New `statusHistory` array field on deal document
- Each entry: `{ status, timestamp, actorId, actorName, note }`
- Cloud Functions append to statusHistory on every deal status transition
- Shipment updates stored in a separate tracking document/subcollection under the deal

### Order Timeline — Legacy Deals
- Existing deals without statusHistory: infer milestones from existing timestamps (deal.createdAt, contract.approvedAt, etc.)
- Shows milestones without exact transition times

### Role-Dispatched Dashboards — Member
- Enhance existing `/deals` page with:
  - **Deal status summary cards** at top: X negotiating, Y awaiting contract, Z in transit, W delivered
  - **Active shipments section**: highlight in-transit deals with tracking status and ETA
  - **Recent activity feed**: events across all deals (counter-offer, contract approved, shipment update)
  - **Quick actions**: "Create New Deal", "View Pending Contracts" shortcuts
- **DealCard enhanced** with tracking status badge and ETA when available

### Role-Dispatched Dashboards — Provider
- Logistics provider dashboard gets:
  - **Active Shipments tab**: deals where selected, with status/ETA and "Update Status" button
  - **Delivery stats**: X in transit, Y delivered this month
- Insurance provider dashboard gets:
  - **Coverage section**: deals where selected, with "Confirm Coverage" action

### Role-Dispatched Dashboards — Lawyer
- No changes needed — lawyer dashboard already shows engagements and channels

### Role-Dispatched Dashboards — Admin
- Admin dashboard gets platform-wide stats: total deals, active shipments, completed deliveries
- Admin can access any deal's trade summary page (read-only oversight)

### Claude's Discretion
- Loading skeleton and empty state designs
- Exact spacing, typography, and component styling within the dark theme
- Shipment tracking subcollection structure vs fields on deal doc
- PDF generation library choice
- Map rendering approach (SVG, image, or lightweight map library)
- Error state handling across all new components

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ProgressTracker** (`DealSidebar.jsx`): Vertical stepper with 4 steps (negotiation → agreement → quotes → tracking). Extend for detailed timeline with timestamps.
- **DealCard** (`features/deal/DealCard/`): Card component for deal list. Add tracking badge/ETA.
- **DealSidebar** (`features/deal/DealSidebar/`): Right sidebar on deal page. Integration point for timeline.
- **DealPage** (`features/deal/DealPage/`): Main deal view. Add summary tab routing.
- **Provider Dashboard** (`/provider/dashboard/page.jsx`): Kanban board for quotes. Add shipments section.
- **Lawyer Dashboard** (`/lawyer/dashboard/page.jsx`): Engagements list. No changes.
- **DEAL_STATUS** (`dealConstants.js`): Current terminal is PROVIDERS_SELECTED. Add DELIVERED.
- **Notification system**: Phase 2 pattern with Resend email + Firestore in-app + FCM. Reuse for tracking notifications.
- **Cloud Functions pattern**: Status transition functions with Firestore transactions. Reuse for shipment updates.

### Established Patterns
- **Clean Architecture**: Entity → Repository → Hook → Component. New Shipment entity, ShipmentRepository, useShipment hooks.
- **Firestore real-time**: onSnapshot listeners for live updates (used in deals, offers, contracts, quotes, legal channels).
- **DI container**: All repositories registered in `container.js`. Add ShipmentRepository.
- **Cloud Functions CJS duplication**: Constants duplicated in `functions/index.js` since CFs can't import ESM.
- **Denormalized IDs**: dealBuyerId/dealSellerId on subcollection docs for security rules.

### Integration Points
- **Deal page routing**: Add summary tab alongside existing negotiation/contract/quotes/legal tabs
- **Deal status state machine**: Extend VALID_TRANSITIONS to include PROVIDERS_SELECTED → DELIVERED
- **Provider dashboard**: Add new tab/section for active shipments
- **Admin dashboard**: Add trade stats section
- **Navbar**: May need "My Deals" dashboard link update if member dashboard changes significantly
- **Firestore rules**: New shipment tracking collection needs rules for provider write access and deal party read access

</code_context>

<specifics>
## Specific Ideas

- Map should look like the S4 mockup aesthetic — dark themed with origin/destination pins from Incoterms named places
- S4 HTML mockup (`other_items/S4-ticaret-ozeti-takip.html`) is the visual reference for summary layout, hero banner, trade info bar, and general feel
- ETA countdown timer on summary page, similar to the mockup's live countdown
- Documents section uses placeholder slots (insurance certificate, bill of lading) for future document upload capability
- Each party sees only their own lawyer info in the legal consulting section — privacy preserved

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-trade-summary-shipment-tracking*
*Context gathered: 2026-03-25*
