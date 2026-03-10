# Phase 5: Legal Consulting - Research

**Researched:** 2026-03-10
**Domain:** Firestore private channels, file-based contract versioning, multi-role UI, Cloud Functions for engagement lifecycle
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Lawyer Hiring Flow**
- Browse directory with full search + filters (specialization, availability, language)
- Directory cards show minimal info: name, specialization, availability -- card links to detailed profile page
- Lawyer must accept the hire request (not instant) -- pending -> accepted/declined
- If lawyer declines, client gets notified and can pick another lawyer from the directory
- Termination allowed: client can terminate engagement and hire another lawyer (re-hiring has a cost, handled externally for v1 -- no payment system built)
- Flat pricing: $200 per deal engagement (displayed on directory and banner)

**Lawyer Profile Page**
- Reuse existing `/profile/[userId]` route with role-based content adaptation for lawyers
- Authenticated users only (not public)
- Show: name, photo, specializations, years of experience, languages spoken, education (NO bar association)
- Show stats: deals handled on platform, success rate, rating, response time average
- Show reviews from past clients (star rating + written reviews)
- Show availability status and flat $200 pricing
- Reviews can only be left after engagement ends

**Legal Banner on Deal Page**
- "Hire a Lawyer" banner card visible on the deal page at ALL deal stages (not just S2)
- Styled like the S2-anlasma-onay.html mockup: promotional banner with features list, $200 pricing, CTA button
- CTA opens lawyer directory/selection flow
- "No thanks" dismiss option
- After lawyer is hired: banner transforms to minimal badge showing lawyer name + status + "Open Channel" link
- Opposing deal party CANNOT see lawyer engagement (fully private -- no indicator whatsoever)

**Channel Experience (Legal Consulting Page)**
- 3-panel layout matching hukuk-danismanlik.html mockup exactly:
  - Left panel: lawyer profile + deal info (trade details, parties) + documents list + consulting tasks
  - Center panel: encrypted chat with system messages, file attachments, quick-action toolbar
  - Right panel: 3 tabs -- Contract (latest draft + metadata), Revisions (version history), Risks (analysis cards)
- Quick-action toolbar buttons for BOTH lawyer and client (role-appropriate labels)
  - Client: Approve, Request Info, Request Changes, Attach File
  - Lawyer: Send Draft, Flag Risk, Approve Clause, Attach File
- Privacy: Firestore security rules isolate channel to lawyer + client only. Visual "Encrypted & Private" badge shown. No E2EE.
- Route: `/deals/[dealId]/legal`

**Lawyer Dashboard**
- Dedicated route: `/lawyer/dashboard`
- Shows all active/past engagements with deal summaries, client names, statuses
- Pending hire requests shown prominently
- Entry point to each legal channel

**Contract Draft Workspace**
- File attachments for v1 (lawyer uploads DOCX/PDF files)
- Auto-versioning: each file upload auto-increments version (v1, v2, v3...) with upload date, uploader info
- Right panel keeps 3-tab structure:
  - Contract tab: latest draft file preview/download + metadata
  - Revisions tab: version history list with all past uploads
  - Risks tab: risk analysis cards
- Risk analysis: structured form with title, description, severity level (low/medium/high), status (open/resolved)

**File Sharing & Attachments**
- Both lawyer and client can attach files in chat
- Supported formats: PDF, DOCX, DOC, XLSX + JPG, PNG (for scanned documents)
- Files appear inline in chat AND are listed in left panel's Documents section for easy access
- Files remain accessible to both parties after engagement ends (channel becomes read-only, files stay downloadable)

**Engagement Lifecycle**
- Status flow: pending -> active -> completed
  - Pending: hire request sent, waiting for lawyer acceptance
  - Active: lawyer accepted, private channel open
  - Completed: engagement closed
