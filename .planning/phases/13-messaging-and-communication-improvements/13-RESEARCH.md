# Phase 13: Messaging and Communication Improvements - Research

**Researched:** 2026-04-22
**Domain:** React/Next.js component patterns, Firestore messaging, multi-party chat, route-aware UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Compact profile card header at the top of every conversation: avatar, full name, company name, country, and role badge
- Profile card appears in BOTH the FAB widget and the /messages/[conversationId] page
- The entire profile card is clickable and navigates to the user's profile page
- When product/RFQ context exists, both the profile card AND the product/RFQ banner are shown (profile card on top, context banner below)
- FAB widget must be hidden when the user is on the /messages page — they are redundant
- Message notifications: if user is already on /messages, open conversation there; otherwise open FAB widget
- FAB remains the quick-chat UI everywhere else in the app
- Full sidebar chat panel on the right side of both insurance and logistics quote pages (~1/3 page width)
- Either party (provider or buyer) can initiate; chat panel always visible
- Participants: buyer + seller + the specific provider — 3-party conversation
- Buyer sees separate chat threads per provider (not one group chat) — switchable via tabs or list
- Chat sidebar appears on both the provider's quote detail page and the buyer's quote comparison page — same conversation, both views
- Reuses existing messaging infrastructure (ConversationRepository, MessageRepository, MessagesContext)
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

### Deferred Ideas (OUT OF SCOPE)
- Report & block in messages — marked as V2. Needs its own phase with entities, repositories, use cases, and admin moderation UI.
</user_constraints>

---

## Summary

This phase makes targeted improvements to the existing messaging system without introducing new foundational infrastructure. All four feature areas (profile card, FAB bug fix, provider quote chat sidebar, provider dashboard renaming) are additive changes layered onto a solid, already-working Firestore messaging stack.

The biggest new piece is the provider quote chat sidebar — a 3-party conversation between buyer, seller, and a specific provider. The `CreateConversationUseCase` currently validates that `direct` conversations have exactly 2 participants. A new conversation type `'provider_quote'` is needed to allow 3 participants and to carry `dealId` + `providerId` as deduplication keys in `metadata`. The `findDirectConversation` lookup method in `ConversationRepository` will need a parallel method that matches on `(dealId, providerId)` composite context instead of userId pairs.

The profile card work is primarily a UI addition. The `participantDetails` map already stores `displayName`, `companyName`, `photoURL`, and `role` per user. The `country` field requires an extra lookup or enrichment step since it is stored on the Firestore user document (`country` code field confirmed in `registerSchema.js` and `ProfileCard.jsx`) but is not currently denormalized into `participantDetails`. The plan must account for this gap: either fetch user profile on demand when the conversation opens, or add `country` to the `participantDetails` written by `CreateConversationUseCase`.

**Primary recommendation:** Implement in 4 focused plans: (1) profile card component + FAB/messages page integration, (2) FAB hide-on-/messages + notification routing fix, (3) provider quote chat sidebar with new conversation type and use case, (4) provider dashboard tab/column renaming.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js `usePathname` | App Router built-in | Detect current route in client components | Zero-dep, correct for app router — no window.location |
| Firestore real-time subscriptions | Firebase SDK 9+ | Provider chat threads | Established pattern throughout project |
| `MessagesContext` / `useMessages` | Project-internal | Access conversation state globally | Already wired into layout; avoids prop drilling |
| `ConversationRepository` | Project-internal | CRUD + subscriptions for conversations | All existing chat flows use this |
| `CreateConversationUseCase` | Project-internal | Create/deduplicate conversations | Single point of conversation creation logic |
| Tailwind CSS | Project standard | Sidebar layout, responsive behavior | All UI in this project uses Tailwind |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/dynamic` with `ssr: false` | App Router built-in | Lazy load chat sidebar to avoid SSR issues | Provider quote pages load heavy components |
| `lucide-react` | Project standard | Icons in profile card and sidebar | Consistent with project icon usage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `usePathname` | `window.location.pathname` | `window` not available on server; `usePathname` is the correct Next.js App Router approach |
| New `'provider_quote'` type | Extending `'direct'` type | `'direct'` is validated to exactly 2 participants in `CreateConversationUseCase.validateInputs` — cannot reuse without breaking validation |
| Fetch country on conversation open | Denormalize `country` in `participantDetails` | Denormalizing at creation time is more consistent with existing pattern; on-demand fetch adds latency in the profile card |

---

## Architecture Patterns

### Recommended Plan Structure
```
Plan 13-01: Profile card component + integration into FAB and /messages/[conversationId]
Plan 13-02: FAB route-aware hiding + notification routing fix
Plan 13-03: Provider quote chat sidebar (new conversation type, use case, sidebar component)
Plan 13-04: Provider dashboard tab/column label renaming
```

### Pattern 1: Route-aware component hiding with `usePathname`
**What:** Conditionally render or suppress the FAB widget based on the current pathname.
**When to use:** Any client component that should appear/disappear based on route.
**Example:**
```jsx
// Inside MessagesWidget.jsx (or its parent layout wrapper)
'use client';
import { usePathname } from 'next/navigation';

