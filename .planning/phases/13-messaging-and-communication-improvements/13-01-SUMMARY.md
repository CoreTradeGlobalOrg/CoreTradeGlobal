---
phase: 13-messaging-and-communication-improvements
plan: 01
subsystem: ui
tags: [messaging, react, nextjs, firestore, components]

# Dependency graph
requires:
  - phase: 12-notifications-and-email-system
    provides: Notification entities and repositories used in CreateConversationUseCase
provides:
  - ConversationProfileCard shared component with avatar, name, company, country, role badge
  - country field in participantDetails for new conversations
  - Profile card rendered in FAB widget and /messages/[conversationId] page
affects:
  - 13-02-messaging-improvements
  - 13-03-provider-quote-chat

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IIFE inline in JSX for derived value (otherUserId) without extracting a separate variable
    - Shared messaging component pattern for reuse across FAB widget and full-page view
    - Country field denormalization in participantDetails follows existing companyName pattern

key-files:
  created:
    - src/presentation/components/features/messaging/ConversationProfileCard/ConversationProfileCard.jsx
  modified:
    - src/domain/usecases/messaging/CreateConversationUseCase.js
    - src/presentation/components/common/MessagesWidget/MessagesWidget.jsx
    - src/app/(main)/messages/[conversationId]/page.jsx

key-decisions:
  - "ConversationProfileCard is a Next.js Link wrapping the full card — entire clickable area navigates to /profile/[otherUserId]"
  - "Profile card shown only for direct and provider_quote conversation types — contact and system types are excluded"
  - "onNavigate prop closes FAB + active conversation in widget context; null in full-page context"
  - "country field uses user.country || null fallback — existing conversations without country gracefully show no country line"

patterns-established:
  - "ConversationProfileCard accepts otherUserId + participantDetails — caller derives otherUserId via participants.find(id !== user.uid)"

requirements-completed: [MSG-01, MSG-02, MSG-03]

# Metrics
duration: 8min
completed: 2026-04-25
---

# Phase 13 Plan 01: Conversation Profile Card Summary

**Shared ConversationProfileCard component with avatar, name, company, country, and role badge rendered at the top of every direct conversation in both the FAB widget and the /messages/[conversationId] page**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-25T17:36:22Z
- **Completed:** 2026-04-25T17:44:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created ConversationProfileCard component: compact profile header with avatar (40x40), displayName + role badge on same line, companyName, country (only when truthy), full-width clickable Link to /profile/[userId]
- Added `country: user.country || null` to participantDetails in CreateConversationUseCase — new conversations now store country for display
- Integrated ConversationProfileCard into MessagesWidget FAB for direct/provider_quote conversation types, above product/RFQ/deal banners; clicking card closes FAB
- Integrated ConversationProfileCard into /messages/[conversationId] page above context banners

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ConversationProfileCard and enrich participantDetails with country** - `d4fed02` (feat)
2. **Task 2: Integrate ConversationProfileCard into FAB widget and /messages page** - `94808ae` (feat)

## Files Created/Modified
- `src/presentation/components/features/messaging/ConversationProfileCard/ConversationProfileCard.jsx` - New shared profile card component
- `src/domain/usecases/messaging/CreateConversationUseCase.js` - Added country field to participantDetails
- `src/presentation/components/common/MessagesWidget/MessagesWidget.jsx` - Added import and rendered ConversationProfileCard above context banners
- `src/app/(main)/messages/[conversationId]/page.jsx` - Added import and rendered ConversationProfileCard above context banners

## Decisions Made
- Used IIFE pattern (`(() => { ... })()`) inline in JSX to derive `otherUserId` without prop drilling or extracting a separate helper function — keeps the render tree readable
- Profile card restricted to 'direct' and 'provider_quote' types since contact/system types don't have real user profiles to navigate to
- Full card is the Next.js Link (not just the avatar or name) — provides a generous click target matching the plan spec

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ConversationProfileCard is ready for reuse in the provider quote chat sidebar (Plan 13-03)
- participantDetails country enrichment is live for all new conversations going forward
- Existing conversations without country will gracefully render without the country line

---
*Phase: 13-messaging-and-communication-improvements*
*Completed: 2026-04-25*