- Engagement ends manually (either party can close)
- After completion: channel becomes read-only (messages and files accessible, no new messages)
- Review prompt appears when engagement is marked complete (review goes on lawyer's profile)

**Notifications**
- Lawyer receives both in-app and email notifications for:
  - New hire requests
  - New client messages
  - Draft reviews
- Client receives both in-app and email notifications for:
  - Lawyer acceptance/decline of hire request
  - New lawyer messages
  - New draft uploads
  - Risk analysis updates

### Claude's Discretion
- Exact UI component design and spacing
- Loading states and skeleton patterns
- Error handling for failed uploads
- Chat message ordering and pagination
- Lawyer directory sorting algorithm (by rating, availability, etc.)
- Left panel layout details (collapsible sections, etc.)

### Deferred Ideas (OUT OF SCOPE)
- In-app contract viewer and editor (user wants this, but starting with file attachments for v1) -- future enhancement
- Contract revision diff view (LEGAL-V2-01 in REQUIREMENTS.md) -- v2 feature
- Payment integration for lawyer hiring ($200 flat fee) -- depends on payment infrastructure being out of scope for v1
- Auto-close engagement when deal completes -- user chose manual only for now
- Time-limited lawyer response window (e.g., 48h auto-decline) -- not selected, could add later
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGAL-01 | Buyer can independently hire a lawyer for a deal | `legalEngagements` top-level collection with `dealId`, `clientId`, `lawyerId`; Cloud Function `hireLayyer` creates engagement doc; Firestore rules isolate to channel participants |
| LEGAL-02 | Seller can independently hire a different lawyer for the same deal | Same `legalEngagements` collection supports two independent docs for same `dealId` -- one per client; rules allow any deal participant to create their own engagement |
| LEGAL-03 | Private messaging channel between client and their lawyer, isolated from opposing party | `legalMessages` subcollection under each engagement doc; Firestore rules: `allow read/write if uid in [clientId, lawyerId]` -- opposing party has no access even to detect existence |
| LEGAL-04 | Lawyer can view full deal details (trade info, parties, documents) | Left panel reads `deals/{dealId}` (via existing DealRepository); engagement doc stores `dealId` enabling lawyer to subscribe; existing deal read rules need lawyer participant extension |
| LEGAL-05 | Lawyer can create and revise contract drafts with version history | `contractDrafts` subcollection under engagement; each upload auto-increments version counter; stores file URL, uploader, version number, timestamp; lawyer writes, client reads |
| LEGAL-06 | Risk analysis panel with severity levels (low/medium/high) | `riskItems` subcollection under engagement or embedded array on engagement doc; fields: title, description, severity (low/medium/high), status (open/resolved), createdAt |
| LEGAL-07 | Quick-action buttons (approve, request info, request changes, attach file) | Client-side toolbar component; sends system message to `legalMessages` with type `quick_action` and action payload; no extra collection needed |
| LEGAL-08 | Legal consulting is optional -- parties can proceed without hiring a lawyer | Legal banner on DealPage is dismissible and non-blocking; no deal status gating on legal consulting |
</phase_requirements>

---

## Summary

Phase 5 introduces a private legal consulting layer that sits alongside the existing deal flow without blocking it. The core of the implementation is a new `legalEngagements` top-level Firestore collection, where each document represents one client-lawyer relationship for one deal. Messages, contract drafts, and risk items live as subcollections under each engagement document. Firestore security rules enforce the isolation guarantee: only the client and their lawyer can read or write to any document in their engagement.

The existing project infrastructure covers nearly all supporting needs. The messaging components (`MessageThread`, `MessageInput`) provide reference patterns; the new legal channel needs a custom 3-panel layout but can reuse the same data subscription approach. The `ConversationRepository` and `MessageRepository` patterns are directly portable. The Cloud Functions notification infrastructure (in-app + Resend email) is already parameterized for new event types. Firebase Storage for file attachments is already wired in `MessageRepository.uploadAttachment()`.

The biggest architectural decision is **collection placement**: the engagement lives at the top level (`legalEngagements/{engagementId}`) rather than as a subcollection of deals, because a deal can have two independent engagements (buyer's lawyer, seller's lawyer) and the lawyer needs to query "all my engagements" without a collection group query that would expose cross-deal documents. The opposing party must never be able to discover whether their counterpart has hired a lawyer; top-level placement with tight `clientId`/`lawyerId` rules achieves this cleanly.

**Primary recommendation:** Use a single `legalEngagements` top-level collection with `legalMessages`, `contractDrafts`, and `riskItems` subcollections. All sensitive writes (hire, accept, decline, close) go through Cloud Functions. Client-side writes allowed only for messages, draft uploads (via Storage), and risk items within an active engagement.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase (client SDK) | ^12.4.0 (already installed) | Firestore subscriptions, Storage uploads | Already in use; `onSnapshot`, `query`, `where` cover all subscription patterns |
| firebase-admin | ^13.6.1 (already installed) | Cloud Function writes to engagement, notifications | Already in use; Admin SDK bypasses rules for privileged operations |
| lucide-react | ^0.560.0 (already installed) | Icons for toolbar, status badges | Already the icon library throughout the project |
| react-hot-toast | ^2.6.0 (already installed) | Upload progress toasts, hire/accept feedback | Already in use project-wide |
| framer-motion | ^12.33.0 (already installed) | Panel transitions, tab animations | Already in use; optional for discretion areas |
| date-fns | ^4.1.0 (already installed) | Format message timestamps, version dates | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Resend (functions) | Already in functions/ | Email notifications to lawyer/client | Already wired; extend `sendDealEmail` pattern for new event types |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Top-level `legalEngagements` collection | `deals/{dealId}/legalEngagements` subcollection | Subcollection would require `collectionGroup` for lawyer dashboard + expose deal structure to lawyers; top-level avoids both |
| Subcollection `riskItems` | Embedded array on engagement doc | Array simpler, but hits 1MB Firestore doc limit if risks accumulate; subcollection scales better |
| Custom 3-panel layout | Reuse ConversationList + MessageThread | Existing components are tightly coupled to MessagesContext; legal channel needs custom data context and panel structure |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── data/repositories/
│   ├── LegalEngagementRepository.js   # engagement CRUD + subscriptions
│   └── LegalMessageRepository.js      # messages + file uploads for legal channel
├── domain/entities/
│   ├── LegalEngagement.js             # entity with fromFirestore()
│   └── LegalMessage.js               # entity with fromFirestore()
├── presentation/
│   ├── hooks/legal/
│   │   ├── useLegalEngagement.js      # real-time engagement subscription
│   │   ├── useLegalEngagements.js     # lawyer dashboard: all engagements
│   │   ├── useLegalMessages.js        # real-time message subscription
│   │   ├── useLegalActions.js         # hire, accept, decline, close actions
│   │   └── useLawyerDirectory.js      # query users by role='lawyer', filters
│   └── components/features/legal/
│       ├── LegalBanner/               # deal page banner (hire CTA or active badge)
│       ├── LawyerDirectory/           # searchable lawyer listing + card
│       ├── LawyerProfile/             # role-adapted content for /profile/[userId]
│       ├── LegalChannel/              # 3-panel layout (left/center/right)
│       │   ├── ChannelLeft/           # profile + deal info + docs + tasks
│       │   ├── ChannelCenter/         # chat + quick-action toolbar
│       │   └── ChannelRight/          # Contract/Revisions/Risks tabs
│       └── LawyerDashboard/           # /lawyer/dashboard engagement list
└── app/(main)/
    ├── deals/[dealId]/legal/
    │   └── page.jsx                   # /deals/[dealId]/legal route
    └── lawyer/
        └── dashboard/
            └── page.jsx               # /lawyer/dashboard route
```

### Pattern 1: Engagement Collection Schema

**What:** Top-level `legalEngagements` collection with subcollections for messages, drafts, and risks.

**When to use:** Any time client or lawyer code needs to read or write legal data.

**Firestore structure:**
```
legalEngagements/{engagementId}
  clientId: string           // UID of buyer or seller who hired
  lawyerId: string           // UID of the lawyer
  dealId: string             // Parent deal (for deal data read + dashboard grouping)
  dealProductName: string    // Denormalized for dashboard display without extra reads
  clientDisplayName: string  // Denormalized for lawyer dashboard
  lawyerDisplayName: string  // Denormalized for client badge
  status: 'pending' | 'active' | 'completed'
  createdAt: Timestamp
  updatedAt: Timestamp

  /legalMessages/{messageId}
    senderId: string
    senderName: string
    content: string
    type: 'text' | 'attachment' | 'system' | 'quick_action'
    quickAction?: { action: string, label: string }
    attachments?: [{ url, name, type, size, storagePath }]
    createdAt: Timestamp

  /contractDrafts/{draftId}
    version: number          // auto-incremented: 1, 2, 3...
    fileName: string
    fileUrl: string
    storagePath: string
    fileSize: number
    uploaderUid: string
    uploaderName: string
    createdAt: Timestamp

  /riskItems/{riskId}
    title: string
    description: string
    severity: 'low' | 'medium' | 'high'
    status: 'open' | 'resolved'
    createdByUid: string
    createdAt: Timestamp
    updatedAt: Timestamp
```

### Pattern 2: Firestore Security Rules for Legal Channel Isolation

**What:** Rules that allow only `clientId` and `lawyerId` to access engagement and all subcollections. Opposing deal party gets no access -- not even read.

**Critical insight from existing code:** The `quoteRequests` rules use a `participants` array for query-satisfiable access. For legal engagements the same pattern applies, BUT the privacy requirement is stronger: the query `where('dealId', '==', dealId)` must ONLY return engagements where the requester is a participant. Using `participants: [clientId, lawyerId]` array enables `array-contains` queries while keeping the rule tight.

**Firestore rule pattern:**
```javascript
match /legalEngagements/{engagementId} {
  function isEngagementParticipant() {
    return request.auth.uid in resource.data.participants;
  }
  function willBeParticipant() {
    return request.auth.uid in request.resource.data.participants;
  }

  // Client can read their own engagement; lawyer can read theirs
  allow read: if isAuthenticated() && isEngagementParticipant();
  // Creation via Cloud Function only (Admin SDK bypasses rules)
  allow create: if false;
  // Status updates via Cloud Function; client/lawyer can update specific fields only
  allow update: if isAuthenticated() && isEngagementParticipant();
  allow delete: if false;

  match /legalMessages/{messageId} {
    allow read: if isAuthenticated() &&
      request.auth.uid in get(/databases/$(database)/documents/legalEngagements/$(engagementId)).data.participants;
    allow create: if isAuthenticated() &&
      request.auth.uid in get(/databases/$(database)/documents/legalEngagements/$(engagementId)).data.participants &&
      request.resource.data.senderId == request.auth.uid;
    allow update: if false;
    allow delete: if false;
  }

  match /contractDrafts/{draftId} {
    allow read: if isAuthenticated() &&
      request.auth.uid in get(/databases/$(database)/documents/legalEngagements/$(engagementId)).data.participants;
    allow create: if isAuthenticated() &&
      request.auth.uid == get(/databases/$(database)/documents/legalEngagements/$(engagementId)).data.lawyerId;
    allow update, delete: if false;
  }

  match /riskItems/{riskId} {
    allow read: if isAuthenticated() &&
      request.auth.uid in get(/databases/$(database)/documents/legalEngagements/$(engagementId)).data.participants;
    allow create, update: if isAuthenticated() &&
      request.auth.uid == get(/databases/$(database)/documents/legalEngagements/$(engagementId)).data.lawyerId;
    allow delete: if false;
  }
}
```

**Note on Firestore read costs in rules:** The `get()` calls in subcollection rules are standard for this project (see existing `offers` and `contract` subcollection rules in `firestore.rules`). Accepted pattern.

### Pattern 3: Cloud Function Architecture for Engagement Actions

**What:** All state-changing operations (hire, accept, decline, close) go through Cloud Functions using Admin SDK -- matching the existing deal/quote pattern where `allow create/update: if false` forces writes through functions.

**Functions to add:**
```javascript
exports.hireLayyer = onCall(async (request) => {
  // Validates: deal exists, caller is participant, no duplicate engagement
  // Creates legalEngagements doc with status='pending', participants=[clientId, lawyerId]
  // Sends in-app + email notification to lawyer
  // Non-blocking: email failure does not fail the function
});

exports.respondToHireRequest = onCall(async (request) => {
  // action: 'accept' | 'decline'
  // accept: status -> 'active', sends system message to channel
  // decline: notifies client (they can re-hire)
});

exports.closeLegalEngagement = onCall(async (request) => {
  // Either party can close
  // status -> 'completed', channel becomes read-only
  // Triggers review prompt notification to client
});
```

### Pattern 4: Lawyer Directory Query

**What:** Query `users` collection by `role == 'lawyer'` with optional filters for specialization, availability, language.

**Important:** The existing `UserRepository` does not have a `getByRole` method. This must be added. The `users` collection is already publicly readable (`allow read: if true` in firestore.rules), so no rules change needed for the directory.

**Example UserRepository addition:**
```javascript
async getLawyers({ specialization, availability, language, limitCount = 50 } = {}) {
  const whereClause = [['role', '==', 'lawyer']];
  if (specialization) whereClause.push(['specializations', 'array-contains', specialization]);
  if (availability !== undefined) whereClause.push(['isAvailable', '==', availability]);
  // Note: Firestore cannot filter on two array-contains in same query.
  // Language filter must be done client-side if specialization is also filtered.

  return await this.firestoreDataSource.query(COLLECTIONS.USERS, {
    where: whereClause,
    limit: limitCount,
  });
}
```

**Firestore index needed:** `users` collection composite index on `role` + `isAvailable` if availability filter is used server-side. Otherwise client-side filter is safe at the directory scale.

### Pattern 5: Real-time Engagement Subscription

**What:** `onSnapshot` on the engagement document plus two nested subcollection subscriptions (messages + the active tab content). Follows the `ContractRepository.subscribeToContract()` and `QuoteRepository.subscribeToQuotesForRequest()` patterns exactly.

**Example LegalEngagementRepository:**
```javascript
subscribeToEngagement(engagementId, callback) {
  const docRef = doc(db, 'legalEngagements', engagementId);
  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback(LegalEngagement.fromFirestore({ id: snap.id, ...snap.data() }));
  });
}