export function MessagesWidget() {
  const pathname = usePathname();

  // Hide widget entirely on /messages and /messages/* routes
  if (pathname?.startsWith('/messages')) return null;

  // ... rest of component
}
```

### Pattern 2: Profile Card as a header sub-component
**What:** A compact card rendered at the top of a conversation view — below the back/close controls but above message content and context banners.
**When to use:** Any time `activeConversationId` is set and the conversation is a user-to-user type (not 'contact').
**Implementation note:** The card reads from `participantDetails` on the conversation object. `country` will need either a fallback fetch from `UserRepository` or enrichment at conversation creation time.

```jsx
// ConversationProfileCard.jsx — new shared component
function ConversationProfileCard({ userId, participantDetails, onClose }) {
  const details = participantDetails?.[userId] || {};
  return (
    <Link href={`/profile/${userId}`} onClick={onClose} className="...">
      {/* avatar, displayName, companyName, country badge, role badge */}
    </Link>
  );
}
```

### Pattern 3: Provider quote chat sidebar — new conversation type
**What:** A 3-participant conversation keyed by `(dealId, providerId)`. Uses a new type `'provider_quote'` to bypass the 2-participant validation in `CreateConversationUseCase`.
**When to use:** When a buyer or provider opens a quote page.
**Deduplication key:** `metadata.dealId` + `metadata.providerId` — a new `findProviderQuoteConversation(dealId, providerId)` method on `ConversationRepository`.

```js
// ConversationRepository.js — new method
async findProviderQuoteConversation(dealId, providerId) {
  const conversations = await this.firestoreDataSource.query(
    COLLECTIONS.CONVERSATIONS,
    {
      where: [
        ['type', '==', 'provider_quote'],
        ['metadata.dealId', '==', dealId],
        ['metadata.providerId', '==', providerId],
      ],
    }
  );
  return conversations[0] || null;
}
```

**Firestore index required:** composite index on `conversations`: `type` + `metadata.dealId` + `metadata.providerId`.

### Pattern 4: Provider dashboard tab/column renaming via providerType prop
**What:** The `TABS` constant in `provider/dashboard/page.jsx` and `COLUMNS` constant in `ProviderDashboard.jsx` are currently hardcoded. Replace with functions that accept `providerType` and return the correct labels.
**When to use:** Rendering tabs or kanban columns.

```jsx
// In ProviderDashboard.jsx
function getColumns(providerType) {
  if (providerType === 'insurance') {
    return [
      { key: 'newRequests', label: 'New Inquiries', ... },
      { key: 'quoted', label: 'Quoted', ... },
      { key: 'declined', label: 'Declined', ... },
      { key: 'selected', label: 'Policy Active', ... },
    ];
  }
  // logistics (default)
  return [
    { key: 'newRequests', label: 'New Requests', ... },
    { key: 'quoted', label: 'Quoted', ... },
    { key: 'declined', label: 'Declined', ... },
    { key: 'selected', label: 'Shipment Active', ... },
  ];
}

