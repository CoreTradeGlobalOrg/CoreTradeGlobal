---
phase: 17-registration-onboarding-and-misc
plan: 03
subsystem: ui
tags: [zoho-salesiq, live-chat, fab, messages-widget, support, next-script]

requires:
  - phase: 13-messaging-and-communication-improvements
    provides: MessagesWidget FAB with conversation list and thread UI

provides:
  - Zoho SalesIQ live chat embedded in main layout via next/script lazyOnload
  - Two-tab FAB widget (Messages + Support) for authenticated users
  - Standalone gold floating chat button for unauthenticated visitors
  - Global suppression of Zoho default floating button via ready callback

affects:
  - All public pages (homepage, about, FAQ, product pages) — standalone button visible
  - All authenticated pages — Support tab in FAB replaces standalone button

tech-stack:
  added: []
  patterns:
    - Conditional Script embed pattern: only render when env var is set
    - Zoho chat panel control via window.$zoho.salesiq.floatwindow.visible JS API
    - Zoho readiness polling: 500ms interval, max 10 attempts (5s), then fallback message
    - Dynamic import with ssr:false for client-only components in 'use client' layout

key-files:
  created:
    - src/presentation/components/common/ZohoSalesIQ/ZohoSalesIQButton.jsx
  modified:
    - src/app/(main)/layout.jsx
    - src/presentation/components/common/MessagesWidget/MessagesWidget.jsx
    - src/presentation/components/common/MessagesWidget/MessagesWidget.css

key-decisions:
  - "NEXT_PUBLIC_ZOHO_WIDGET_KEY absence = single-tab Messages mode (no Support tab, no standalone button)"
  - "Zoho default float button suppressed globally via $zoho.salesiq.floatbutton.visible('hide') in ready callback"
  - "Tab bar only shown on conversation list view (not inside active conversation thread)"
  - "ZohoSalesIQButton loaded via next/dynamic ssr:false to avoid window access during SSR"
  - "useAuth() in layout.jsx to conditionally render standalone button — auth users see FAB Support tab instead"

patterns-established:
  - "Zoho SalesIQ JS API: floatwindow.visible('show'/'hide') controls chat panel; floatbutton.visible() controls FAB"

requirements-completed: [REG-07]

duration: 8min
completed: 2026-05-02
---

# Phase 17 Plan 03: Zoho SalesIQ Live Chat Integration Summary

**Zoho SalesIQ embedded globally via next/script lazyOnload, with two-tab FAB (Messages + Support) for auth users and gold standalone floating button for public visitors**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-02T09:12:22Z
- **Completed:** 2026-05-02T09:20:35Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified + 1 created)

## Accomplishments
- Zoho SalesIQ script embedded in main layout with `lazyOnload` strategy, only when env var is set, and default Zoho float button suppressed globally via `$zoho.salesiq.floatbutton.visible('hide')` in the ready callback
- FAB MessagesWidget extended with Messages/Support two-tab UI: tab bar appears only when widget key is configured, Support tab triggers Zoho chat window via `floatwindow.visible('show')`, with readiness polling (500ms, max 10 attempts) and fallback text
- New `ZohoSalesIQButton` component renders a gold floating chat button (`w-14 h-14`, `z-[100]`) for unauthenticated visitors, hidden once user logs in since the FAB covers Support via its tab

## Task Commits

1. **Task 1: Embed Zoho SalesIQ script and add Support tab to FAB widget** - `310283f` (feat)
2. **Task 2: Standalone Zoho chat button for public pages** - `6f56bc3` (feat)

**Plan metadata:** (final commit hash — see below)

## Files Created/Modified
- `src/app/(main)/layout.jsx` - Added Zoho Script tag (lazyOnload, conditional), ZohoSalesIQButton dynamic import, auth-conditional rendering
- `src/presentation/components/common/MessagesWidget/MessagesWidget.jsx` - Added two-tab UI, Zoho readiness polling, tab visibility logic with $zoho.salesiq API calls
- `src/presentation/components/common/MessagesWidget/MessagesWidget.css` - Added tab bar styles, support tab content styles (loading spinner, unavailable, hint states)
- `src/presentation/components/common/ZohoSalesIQ/ZohoSalesIQButton.jsx` - New standalone gold circle chat button for public visitors

## Decisions Made
- Tab bar only shown in conversation list view (not inside an active thread) — keeps the header clean when chatting
- `NEXT_PUBLIC_ZOHO_WIDGET_KEY` absence means graceful degradation: no Support tab in FAB, no standalone button, no console errors
- All `$zoho.salesiq.*` calls guarded with optional chaining to prevent TypeError when script hasn't loaded
- `ZohoSalesIQButton` uses `console.warn` instead of toast for "not ready yet" case — avoids toast dependency at layout level

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

During build verification (Task 1), a stale `.next` Turbopack cache caused a false build failure pointing to `register/page.jsx`. Clearing the `.next` cache resolved it. The register page issue was from in-progress stashed changes from other Phase 17 plans — not from this plan's changes.

## User Setup Required

**External services require manual configuration.**

To enable Zoho SalesIQ live chat:
1. Create a Zoho SalesIQ account at https://www.zoho.com/salesiq/
2. Go to Settings -> Brands -> Installation -> Widget Code
3. Copy the widget key from the embed snippet
4. Add to `.env.local` (and Vercel environment variables):
   ```
   NEXT_PUBLIC_ZOHO_WIDGET_KEY=your_widget_key_here
   ```
5. Restart the dev server / redeploy

Without the env var, the app runs in graceful degradation mode: no Support tab, no standalone button, no errors.

## Next Phase Readiness
- Zoho integration is complete and production-ready pending env var configuration
- Phase 17 Plan 04 can proceed — this plan has no dependencies downstream within Phase 17

---
*Phase: 17-registration-onboarding-and-misc*
*Completed: 2026-05-02*

## Self-Check: PASSED

- FOUND: ZohoSalesIQButton.jsx
- FOUND: layout.jsx (modified)
- FOUND: MessagesWidget.jsx (modified)
- FOUND: MessagesWidget.css (modified)
- FOUND: 17-03-SUMMARY.md
- FOUND: commit 310283f (Task 1)
- FOUND: commit 6f56bc3 (Task 2)
