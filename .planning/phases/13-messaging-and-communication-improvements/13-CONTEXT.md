# Phase 13: Messaging & Communication Improvements - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the existing messaging system with: seller/user profile visibility in chat, fix dual chat opening bug, add provider-buyer-seller messaging on quote pages, and rename provider dashboard tabs/columns per provider type. Report & block functionality is deferred (marked V2).

</domain>

<decisions>
## Implementation Decisions

### Seller/User Info Visibility
- Compact profile card header at the top of every conversation: avatar, full name, company name, country, and role badge
- Appears in BOTH the FAB widget and the /messages page
- The entire profile card is clickable and navigates to the user's profile page
- When product/RFQ context exists on a conversation, both the profile card AND the product/RFQ banner are shown (profile card on top, context banner below)

### Dual Chat Bug Fix
- The FAB widget should be hidden when the user is on the /messages page — they're redundant
- Message notifications: if user is already on /messages, open conversation there; otherwise open FAB widget
- FAB remains the quick-chat UI everywhere else in the app
- No full-page route changes needed — /messages already exists

### Provider Messaging (Quote Page Chat)
- Full sidebar chat panel on the right side of both insurance and logistics quote pages (~1/3 page width)
- Either party (provider or buyer) can initiate; chat panel always visible
- Participants: both deal parties (buyer + seller) AND the specific provider — 3-party conversation
- Buyer sees separate chat threads per provider (not one group chat) — switchable via tabs or list
- Chat sidebar appears on both the provider's quote detail page and the buyer's quote comparison page — same conversation, both views
- Reuses existing messaging infrastructure (ConversationRepository, MessageRepository, MessagesContext)

### Provider Dashboard Renaming
- Tab labels per provider type:
  - Insurance: "Insurance Requests" + "Active Policies"
  - Logistics: "Logistics Requests" + "Active Shipments"
- Kanban column labels per provider type:
  - Insurance: "New Inquiries", "Quoted", "Declined", "Policy Active"
  - Logistics: "New Requests", "Quoted", "Declined", "Shipment Active"

### Claude's Discretion
- Profile card visual design and sizing within both FAB and /messages views
- How to detect /messages route for FAB hiding (usePathname or similar)
- Chat sidebar responsive behavior on mobile
- Conversation deduplication strategy for provider chats (likely dealId + providerId composite)

</decisions>

<specifics>
## Specific Ideas

- Profile card should feel like a clickable header, not a separate section — integrated into the chat window top
- Provider chat sidebar should be similar to the legal channel 3-panel layout from Phase 5
- The dual chat bug is specifically: when on /messages and clicking a conversation, the FAB opens on top of the page

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MessagesContext` (`src/presentation/contexts/MessagesContext.jsx`): Global messaging state with real-time subscriptions, openConversation(), draft messages
- `MessagesWidget` (`src/presentation/components/common/MessagesWidget/`): FAB chat widget — needs profile card addition and /messages route hiding
- `ConversationList` + `MessageThread` + `MessageInput`: Full messaging component set in `src/presentation/components/features/messaging/`
- `ConversationRepository` + `MessageRepository`: Firestore subscriptions for conversations and messages
- `CreateConversationUseCase`: Handles deduplication by (userId1, userId2, productId?, requestId?)
- Legal channel 3-panel UI (`/deals/[dealId]/legal`): Reference pattern for quote page chat sidebar

### Established Patterns
- Conversation metadata stores context (productId, requestId, dealId, dealStatus) — extend for provider quote context
- Conversation types: 'direct', 'contact', 'advertising', 'system' — may need new type 'provider_quote'
- Real-time via Firestore subscriptions through repository pattern
- FAB widget shows product/RFQ/deal banners based on conversation metadata

### Integration Points
- Provider dashboard: `src/app/(main)/provider/dashboard/page.jsx` — TABS constant and kanban columns need conditional labels
- Quote comparison page: `src/app/(main)/deals/[dealId]/quotes/` area — needs chat sidebar integration
- Provider quote detail: `src/app/(main)/provider/quotes/[requestId]/` — needs chat sidebar integration
- /messages route: need to detect this path to hide FAB widget

</code_context>

<deferred>
## Deferred Ideas

- Report & block in messages — marked as V2 in source document. Needs its own phase with entities, repositories, use cases, and admin moderation UI.

</deferred>

---

*Phase: 13-messaging-and-communication-improvements*
*Context gathered: 2026-04-25*