// In provider/dashboard/page.jsx
function getTabs(providerType) {
  if (providerType === 'insurance') {
    return [
      { id: 'quoteRequests', label: 'Insurance Requests' },
      { id: 'activeShipments', label: 'Active Policies' },
    ];
  }
  return [
    { id: 'quoteRequests', label: 'Logistics Requests' },
    { id: 'activeShipments', label: 'Active Shipments' },
  ];
}
```

### Anti-Patterns to Avoid
- **Using `window.location.pathname` to detect /messages route:** Not safe in Next.js App Router server context; use `usePathname` instead.
- **Extending `'direct'` type for 3-party conversations:** `CreateConversationUseCase.validateInputs` throws for `participants.length !== 2` on `'direct'` type. Using `'provider_quote'` avoids patching validation.
- **Putting profile card country in a separate Firestore fetch on every render:** Creates N+1 reads. Enrich `participantDetails` at conversation creation/update time, or fetch once and cache in component state.
- **Calling `openConversation` from the /messages page:** `openConversation` calls `setIsWidgetOpen(true)` which opens the FAB. On the /messages page this causes the dual-panel bug. Notification routing for message-type notifications must use `router.push('/messages?conversation=X')` when already on /messages, otherwise open FAB.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time multi-party chat | Custom WebSocket or polling | Firestore `subscribeToConversationMessages` in `MessageRepository` | Already works, already deployed, handles reconnection |
| Conversation deduplication | Custom client-side dedup logic | `findDirectConversation` / new `findProviderQuoteConversation` on `ConversationRepository` | Repository layer is the correct dedup boundary |
| Chat sidebar layout | Bespoke flex layout from scratch | Follow the LegalChannel 3-panel pattern (`ChannelCenter`, sidebar columns) | Project has established reference; reuse CSS patterns |
| Route detection | `window.location` or URL parsing | `usePathname` from `next/navigation` | App Router canonical approach; works in client components |

**Key insight:** The messaging infrastructure is production-quality and well-abstracted. Phase 13 is primarily UI work layered on top — the only data-layer addition is a new conversation type and a new repository lookup method.

---

## Common Pitfalls

### Pitfall 1: FAB re-opens over /messages page when notification is clicked
**What goes wrong:** A message notification click calls `openConversation(id)`, which sets `isWidgetOpen: true`. If the user is already on `/messages`, the FAB panel overlays the full-page view.
**Why it happens:** `openConversation` unconditionally sets `isWidgetOpen: true` regardless of current route.
**How to avoid:** In the notification click handler (currently in `NotificationCenterPage.jsx` line 166 and in any FCM click handler), check `pathname.startsWith('/messages')` before deciding whether to call `openConversation` or `router.push('/messages?conversation=' + conversationId)`.
**Warning signs:** Stacked chat panels; FAB visible while /messages page is also showing conversation content.

### Pitfall 2: `country` field missing from `participantDetails`
**What goes wrong:** Profile card renders "country: undefined" or crashes accessing `details.country`.
**Why it happens:** `CreateConversationUseCase` stores `displayName`, `photoURL`, `email`, `role`, `companyId`, `companyName` in `participantDetails` — but `country` is NOT currently included (confirmed by reading the use case source). The `country` field exists on user documents (confirmed in `registerSchema.js`).
**How to avoid:** Either (a) add `country: user.country || null` to the `participantDetails` written in `CreateConversationUseCase.execute`, or (b) fetch user profile on demand when the profile card renders and the `country` is absent. Option (a) is preferred — consistent with existing denormalization pattern. Note: existing conversations without `country` in their `participantDetails` will show a blank country until refreshed.
**Warning signs:** Empty country badge on profile cards for all conversations.

### Pitfall 3: `CreateConversationUseCase` validation rejects 3-party conversations
**What goes wrong:** Calling `execute({ type: 'direct', participantIds: [buyerId, sellerId, providerId] })` throws "Direct conversations require exactly 2 participants".
**Why it happens:** Line 170 in `CreateConversationUseCase.js` — `if (type === 'direct' && participantIds.length !== 2) throw`.
**How to avoid:** Use `type: 'provider_quote'` for the new 3-party conversations. Update `validateInputs` to allow `'provider_quote'` type with 3 participants, and add `'provider_quote'` to the `validTypes` array.
**Warning signs:** Runtime error when attempting to open provider quote chat for first time.

### Pitfall 4: Duplicate provider_quote conversations
**What goes wrong:** Multiple conversations created for the same (dealId, providerId) pair when both the buyer and the provider attempt to open the chat.
**Why it happens:** Both sides call `findProviderQuoteConversation` concurrently; if neither finds an existing doc, both create a new one.
**How to avoid:** Use a deterministic Firestore document ID for provider_quote conversations: `providerquote_${dealId}_${providerId}`. Use `firestoreDataSource.setIfNotExists` (or `runTransaction` with existence check) instead of `create` for this type. This is the same idempotency pattern used in `confirmInsuranceCoverage` (Phase 06-01 decision).
**Warning signs:** Provider and buyer see different conversation threads; messages not shared.

### Pitfall 5: FAB and /messages showing simultaneously due to `isWidgetOpen` persisting across navigation
**What goes wrong:** User has FAB open, navigates to /messages — FAB panel is still rendered on top.
**Why it happens:** `isWidgetOpen` state in `MessagesContext` persists across route changes since the context is mounted at the layout level.
**How to avoid:** The `MessagesWidget` already returns `null` if not authenticated; extend this guard: return `null` when `pathname?.startsWith('/messages')`. This is purely a render-level guard — no state reset needed.

### Pitfall 6: Provider dashboard tab labels not updating for admin role
**What goes wrong:** Admin sees "Quote Requests" + "Active Shipments" instead of provider-type-specific labels.
**Why it happens:** Admin uses the logistics view by default (`providerType = user.role === ROLES.INSURANCE_PROVIDER ? 'insurance' : 'logistics'` — admin falls through to logistics). The TABS constant is currently hardcoded before role detection.
**How to avoid:** Compute `getTabs(providerType)` after `providerType` is derived from `user.role`. Admin will see logistics labels by default, which is the existing behavior for admin on this dashboard.

---

## Code Examples

### Detecting /messages route in MessagesWidget
```jsx
// Source: Next.js App Router docs — usePathname
'use client';
import { usePathname } from 'next/navigation';
import { useMessages } from '@/presentation/contexts/MessagesContext';

