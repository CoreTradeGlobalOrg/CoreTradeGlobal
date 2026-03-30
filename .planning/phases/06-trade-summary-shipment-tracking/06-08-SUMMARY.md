---
phase: 06-trade-summary-shipment-tracking
plan: "08"
subsystem: ui
tags: [svg, react, world-map, equirectangular]

# Dependency graph
requires:
  - phase: 06-trade-summary-shipment-tracking
    provides: TradeRouteMap component used in TradeSummaryTab sidebar

provides:
  - Natural Earth 110m simplified equirectangular continent SVG paths replacing crude polygons
  - Recognizable continental outlines (N America, Greenland, S America, Europe, Asia, India, SE Asia, Africa, Australia, Japan, British Isles)

affects: [06-trade-summary-shipment-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Equirectangular projection formula for lon/lat to SVG coordinate mapping

key-files:
  created: []
  modified:
    - src/presentation/components/features/deal/TradeSummary/TradeRouteMap.jsx

key-decisions:
  - "Natural Earth 110m paths inlined as string constants — no npm dependencies or external SVG files added"
  - "ViewBox upgraded 400x180 -> 800x400 to match equirectangular 2:1 aspect ratio"
  - "Pin positions recalculated using equirectangular formula: origin at W Europe (lon=10,lat=48), dest at E Asia (lon=120,lat=35)"

patterns-established:
  - "Equirectangular projection: x=(lon+180)/360*W, y=(90-lat)/180*H for SVG continent mapping"

requirements-completed: [TRACK-01]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 06 Plan 08: TradeRouteMap Natural Earth Continent Paths Summary

**Replaced 6 crude 5-7 vertex polygons with 11 Natural Earth 110m simplified continent paths using equirectangular projection in an 800x400 SVG viewBox**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T13:38:25Z
- **Completed:** 2026-03-30T13:43:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Upgraded TradeRouteMap viewBox from 400x180 to 800x400 equirectangular aspect ratio
- Added 11 recognizable continent/island paths: North America, Greenland, South America, Europe, Asia, India, Southeast Asia, Africa, Australia, Japan, British Isles
- Recalculated pin positions using equirectangular lon/lat-to-SVG formula (origin: W Europe 10°E 48°N, destination: E Asia 120°E 35°N)
- Preserved dark theme (#0b1626 background, #1A283B fill, #2A3B52 stroke), bezier route line, gold/blue pins, and legend

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace crude polygons with Natural Earth simplified SVG continent paths** - `1b24eb4` (feat)

## Files Created/Modified
- `src/presentation/components/features/deal/TradeSummary/TradeRouteMap.jsx` - Natural Earth 110m simplified continent paths with equirectangular projection

## Decisions Made
- Paths inlined as template literal string constants — no npm dependencies, no external SVG files, zero deployment friction
- ViewBox ratio changed to 800x400 (2:1) to match equirectangular projection math, display height stays 180px via CSS
- 11 shapes chosen to cover recognizable geography without excessive vertex counts (~50-80 vertices per continent)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TradeRouteMap now shows a visually credible world map resolving the UAT gap-8 report ("map looks like shit")
- All Phase 06 UAT gap closure plans (06-06, 06-07, 06-08) are now complete

---
*Phase: 06-trade-summary-shipment-tracking*
*Completed: 2026-03-30*