subscribeToMessagesForEngagement(engagementId, callback) {
  const q = query(
    collection(db, 'legalEngagements', engagementId, 'legalMessages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => LegalMessage.fromFirestore({ id: d.id, ...d.data() })));
  });
}

// Lawyer dashboard: all engagements for this lawyer
subscribeToEngagementsForLawyer(lawyerId, callback) {
  const q = query(
    collection(db, 'legalEngagements'),
    where('participants', 'array-contains', lawyerId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, ...);
}

// Client deal page: their engagement for a specific deal
subscribeToEngagementForDeal(dealId, clientId, callback) {
  const q = query(
    collection(db, 'legalEngagements'),
    where('dealId', '==', dealId),
    where('clientId', '==', clientId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.length > 0
      ? LegalEngagement.fromFirestore({ id: snap.docs[0].id, ...snap.docs[0].data() })
      : null
    );
  });
}
```

**Composite Firestore index needed:** `legalEngagements` on `dealId + clientId` for the per-deal per-client query. Also `participants (array-contains) + updatedAt (desc)` for lawyer dashboard.

### Pattern 6: Contract Draft Versioning

**What:** Each file upload to `contractDrafts` subcollection gets a version number. Version is computed by fetching the current highest version and incrementing. Done client-side with optimistic increment (race condition acceptable at this scale; two simultaneous uploads are highly unlikely).

**Upload flow:**
1. Lawyer selects file in UI
2. `LegalMessageRepository.uploadDraftFile(engagementId, file)` uploads to Firebase Storage at path `legal/drafts/{engagementId}/{timestamp}_{filename}`
3. Read current drafts to find max version number
4. Write `contractDrafts/{auto-id}` with `version: maxVersion + 1`
5. Update `engagement.updatedAt` to trigger real-time update to client
6. Send system message to chat: "New contract draft uploaded: v{N}"

**Note on version race condition:** Server-side version assignment (via Cloud Function transaction) would be safer but adds latency. At this product scale (one lawyer uploading at a time), client-side increment is acceptable. Document this decision clearly in the code.

### Pattern 7: Legal Banner on DealPage

**What:** The `DealBanner` lives inside `DealPage.jsx`. The legal banner must be added alongside the existing contract and quotes banners.

**Key insight from DealPage.jsx analysis:** The banner area (lines 148-188) renders status-specific banners before the main content grid. The legal banner is NOT status-specific -- it shows at ALL deal stages. It should render below the status-specific banners but above `TerminalBanner` when the deal is NOT terminal, OR always (even terminal) per the CONTEXT decision.

**Re-read CONTEXT:** "visible on the deal page at ALL deal stages" -- this means even on terminal/completed deals. The legal banner should render unconditionally (no status gate), but the component itself handles show/hide via dismissed state.

**Implementation approach:**
- Add `LegalBanner` component as a sibling after all existing banners
- `LegalBanner` takes `deal` prop + `currentUserUid`
- Component internally subscribes to `subscribeToEngagementForDeal(dealId, currentUserUid)` -- shows hire CTA when null, shows active badge when engagement exists
- Dismissed state stored in `localStorage` keyed by `${dealId}_legal_banner_dismissed` (not in Firestore -- no persistence needed across devices for a dismiss)

### Pattern 8: Profile Page Role Adaptation for Lawyers

**What:** The existing `/profile/[userId]/page.jsx` is a member-focused page. The CONTEXT decision is to "reuse existing route with role-based content adaptation."

**Implementation approach:** Read the `profileUser.role` value fetched at line 52 of the profile page. If `role === 'lawyer'`, render a `LawyerProfileContent` component that shows lawyer-specific fields (specializations, experience, languages, stats, reviews) instead of the member product/request lists. The check is already conceptually present in the existing profile page since it loads `profileUser` from Firestore.

**Reviews subcollection:** `users/{lawyerId}/reviews/{reviewId}` -- the `SUBCOLLECTIONS` constant already has `REVIEWS: 'reviews'` defined. The reviews write should go through a `submitLawyerReview` Cloud Function that validates engagement completion before writing.

### Anti-Patterns to Avoid

- **Storing engagement under `deals/{dealId}/legalEngagements`:** This would allow a deal participant to query all engagements under their deal and discover if the opposing party hired a lawyer. Top-level collection with `participants` array prevents this.
- **Client-side reads of deal data inside security rules with `get()`:** This is already the accepted pattern in the project, but use sparingly. For messages subcollection, a single `get()` on the parent engagement is needed and acceptable.
- **Allowing client writes to engagement status:** Status transitions (pending -> active -> completed) must only go through Cloud Functions. The `allow update: if isEngagementParticipant()` rule above would need to be tightened to disallow `status` field changes client-side if strict enforcement is needed.
- **Putting `legalMessages` in the existing `conversations` collection with type='legal':** Would technically work but bypasses the strict isolation model; the existing conversation rules use `participants` array but a deal party could theoretically discover a conversation exists by querying conversations where they are NOT a participant (list queries respect rules, but the isolation model is cleaner with a separate collection).
- **Chat pagination on initial load:** Subscribing to all messages without a limit causes slow load on old engagements. Follow the existing `MessageRepository` pattern: initial query with `orderBy createdAt asc, limit 100`, then scroll-to-top for pagination. For v1 the 100-message limit is acceptable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to Storage | Custom XHR with progress | `uploadBytes` + `getDownloadURL` from firebase/storage | Already used in `MessageRepository.uploadAttachment()`; handles resumable uploads, content-type, download URLs |
| Email notifications | Direct SMTP from client | `sendDealEmail()` helper in Cloud Functions + Resend | Already wired; non-blocking pattern already proven |
| In-app notifications | Custom notification collection | `NotificationRepository.create()` + existing `users/{uid}/notifications` pattern | Consistent with all existing notification flows; FCM suppression logic already built |
| Real-time message updates | Polling or WebSockets | Firestore `onSnapshot` subscriptions | Already the project standard; `subscribeToSubcollection()` in FirestoreDataSource covers it |
| File type validation | Custom MIME checking | Client-side `file.type` check against allowlist (already done in `MessageInput`) | Existing `ALLOWED_TYPES` array in MessageInput covers the legal channel's needed types |
| Version number assignment | Database counter with transaction | Simple client-side max+1 (or Cloud Function transaction if contention is a concern) | Single lawyer per engagement; race condition is negligible |

**Key insight:** The project already has all infrastructure. Phase 5 is primarily new Firestore schema + Cloud Functions for lifecycle transitions + UI components (3-panel channel, directory, dashboard). No new external services.

---

## Common Pitfalls

### Pitfall 1: Opposing Party Can Discover Engagement via Deal Subcollection

**What goes wrong:** If engagements are stored at `deals/{dealId}/legalEngagements`, a deal participant can list all documents in the subcollection and discover that the opposing party has hired a lawyer (even if they cannot read the document content).

**Why it happens:** Firestore list operations require the list permission; if both parties can read the parent deal, subcollection listing may be permitted depending on rule structure.

**How to avoid:** Use top-level `legalEngagements` collection. Query-satisfiability in rules means `where('participants', 'array-contains', uid)` only returns documents where the caller is in the array. The opposing party is NOT in `participants`, so their query returns zero results.

**Warning signs:** Any rule that reads `resource.data.dealId` for access control on a deal subcollection can be discovered via listing.

### Pitfall 2: Missing Composite Indexes for Lawyer Dashboard Query

**What goes wrong:** `subscribeToEngagementsForLawyer` uses `where('participants', 'array-contains', lawyerId)` + `orderBy('updatedAt', 'desc')`. Firestore requires a composite index for array-contains + orderBy combinations.

**Why it happens:** Firestore does not auto-create composite indexes for array-contains + non-default-order queries.

**How to avoid:** Add to `firestore.indexes.json` before deployment:
```json
{
  "collectionGroup": "legalEngagements",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
}
```
Also add index for `dealId + clientId` query.

**Warning signs:** `FAILED_PRECONDITION: The query requires an index` error in browser console.

### Pitfall 3: Read-Only Channel Not Enforced After Completion

**What goes wrong:** After engagement is marked `completed`, the channel should become read-only (no new messages, no new drafts). If this is only enforced in the UI, it's not enforced server-side.

**Why it happens:** Client-side-only guards can be bypassed; engagement status check is needed in the Firestore rules or Cloud Function.

**How to avoid:** Add engagement status check to the message create rule:
```javascript
allow create: if isAuthenticated() &&
  request.auth.uid in get(...engagement).data.participants &&
  get(...engagement).data.status == 'active' &&   // ← read-only after completion
  request.resource.data.senderId == request.auth.uid;