export function MessagesWidget() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Hide FAB on /messages and all sub-routes
  if (!isAuthenticated || pathname?.startsWith('/messages')) return null;

  // ... existing render
}
```

### Profile card header in conversation view
```jsx
// New: ConversationProfileCard.jsx — used in both MessagesWidget and /messages/[conversationId]
'use client';
import Link from 'next/link';

export function ConversationProfileCard({ userId, participantDetails, onNavigate }) {
  const details = participantDetails?.[userId] || {};
  const initial = (details.displayName || details.email || '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/profile/${userId}`}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[#1E2D3D] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {details.photoURL
          ? <img src={details.photoURL} alt={details.displayName} className="w-full h-full object-cover" />
          : <span className="text-white font-semibold text-sm">{initial}</span>
        }
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm truncate">{details.displayName}</span>
          {details.role && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[rgba(255,215,0,0.3)] flex-shrink-0">
              {details.role}
            </span>
          )}
        </div>
        {details.companyName && (
          <span className="text-[#94a3b8] text-xs truncate block">{details.companyName}</span>
        )}
        {details.country && (
          <span className="text-[#6b7a8d] text-xs">{details.country}</span>
        )}
      </div>
    </Link>
  );
}
```

### Provider quote conversation creation (deterministic ID pattern)
```js
// Source: Phase 06-01 decision — deterministic doc ID for idempotency
// In a new CreateProviderQuoteConversationUseCase or extended CreateConversationUseCase

const deterministicId = `providerquote_${dealId}_${providerId}`;

// Use setIfNotExists / transaction to prevent duplicates
await this.conversationRepository.createWithId(deterministicId, {
  type: 'provider_quote',
  participants: [buyerId, sellerId, providerId],
  participantDetails: { /* fetch all 3 */ },
  metadata: { dealId, providerId, providerType },
  unreadCount: { [buyerId]: 0, [sellerId]: 0, [providerId]: 0 },
  lastMessage: null,
});
```

### Provider dashboard tab labels (conditional)
```jsx
// In provider/dashboard/page.jsx — replace hardcoded TABS constant
function getTabs(providerType) {
  return providerType === 'insurance'
    ? [
        { id: 'quoteRequests', label: 'Insurance Requests' },
        { id: 'activeShipments', label: 'Active Policies' },
      ]
    : [
        { id: 'quoteRequests', label: 'Logistics Requests' },
        { id: 'activeShipments', label: 'Active Shipments' },
      ];
}

