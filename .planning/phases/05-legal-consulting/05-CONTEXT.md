# Phase 5: Legal Consulting - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Either deal party can independently hire a lawyer who gets a private channel with their client and can review deals, draft contracts, and provide risk analysis -- without blocking the trade flow. Legal consulting is optional; deals can proceed through all stages without either party hiring a lawyer.

</domain>

<decisions>
## Implementation Decisions

### Lawyer Hiring Flow
- Browse directory with full search + filters (specialization, availability, language)
- Directory cards show minimal info: name, specialization, availability -- card links to detailed profile page
- Lawyer must accept the hire request (not instant) -- pending -> accepted/declined
- If lawyer declines, client gets notified and can pick another lawyer from the directory
- Termination allowed: client can terminate engagement and hire another lawyer (re-hiring has a cost, handled externally for v1 -- no payment system built)
- Flat pricing: $200 per deal engagement (displayed on directory and banner)

### Lawyer Profile Page
- Reuse existing `/profile/[userId]` route with role-based content adaptation for lawyers
- Authenticated users only (not public)
- Show: name, photo, specializations, years of experience, languages spoken, education (NO bar association)
- Show stats: deals handled on platform, success rate, rating, response time average
- Show reviews from past clients (star rating + written reviews)
- Show availability status and flat $200 pricing
- Reviews can only be left after engagement ends

### Legal Banner on Deal Page
- "Hire a Lawyer" banner card visible on the deal page at ALL deal stages (not just S2)
- Styled like the S2-anlasma-onay.html mockup: promotional banner with features list, $200 pricing, CTA button
- CTA opens lawyer directory/selection flow
- "No thanks" dismiss option
- After lawyer is hired: banner transforms to minimal badge showing lawyer name + status + "Open Channel" link
- Opposing deal party CANNOT see lawyer engagement (fully private -- no indicator whatsoever)

### Channel Experience (Legal Consulting Page)
- 3-panel layout matching hukuk-danismanlik.html mockup exactly:
  - Left panel: lawyer profile + deal info (trade details, parties) + documents list + consulting tasks
  - Center panel: encrypted chat with system messages, file attachments, quick-action toolbar
  - Right panel: 3 tabs -- Contract (latest draft + metadata), Revisions (version history), Risks (analysis cards)
- Quick-action toolbar buttons for BOTH lawyer and client (role-appropriate labels)
  - Client: Approve, Request Info, Request Changes, Attach File
  - Lawyer: Send Draft, Flag Risk, Approve Clause, Attach File
- Privacy: Firestore security rules isolate channel to lawyer + client only. Visual "Encrypted & Private" badge shown. No E2EE.
- Route: `/deals/[dealId]/legal`

### Lawyer Dashboard
- Dedicated route: `/lawyer/dashboard`
- Shows all active/past engagements with deal summaries, client names, statuses
- Entry point to each legal channel
- Pending hire requests shown prominently

### Contract Draft Workspace
- File attachments for v1 (lawyer uploads DOCX/PDF files)
- Auto-versioning: each file upload auto-increments version (v1, v2, v3...) with upload date, uploader info
- Right panel keeps 3-tab structure:
  - Contract tab: latest draft file preview/download + metadata
  - Revisions tab: version history list with all past uploads
  - Risks tab: risk analysis cards
- Risk analysis: structured form with title, description, severity level (low/medium/high), status (open/resolved)

### File Sharing & Attachments
- Both lawyer and client can attach files in chat
- Supported formats: PDF, DOCX, DOC, XLSX + JPG, PNG (for scanned documents)
- Files appear inline in chat AND are listed in left panel's Documents section for easy access
- Files remain accessible to both parties after engagement ends (channel becomes read-only, files stay downloadable)

### Engagement Lifecycle
- Status flow: pending -> active -> completed
  - Pending: hire request sent, waiting for lawyer acceptance
  - Active: lawyer accepted, private channel open
  - Completed: engagement closed
- Engagement ends manually (either party can close)
- After completion: channel becomes read-only (messages and files accessible, no new messages)
- Review prompt appears when engagement is marked complete (review goes on lawyer's profile)

### Notifications
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

</decisions>

<specifics>
## Specific Ideas

- Deal page layout should follow the S2-anlasma-onay.html reference for the legal banner card placement and styling
- Legal consulting page (3-panel) should follow hukuk-danismanlik.html mockup for layout, chat styling, and right panel structure
- The legal banner uses the gold gradient styling with trust indicators and animated orbs as in the mockup
- Quick-action buttons styled as a toolbar above the chat input (as in mockup)
- System messages in chat styled with purple theme (as in mockup: "Legal consulting session started. All conversations are encrypted and recorded.")

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConversationRepository`: Has participants array, types (`direct`, `contact`), metadata, real-time subscriptions, unread counts -- can extend with `legal` type
- `MessageRepository`: Existing message CRUD and real-time subscriptions
- `MessageThread`, `MessageInput`, `ConversationList`: Existing messaging components to reference for patterns (legal channel needs custom UI but can follow same data patterns)
- `DealPage` + `DealSidebar`: Existing deal page components where the legal banner card will be added
- `ContractRepository`: Reads `deals/{dealId}/contract/main` -- legal drafts will be a separate collection
- Notification infrastructure from Phase 2: in-app + email notification patterns exist
- `FirebaseStorageDataSource`: File upload infrastructure exists

### Established Patterns
- Repository -> Hook -> Component architecture consistently used
- DI container in `src/core/di/container.js` for repository singletons
- `COLLECTIONS` and `SUBCOLLECTIONS` constants for Firestore collection names
- Role-based middleware protection in `middleware.js`
- Real-time subscriptions via Firestore `onSnapshot` pattern

### Integration Points
- `DealPage.jsx`: Add legal banner card component
- `middleware.js`: Add `/lawyer/*` route protection for lawyer role
- `container.js`: Register new repositories (LegalEngagement, LegalMessage, etc.)
- `collections.js`: Add new collection/subcollection constants
- `firestore.rules`: Add rules for legal channel isolation
- Navbar: Add lawyer-specific navigation items

</code_context>

<deferred>
## Deferred Ideas

- In-app contract viewer and editor (user wants this, but starting with file attachments for v1) -- future enhancement
- Contract revision diff view (LEGAL-V2-01 in REQUIREMENTS.md) -- v2 feature
- Payment integration for lawyer hiring ($200 flat fee) -- depends on payment infrastructure being out of scope for v1
- Auto-close engagement when deal completes -- user chose manual only for now
- Time-limited lawyer response window (e.g., 48h auto-decline) -- not selected, could add later

</deferred>

---

*Phase: 05-legal-consulting*
*Context gathered: 2026-03-10*