```
This ensures completed channels cannot receive new messages even via direct API calls.

**Warning signs:** Messages appearing in completed channels; missing engagement status check in create rules.

### Pitfall 4: Lawyer Can Access Deal Data Without Being a Deal Participant

**What goes wrong:** The existing `deals/{dealId}` rule checks `isDealParticipant()` which reads `buyerId` and `sellerId`. Lawyers are not deal participants, so they cannot read the deal document for the left panel's deal info.

**Why it happens:** `isDealParticipant()` is defined as `request.auth.uid == resource.data.buyerId || request.auth.uid == resource.data.sellerId` -- this excludes lawyers by design.

**How to avoid:** Extend the deal read rule to allow a lawyer to read a deal document if they have an active engagement for that deal:
```javascript
function isLawyerForDeal(dealId) {
  return isLawyer() &&
    exists(/databases/$(database)/documents/legalEngagements/$(engagementId));
  // Note: this requires a known engagementId, which the lawyer has from their dashboard
}
```
OR: Pass deal data as denormalized fields on the engagement document (simpler, avoids extra rule complexity). Since the channel left panel needs: product name, trade terms, parties -- these can be snapshotted onto the engagement at hire time by the `hireLayyer` Cloud Function.

**Recommendation:** Denormalize key deal fields onto the engagement document at creation time (product name, incoterms, parties). For full deal details the lawyer needs, pass `dealId` and let the lawyer fetch via a separate `getById` call (since the existing rules allow Admin to read everything, and the `hireLayyer` CF can set a `lawyerIds` field on the deal document that extends the read rule). **Simplest:** just add a `lawyerIds` array to the deal document (set by `hireLayyer` CF) and extend the deal read rule: `allow read: if isAuthenticated() && (isDealParticipant() || request.auth.uid in resource.data.lawyerIds || isAdmin())`. This is the recommended approach.

**Warning signs:** `PERMISSION_DENIED` when lawyer tries to read deal data in left panel.

### Pitfall 5: Duplicate Engagement Creation Race Condition

**What goes wrong:** Client clicks "Hire Lawyer" twice quickly; two `hireLayyer` Cloud Function calls run simultaneously, creating two pending engagements for the same `(dealId, clientId, lawyerId)`.

**Why it happens:** No uniqueness constraint on Firestore documents.

**How to avoid:** In the `hireLayyer` Cloud Function, use a Firestore transaction to check for an existing engagement with the same `(dealId, clientId)` before creating. A client can only have ONE active/pending engagement per deal (regardless of lawyer). Use a deterministic document ID: `${dealId}_${clientId}` as the engagement ID, and use `setDoc` with `{ merge: false }` -- the second call will fail with "document already exists."

**Warning signs:** Lawyer receiving multiple hire request notifications for the same client/deal.

### Pitfall 6: DealPage Legal Banner Visible to Opposing Party via Shared State

**What goes wrong:** If the legal banner's show/hide state is stored in Firestore (e.g., on the engagement or deal doc), the opposing party's UI might be able to detect state changes on the shared deal doc that indicate a lawyer was hired.

**Why it happens:** Deal document is readable by both parties; any new field added to it is visible to both.

**How to avoid:** The `LegalBanner` component determines its state from `subscribeToEngagementForDeal(dealId, currentUserUid)` -- this query only returns the current user's own engagement. Never store "has hired lawyer" on the deal document itself. Use `localStorage` for the dismiss state (no Firestore write needed for dismiss).

**Warning signs:** Using `deal.hasBuyerLawyer` or `deal.hasSellerLawyer` fields on the deal document.

---

## Code Examples

Verified patterns from existing codebase:

### LegalEngagementRepository subscription (follows ContractRepository pattern)

```javascript
// Source: /src/data/repositories/ContractRepository.js (existing pattern)
subscribeToEngagement(engagementId, callback) {
  const engagementRef = doc(db, 'legalEngagements', engagementId);
  return onSnapshot(
    engagementRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        callback(LegalEngagement.fromFirestore({ id: snap.id, ...snap.data() }));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('LegalEngagementRepository.subscribeToEngagement error:', error);
    }
  );
}
```

### Lawyer notification in Cloud Function (follows sendDealNotifications pattern)

```javascript
// Source: /functions/index.js sendDealNotifications() (existing pattern)
async function sendLegalNotification(engagementId, eventType, recipientId, deal) {
  const now = Timestamp.now();
  // a) Firestore in-app notification
  await db.collection('users').doc(recipientId).collection('notifications').add({
    type: 'legal',
    eventType,           // 'hire_request' | 'hire_accepted' | 'hire_declined' | 'new_message' | 'new_draft' | 'risk_update'
    title: getLegalEventTitle(eventType),
    body: getLegalEventBody(eventType, deal.productName),
    engagementId,
    dealId: deal.id,
    isRead: false,
    createdAt: now,
    link: `/deals/${deal.id}/legal`,
  });
  // b) Resend email (non-blocking)
  const userData = (await db.collection('users').doc(recipientId).get()).data();
  if (userData?.email) {
    await sendDealEmail(userData.email, subject, htmlBody).catch(err =>
      console.error('sendLegalNotification: email failed:', err)
    );
  }
}
```

### Container registration (follows existing container.js pattern)

```javascript
// Source: /src/core/di/container.js (existing pattern)
let legalEngagementRepository = null;
let legalMessageRepository = null;

