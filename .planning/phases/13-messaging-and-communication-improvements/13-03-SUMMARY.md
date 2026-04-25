---
phase: 13-messaging-and-communication-improvements
plan: 03
subsystem: ui
tags: [messaging, quote, chat, provider, firestore, react, nextjs]

# Dependency graph
requires:
  - phase: 13-messaging-and-communication-improvements
    plan: 01
    provides: ConversationProfileCard component
  - phase: 04-insurance-and-logistics-quotes
    provides: QuoteRequest entity with buyerId/sellerId, quote pages
provides:
  - ProviderQuoteChatSidebar component for quote pages
  - provider_quote conversation type with 3-party support
  - Deterministic conversation ID deduplication (providerquote_${dealId}_${providerId})
  - ConversationRepository.createWithId, findProviderQuoteConversation, getProviderQuoteConversationsForDeal
affects:
  - /deals/[dealId]/quotes buyer quote comparison page
  - /provider/quotes/[requestId] provider quote detail page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Self-contained sidebar message thread that does not use global MessagesContext — avoids FAB widget conflict
    - Lazy dynamic import of SendMessageUseCase inside InlineMessageInput.handleSend — avoids circular import issues
    - Deterministic Firestore document ID pattern (providerquote_${dealId}_${providerId}) for idempotent conversation creation
    - Sticky sidebar layout with paddingTop=var(--navbar-height) + height=100vh for full-height chat panel

key-files:
  created:
    - src/presentation/components/features/quote/ProviderQuoteChatSidebar/ProviderQuoteChatSidebar.jsx
  modified:
    - src/domain/usecases/messaging/CreateConversationUseCase.js
    - src/data/repositories/ConversationRepository.js
    - src/app/(main)/deals/[dealId]/quotes/page.jsx
    - src/app/(main)/provider/quotes/[requestId]/page.jsx
    - firestore.indexes.json

key-decisions:
  - "ProviderQuoteChatSidebar is self-contained with its own message subscription — does not rely on global MessagesContext to avoid interfering with FAB widget activeConversationId"
  - "Sidebar hidden below xl breakpoint (hidden xl:flex) — preserves mobile layout on both quote pages"
  - "InlineMessageInput creates the conversation on first message send via CreateConversationUseCase — no pre-creation needed"
  - "Provider view auto-looks up conversation via deterministic ID (providerquote_${dealId}_${providerId}) on mount"
  - "Two Firestore composite indexes added: (type + metadata.dealId + metadata.providerId) and (type + metadata.dealId)"

requirements-completed: [MSG-06, MSG-07, MSG-08]

# Metrics
duration: 3min
completed: 2026-04-25
---

# Phase 13 Plan 03: Provider Quote Chat Sidebar Summary

**3-party provider-buyer-seller chat sidebar on both quote pages using deterministic conversation IDs and a self-contained message thread that does not conflict with the FAB widget**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-25T17:40:18Z
- **Completed:** 2026-04-25T17:43:44Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 created)

## Accomplishments

- Added `provider_quote` conversation type to CreateConversationUseCase with 3-participant validation and deterministic ID deduplication (`providerquote_${dealId}_${providerId}`)
- Added `createWithId`, `findProviderQuoteConversation`, and `getProviderQuoteConversationsForDeal` methods to ConversationRepository
- Added two composite Firestore indexes for the new provider_quote queries
- Created ProviderQuoteChatSidebar component:
  - **Buyer view**: loads all provider_quote conversations for the deal, shows provider selector list, switches to thread view on selection
  - **Provider view**: auto-loads their single conversation via deterministic ID, shows thread directly
  - Reuses ConversationProfileCard from Plan 13-01 at the top of each active thread
  - Self-contained real-time message subscription (not tied to global MessagesContext)
  - InlineMessageThread with own/other bubble styles + date-independent rendering
  - InlineMessageInput creates conversation on first message send; subsequent messages go to existing conversation
- Integrated sidebar into `/deals/[dealId]/quotes` — sticky right panel, visible on xl+
- Integrated sidebar into `/provider/quotes/[requestId]` — provider's single thread with deal parties

## Task Commits

Each task was committed atomically:

1. **Task 1: Add provider_quote type, createWithId, and Firestore indexes** - `c93beb7` (feat)
2. **Task 2: Build ProviderQuoteChatSidebar and integrate into both quote pages** - `6ca9f86` (feat)

## Files Created/Modified

- `src/presentation/components/features/quote/ProviderQuoteChatSidebar/ProviderQuoteChatSidebar.jsx` — New component, 350+ lines
- `src/domain/usecases/messaging/CreateConversationUseCase.js` — Added provider_quote type handling + validateInputs update
- `src/data/repositories/ConversationRepository.js` — Added createWithId, findProviderQuoteConversation, getProviderQuoteConversationsForDeal
- `src/app/(main)/deals/[dealId]/quotes/page.jsx` — Wrapped in flex row, added sidebar
- `src/app/(main)/provider/quotes/[requestId]/page.jsx` — Wrapped in flex row, added sidebar
- `firestore.indexes.json` — Added 2 composite indexes for provider_quote queries

## Decisions Made

- Self-contained sidebar avoids global MessagesContext to prevent FAB widget interference — the global context tracks `activeConversationId` which drives the FAB; hijacking it from the sidebar would cause the FAB to open or show the wrong conversation
- Dynamic import of SendMessageUseCase inside `handleSend` avoids potential circular dependency issues at module load time
- Sidebar uses `hidden xl:flex` — consistent with the app's existing responsive breakpoint pattern; sidebar not shown on mobile to keep the quote comparison readable

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

The only noteworthy implementation choice: the plan said to "Reuse existing MessageThread and MessageInput components." However, `MessageThread` reads `activeMessages` from `useMessages()` (global MessagesContext), and `MessageInput` uses `useSearchParams()` which requires Suspense. Both were designed for the FAB widget and /messages page context. Using them directly in the sidebar would require globally setting `activeConversationId`, which would open the FAB widget. Instead, self-contained inline variants (`InlineMessageThread`, `InlineMessageInput`) were built inside the component file — same UX, no global state side effects. This is consistent with Rule 1 (auto-fix) since using the originals would have caused broken behavior.

## Issues Encountered

None.

## User Setup Required

Deploy Firestore indexes after this plan:
```bash
firebase deploy --only firestore:indexes
```

The two new indexes (type + metadata.dealId + metadata.providerId) and (type + metadata.dealId) are needed for `findProviderQuoteConversation` and `getProviderQuoteConversationsForDeal` queries to work in production.

## Next Phase Readiness

- provider_quote conversation type is live and deduplication-safe
- ConversationRepository has all methods needed for future admin views of provider conversations
- Sidebar is ready for further enhancements (unread badge on provider selector, mobile slide-out drawer)

---
*Phase: 13-messaging-and-communication-improvements*
*Completed: 2026-04-25*