// Usage — providerType is derived before tabs are rendered
const tabs = getTabs(providerType);
```

### Provider dashboard kanban column labels (conditional)
```jsx
// In ProviderDashboard.jsx — replace hardcoded COLUMNS constant
function getColumns(providerType) {
  const shared = { quoted: 'Quoted', declined: 'Declined' };
  if (providerType === 'insurance') {
    return [
      { key: 'newRequests', label: 'New Inquiries', dotColor: 'bg-yellow-400', emptyText: 'No new inquiries' },
      { key: 'quoted', label: shared.quoted, dotColor: 'bg-blue-400', emptyText: 'No quoted requests' },
      { key: 'declined', label: shared.declined, dotColor: 'bg-gray-400', emptyText: 'No declined requests' },
      { key: 'selected', label: 'Policy Active', dotColor: 'bg-green-400', emptyText: 'No active policies' },
    ];
  }
  return [
    { key: 'newRequests', label: 'New Requests', dotColor: 'bg-yellow-400', emptyText: 'No new requests' },
    { key: 'quoted', label: shared.quoted, dotColor: 'bg-blue-400', emptyText: 'No quoted requests' },
    { key: 'declined', label: shared.declined, dotColor: 'bg-gray-400', emptyText: 'No declined requests' },
    { key: 'selected', label: 'Shipment Active', dotColor: 'bg-green-400', emptyText: 'No active shipments' },
  ];
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 2-participant `'direct'` type | Extend with `'provider_quote'` type (3 participants) | Phase 13 | Enables multi-party provider chat without breaking existing conversations |
| participantDetails without `country` | Add `country` field to denormalized participantDetails | Phase 13 | Enables profile card country display without extra fetch |
| TABS and COLUMNS as module-level constants | Functions returning arrays based on `providerType` | Phase 13 | Dashboard correctly labels per provider type |

**Deprecated/outdated:**
- The TABS constant at module scope in `provider/dashboard/page.jsx` will be replaced by a `getTabs(providerType)` function — the constant is read before `providerType` is derived in the current code.

---

## Integration Points (Files to Modify)

| File | Change |
|------|--------|
| `src/presentation/components/common/MessagesWidget/MessagesWidget.jsx` | Add `usePathname` guard; add `ConversationProfileCard` in header when conversation active |
| `src/app/(main)/messages/[conversationId]/page.jsx` | Add `ConversationProfileCard` in header |
| `src/presentation/contexts/MessagesContext.jsx` | No change needed; `openConversation` behavior is fine as-is since FAB is hidden on /messages |
| `src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterPage.jsx` | Fix notification click for message type — push to `/messages?conversation=X` instead of `/messages` |
| `src/domain/usecases/messaging/CreateConversationUseCase.js` | Add `country` to participantDetails; add `'provider_quote'` to validTypes; allow 3 participants for that type |
| `src/data/repositories/ConversationRepository.js` | Add `findProviderQuoteConversation(dealId, providerId)` and `createWithId(id, data)` methods |
| `src/app/(main)/provider/dashboard/page.jsx` | Replace static `TABS` with `getTabs(providerType)` function |
| `src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx` | Replace static `COLUMNS` with `getColumns(providerType)` function |
| `src/app/(main)/deals/[dealId]/quotes/page.jsx` | Add `ProviderQuoteChatSidebar` to the right side of `QuotesPage` |
| `src/app/(main)/provider/quotes/[requestId]/page.jsx` | Add `ProviderQuoteChatSidebar` |
| `src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx` | Accept and render `chatSidebar` prop slot or restructure layout for sidebar |

**New files to create:**
| File | Purpose |
|------|---------|
| `src/presentation/components/features/messaging/ConversationProfileCard/ConversationProfileCard.jsx` | Shared profile card component |
| `src/presentation/components/features/messaging/ProviderQuoteChatSidebar/ProviderQuoteChatSidebar.jsx` | Provider quote chat sidebar (list of provider threads + active thread) |
| `src/domain/usecases/messaging/CreateProviderQuoteConversationUseCase.js` | (Optional) Separate use case for 3-party provider conversation creation |

---

## Open Questions

1. **Country field for existing conversations**
   - What we know: `country` is stored on user documents but not currently in `participantDetails`. All existing `direct` conversations lack this field.
   - What's unclear: Should we backfill existing `participantDetails` with `country`? Or just add it for new conversations going forward?
   - Recommendation: Add `country` to new conversations only. Profile card renders with graceful fallback (omit country line if null). A migration script for existing conversations is out of scope for Phase 13.

2. **ConversationRepository `createWithId` method**
   - What we know: The existing `create` method generates a random Firestore document ID. There is no `createWithId` method.
   - What's unclear: Does `FirestoreDataSource` support `set(docRef, data)` (Firestore's idempotent write)?
   - Recommendation: Check `FirestoreDataSource.js` before planning. If it has a `set` or `createWithId` method, use it. If not, add one — it is a 3-line wrapper around `firestoreDb.doc(path).set(data, { merge: false })`.