// In container object:
getLegalEngagementRepository() {
  if (!legalEngagementRepository) {
    legalEngagementRepository = new LegalEngagementRepository(this.getFirestoreDataSource());
  }
  return legalEngagementRepository;
},
getLegalMessageRepository() {
  if (!legalMessageRepository) {
    legalMessageRepository = new LegalMessageRepository(this.getFirestoreDataSource());
  }
  return legalMessageRepository;
},
```

### Legal banner state from deal page (follows existing banner pattern)

```javascript
// Source: /src/presentation/components/features/deal/DealPage/DealPage.jsx
// Add after existing banners, before TerminalBanner:
{/* Legal consulting banner — always visible, not status-gated */}
<LegalBanner
  dealId={deal.id}
  currentUserUid={currentUserUid}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Conversations collection for all channels | Separate `legalEngagements` collection for legal channels | Phase 5 design decision | Enables strict isolation rules not possible with shared conversation collection |
| Manual notification handling in components | Cloud Function triggers with non-blocking email | Phase 2 | Non-blocking email pattern: email failure never fails CF |
| Inline file handling | Firebase Storage `uploadBytes` + `getDownloadURL` | Phase 2 | Established `MessageRepository.uploadAttachment()` pattern to follow exactly |

**No deprecated patterns relevant to this phase.**

