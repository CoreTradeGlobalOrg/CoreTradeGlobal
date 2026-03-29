---
phase: 06-trade-summary-shipment-tracking
plan: "04"
subsystem: ui
tags: [react, firebase, firestore, date-fns, timeline, dashboard]

requires:
  - phase: 06-01
    provides: statusHistory on deal docs, currentShipmentStatus/shipmentEtaDate denormalized fields, ShipmentRepository, shipmentConstants
  - phase: 06-02
    provides: useTradeSummary hook, TradeSummaryTab, DealSidebar context
  - phase: 06-03
    provides: ShipmentUpdate entity, subscribeToShipmentUpdates, shipment tracking flow

provides:
  - OrderTimeline component merging deal/shipment/insurance milestones
  - ETACountdown component with live date-fns countdown
  - DealSidebar integrated with OrderTimeline for post-contract deals
  - DealCard tracking badge and ETA display
  - Member deals page with status summary cards, activity feed, active shipments
  - Admin dashboard Trade Overview stats section

affects:
  - phase-07-platform-hardening

tech-stack:
  added: [date-fns (formatDistanceToNow)]
  patterns:
    - Self-subscribing sidebar pattern: DealSidebar subscribes to shipmentUpdates only when status requires timeline
    - Milestone merging: three category arrays sorted by timestamp into single timeline
    - Legacy milestone inference from deal timestamps with (estimated) tag
    - Notification activity feed: onSnapshot on /users/{uid}/notifications subcollection

key-files:
  created:
    - src/presentation/components/features/deal/TradeSummary/OrderTimeline.jsx
    - src/presentation/components/features/deal/TradeSummary/ETACountdown.jsx
  modified:
    - src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx
    - src/presentation/components/features/deal/DealCard/DealCard.jsx
    - src/app/(main)/deals/page.jsx
    - src/app/admin/page.jsx

key-decisions:
  - "DealSidebar self-subscribes to shipmentUpdates via ShipmentRepository when showTimeline=true and no prop data provided — avoids duplicate subscriptions when TradeSummaryTab is active on the same deal"
  - "OrderTimeline legacy inference: if statusHistory absent, infers milestones from deal.createdAt and deal.updatedAt with (estimated) tag — no forced migration"
  - "Pending shipment milestones appended after completed ones in natural SHIPMENT_ORDER — shows remaining journey greyed-out"
  - "RecentActivityFeed uses standalone onSnapshot (not a hook) directly in deals/page — keeps pattern simple, no hook required for a single-page subscription"
  - "Admin TradeOverviewStats uses getDocs (one-time fetch) not onSnapshot — admin stats are approximate and low-traffic, real-time unnecessary"

patterns-established:
  - "Milestone categories (deal, shipment, insurance, pending) sorted by timestamp ascending before render"
  - "ETACountdown resolves Firestore Timestamp or Date transparently via toDate() check"

requirements-completed: [TRACK-03, TRACK-04]

duration: 6min
completed: 2026-03-29
---

# Phase 6 Plan 04: Order Timeline and Dashboard Enhancements Summary

**Vertical order timeline (deal + shipment + insurance milestones), ETACountdown, DealCard tracking badge, member deals dashboard stats/activity feed, and admin trade stats — completing Phase 6 TRACK-03 and TRACK-04**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T14:11:50Z
- **Completed:** 2026-03-29T14:17:52Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- OrderTimeline merges three milestone categories (deal statusHistory, shipmentUpdates, insurance coverage) into a single chronological timeline with clickable deal milestones
- Member deals page transformed with status summary cards, real-time activity feed, active shipments section, and New Deal quick action
- Admin dashboard extended with Trade Overview stat cards (total deals, active shipments, delivered count)

## Task Commits

1. **Task 1: OrderTimeline, ETACountdown, DealSidebar integration** - `33d4dbf` (feat)
2. **Task 2: DealCard badge, deals page stats/feed, admin stats** - `7e94de8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/presentation/components/features/deal/TradeSummary/OrderTimeline.jsx` - Vertical milestone timeline with deal/shipment/insurance/pending categories, legacy inference, clickable deal milestones
- `src/presentation/components/features/deal/TradeSummary/ETACountdown.jsx` - Live ETA countdown using date-fns, updates every 60s
- `src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx` - Shows OrderTimeline for CONTRACT_APPROVED/PROVIDERS_SELECTED/DELIVERED, self-subscribes to shipmentUpdates
- `src/presentation/components/features/deal/DealCard/DealCard.jsx` - DELIVERED status config, tracking badge with SHIPMENT_STATUS_LABELS, ETA display
- `src/app/(main)/deals/page.jsx` - Status summary cards, recent activity feed, active shipments section, quick action button, DELIVERED in COMPLETED_STATUSES
- `src/app/admin/page.jsx` - TradeOverviewStats component with one-time Firestore queries for total/active/delivered counts

## Decisions Made

- DealSidebar self-subscribes to shipmentUpdates when showing timeline and no prop data is provided. This avoids duplicate subscriptions with TradeSummaryTab which has its own useTradeSummary subscription.
- Legacy deal milestone inference uses deal.updatedAt as the rough timestamp for all inferred post-creation milestones since there is no better source available without statusHistory.
- Admin trade stats use getDocs (one-time fetch) rather than real-time listeners — admin numbers are approximate display data and low-traffic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build succeeded clean on first pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 is complete. All TRACK requirements (01-04) addressed across plans 06-01 through 06-04.
- Phase 7 (Platform Hardening) can proceed — it depends on Phase 6 + Phase 8 (Live Currency and Freight Intelligence).

---
*Phase: 06-trade-summary-shipment-tracking*
*Completed: 2026-03-29*