3. **Buyer-side provider chat tab UI for multiple providers**
   - What we know: Buyer sees separate chat threads per provider, switchable via tabs or list.
   - What's unclear: On the `/deals/[dealId]/quotes` page, should the sidebar show a tab per provider or a list with active selection?
   - Recommendation: List with active selection (like ConversationList pattern) is simpler and scales to N providers. Use tabs only if there are guaranteed to be exactly 2 providers (insurance + logistics).

---

## Validation Architecture

> `nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No automated test framework detected in this project |
| Config file | None found |
| Quick run command | Manual browser testing |
| Full suite command | Manual browser testing |

### Phase Requirements → Test Map
| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| MSG-01 | Profile card renders in FAB widget with avatar, name, company, country, role | manual | n/a | n/a |
| MSG-02 | Profile card renders on /messages/[conversationId] page | manual | n/a | n/a |
| MSG-03 | Profile card click navigates to /profile/[userId] | manual | n/a | n/a |
| MSG-04 | FAB widget is hidden when pathname starts with /messages | manual | n/a | n/a |
| MSG-05 | Message notification click on /messages page pushes to /messages?conversation=X | manual | n/a | n/a |
| MSG-06 | Provider quote chat sidebar is visible on /deals/[dealId]/quotes | manual | n/a | n/a |
| MSG-07 | Provider quote chat sidebar is visible on /provider/quotes/[requestId] | manual | n/a | n/a |
| MSG-08 | Both buyer and provider sides share the same conversation thread | manual | n/a | n/a |
| MSG-09 | Provider dashboard shows "Insurance Requests" / "Active Policies" for insurance role | manual | n/a | n/a |
| MSG-10 | Provider dashboard shows "Logistics Requests" / "Active Shipments" for logistics role | manual | n/a | n/a |
| MSG-11 | Kanban columns show correct labels per provider type | manual | n/a | n/a |

### Sampling Rate
- **Per task commit:** Manual smoke test of changed component
- **Per wave merge:** Full manual walkthrough of all MSG-XX scenarios
- **Phase gate:** All MSG-XX scenarios passing before `/gsd:verify-work`

### Wave 0 Gaps
None — no test infrastructure exists in this project; all verification is manual.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct reads — `MessagesContext.jsx`, `MessagesWidget.jsx`, `ConversationRepository.js`, `CreateConversationUseCase.js`, `Conversation.js`, `/messages/page.jsx`, `/messages/[conversationId]/page.jsx`, `provider/dashboard/page.jsx`, `ProviderDashboard.jsx`, `LegalChannel.jsx`, `/deals/[dealId]/quotes/page.jsx`, `/provider/quotes/[requestId]/page.jsx`
- `src/core/validation/registerSchema.js` — confirmed `country` field in user registration
- `src/app/(main)/profile/[userId]/ProfileCard.jsx` — confirmed `country` field on user documents
- `.planning/phases/13-messaging-and-communication-improvements/13-CONTEXT.md` — user decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` accumulated decisions — Phase patterns for deterministic IDs and idempotency

---

## Metadata

**Confidence breakdown:**
- Profile card feature: HIGH — all data fields confirmed present in codebase (except `country` gap documented)
- FAB hide-on-/messages: HIGH — `usePathname` is the standard App Router hook, pattern is straightforward
- Provider quote chat sidebar: HIGH — conversation infrastructure is solid; only new piece is `'provider_quote'` type and `findProviderQuoteConversation`
- Provider dashboard renaming: HIGH — TABS and COLUMNS constants confirmed in source, change is mechanical

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable codebase, no fast-moving dependencies)