---

## Open Questions

1. **Deal read access for lawyer -- denormalize vs rule extension**
   - What we know: Lawyers are not deal participants; existing rule blocks them from reading deal docs
   - What's unclear: Whether to (a) add `lawyerIds` array to deal doc + extend rule, (b) fully denormalize deal info onto engagement doc, or (c) create a Cloud Function that returns deal info for a lawyer who has a valid engagement
   - Recommendation: Option (a) -- add `lawyerIds` array on deal, set by `hireLayyer` CF, extend deal read rule. This is minimal change, consistent with the `participants` array pattern used for `quoteRequests`. One Firestore write in `hireLayyer` CF; the existing `allow write: if false` on deals is bypassed by Admin SDK.

2. **Engagement update rules for client-side writes**
   - What we know: Status transitions must go through Cloud Functions; but chat messages, draft uploads (via Storage), and risk items can be client-side writes
   - What's unclear: The `allow update: if isEngagementParticipant()` rule is too broad -- it allows a client to change engagement status client-side
   - Recommendation: Split client writes: messages and risk items go to subcollections (separate rules); the engagement doc update rule should only allow updating non-status fields, OR route all engagement doc updates through Cloud Functions and set `allow update: if false` on the engagement itself. Subcollection writes are sufficient for v1.

3. **Firestore indexes for new queries**
   - What we know: Two composite indexes needed at minimum: `participants array-contains + updatedAt desc` for lawyer dashboard; `dealId + clientId` for deal page banner
   - What's unclear: Whether additional indexes are needed for the directory filters (specialization + availability on users collection)
   - Recommendation: Add all known indexes to `firestore.indexes.json` before first deploy. Check existing remote indexes first per project MEMORY.md (never force-deploy indexes). Add: legalEngagements participants+updatedAt, legalEngagements dealId+clientId, users role+isAvailable.

---

## Sources

### Primary (HIGH confidence)
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/data/repositories/ContractRepository.js` -- subscription pattern to replicate
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/data/repositories/ConversationRepository.js` -- participants array pattern
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/data/repositories/MessageRepository.js` -- file upload + subcollection pattern
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/data/repositories/QuoteRepository.js` -- collectionGroup + participants query pattern
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/core/di/container.js` -- DI registration pattern
- `/Users/wenubey/Desktop/CTG/core-trade-global/firestore.rules` -- existing rule patterns for subcollection + get() calls
- `/Users/wenubey/Desktop/CTG/core-trade-global/functions/index.js` (sendDealNotifications, sendDealEmail) -- notification pattern
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/presentation/components/features/deal/DealPage/DealPage.jsx` -- banner integration point
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/core/constants/collections.js` -- collection naming conventions
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/(main)/lawyer/` -- existing placeholder routes to be replaced

### Secondary (MEDIUM confidence)
- Firestore security rules documentation: `get()` calls in subcollection rules are supported and used project-wide; consistent with Firebase docs on rule functions
- Firebase Storage path conventions: `legal/drafts/{engagementId}/{timestamp}_{filename}` follows the `conversations/attachments/{conversationId}/{filename}` pattern from MessageRepository

### Tertiary (LOW confidence)
- Composite index requirements for `array-contains + orderBy` inferred from Phase 4 research findings (providerQuotes index for `dealId + createdAt`); should be verified by attempting query in development and checking for `FAILED_PRECONDITION` error

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- collection schema and rule patterns derived directly from existing codebase
- Pitfalls: HIGH -- derived from analysis of existing rules, collection placement constraints, and known project patterns
- Open questions: MEDIUM -- options identified, recommendations made, but final choice deferred to planning

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable Firebase patterns; 30-day window)
