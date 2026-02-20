# Pitfalls Research

**Domain:** B2B International Trade Platform — Negotiation, Legal Consulting, Insurance/Logistics, Multi-Role Access
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH (Firebase/Next.js pitfalls HIGH; trade domain workflow pitfalls MEDIUM from cross-domain evidence)

---

## Critical Pitfalls

### Pitfall 1: Middleware-Only Authorization (CVE-2025-29927 Class of Bug)

**What goes wrong:**
The existing middleware.js enforces route protection by checking the session cookie. If Firestore security rules are not also enforced at the data layer, an attacker who bypasses middleware (or exploits a middleware vulnerability) gains unrestricted data access. CVE-2025-29927 demonstrated that the `x-middleware-subrequest` header could bypass Next.js middleware entirely in versions below 14.2.25 / 15.2.3. This platform is on Next.js 16.1.4 — verify whether the patch is included.

**Why it happens:**
Developers treat middleware as "the security layer" and write permissive Firestore rules to avoid complexity, then rely entirely on the route guard. When the guard is bypassed, there is nothing stopping direct Firestore reads from the client SDK.

**How to avoid:**
- Enforce access control at both middleware AND Firestore security rules — every sensitive collection must have rules that independently verify role and ownership.
- Never write `allow read, write: if isAuthenticated()` alone for deal, message, or document collections. Rules must verify the user is a party to the specific deal.
- For provider portals: rules must check `request.auth.token.role == 'insurance_provider'` or equivalent, not just that the user is authenticated.
- Strip the `x-middleware-subrequest` header at the Firebase Hosting CDN or any reverse proxy layer.
- Verify Next.js 16.1.4 is patched against CVE-2025-29927; if not, apply a header-stripping workaround immediately.

**Warning signs:**
- Firestore rules file has broad `allow read: if isAuthenticated()` for deal-related collections.
- Any collection containing sensitive fields (price, contract clauses, lawyer messages) does not check whether the requesting user is a deal participant.
- The existing admin-override rule (`allow read, write: if isAdmin()` on `/{document=**}`) is the only per-collection rule for new collections.

**Phase to address:**
Role System phase (before any provider portal or legal consulting UI is built). Firestore rules must be written and tested in the Firebase Rules Simulator before the first provider portal endpoint ships.

---

### Pitfall 2: Deal Price Leaking to Logistics Providers via Firestore Rules

**What goes wrong:**
The product requirement explicitly states logistics providers must NOT see deal price; insurance providers must. If the deal document is stored as a single Firestore document with a `price` field, and logistics providers are granted read access to the whole document, the price is exposed. Client-side field filtering is not security — the data is still transmitted to the client.

**Why it happens:**
Developers assume they can filter fields in the component (`const { price, ...rest } = deal`) and that this constitutes access control. Firestore sends the entire document to the client; what is rendered in the UI is irrelevant to what was transmitted over the wire.

**How to avoid:**
- Split the deal document into a base document (all parties can read) and a sensitive subcollection or sibling document (e.g., `deals/{dealId}/financials/{financialsId}`) that only insurance providers and deal parties can read.
- Alternatively, use a Cloud Function as an API proxy that returns role-filtered data — the logistics provider calls a Function that returns the deal minus the price field.
- Firestore security rules do not support field-level read restrictions in the same document; the only solution is document structure separation or a server-side proxy.
- Write a Rules Simulator test: log in as a logistics provider, attempt to read the deal document, verify the price field is inaccessible (or the document structure is split correctly).

**Warning signs:**
- Deal document in Firestore has a single flat structure containing both price and logistics-relevant fields.
- Logistics provider portal component filters out the price field in JSX but reads the full deal document.
- No Cloud Function intermediary between provider portal reads and deal data.

**Phase to address:**
Provider Portals phase — before any provider portal UI ships. The data model for deal documents must be designed with this split in mind from the start, because retrofitting it after provider portals are live requires a data migration.

---

### Pitfall 3: Negotiation State Machine Without Atomic Transitions

**What goes wrong:**
The offer/counter-offer flow has discrete states (open, counter-offered, accepted, rejected, expired). If two parties act simultaneously — buyer accepts while seller sends a counter-offer at the same moment — the deal state can become inconsistent. Last-write-wins in Firestore will silently apply whichever write arrived last, leaving the deal in an undefined state (e.g., simultaneously "accepted" and "counter-offered").

**Why it happens:**
Firestore's default behavior is optimistic: concurrent writes to the same document apply without conflict detection unless wrapped in a transaction. Developers build the happy path (sequential negotiation) and do not account for simultaneous actions.

**How to avoid:**
- All deal state transitions must use Firestore transactions. The transaction reads the current state, validates the transition is legal (e.g., "can only accept if current state is `counter_offered`"), then writes the new state atomically.
- Define an explicit state machine for the deal: `draft → negotiating → agreement_pending → legal_review → insurance_logistics → tracking → complete | cancelled`. Transitions outside this graph are rejected by the transaction.
- Do not modify React state inside a Firestore transaction function — transactions can retry multiple times. Keep transaction functions pure (read, validate, write).
- Use `FieldValue.serverTimestamp()` for all state transition timestamps to prevent client clock manipulation.

**Warning signs:**
- Deal status is updated with a simple `updateDoc({ status: 'accepted' })` without a transaction.
- No server-side validation that the current state is valid before accepting a transition.
- Offer history is appended from the client without checking the deal is still in a negotiable state.

**Phase to address:**
Trade Flow — Negotiation (S1). The state machine must be designed and enforced from the very first negotiation feature; retrofitting transactions after the offer history is being written is a data integrity risk.

---

### Pitfall 4: Stale Firebase Role Tokens Not Reflected in Active Sessions

**What goes wrong:**
When an admin changes a user's role (e.g., from `member` to `lawyer` or `insurance_provider`), the Firebase ID token cached in the client still carries the old role for up to 1 hour. During that hour, the user's security rule checks evaluate against the stale role. A newly promoted provider can be locked out; a demoted provider retains access.

**Why it happens:**
Firebase ID tokens are JWTs with a 1-hour TTL. Custom claims (including role) are embedded at token issue time. Updating the role in Firestore does not refresh the token. The existing implementation stores role in Firestore (checked by `isAdmin()` via a document read in rules), but any new custom claims approach compounds this.

**How to avoid:**
- Continue using Firestore-document-based role checks in security rules (current pattern: `get(users/uid).data.role`) rather than custom JWT claims for role. Document reads in rules are always current; JWT claims are stale.
- After admin role changes, force token refresh via a Cloud Function that calls `auth.revokeRefreshTokens(uid)` — this forces the client to re-authenticate on next request.
- In the Next.js session cookie flow, add a `lastRoleChange` timestamp to the user document; the session API route should re-verify the token and check this timestamp, rejecting stale sessions if the role changed after token issue.
- Notify the affected user that their role changed and prompt a page reload.

**Warning signs:**
- Admin role-change flow updates only the Firestore `users` document without triggering any session invalidation.
- Provider portal navigation appears/disappears only after the user logs out and back in.
- No `revokeRefreshTokens` call anywhere in admin user-management functions.

**Phase to address:**
Role System phase — must be resolved before providers can be invited and assigned roles.

---

### Pitfall 5: Private Lawyer-Client Channel Data Accessible to the Opposing Deal Party

**What goes wrong:**
Both buyer and seller can independently hire lawyers for the same deal. The buyer's lawyer-client channel must be completely invisible to the seller and vice versa. If the channel is stored as a subcollection of the deal (e.g., `deals/{dealId}/legalChannels/{channelId}/messages`), and the deal document rules grant all deal parties read access recursively, both lawyers and their messages become readable by the opposing party.

**Why it happens:**
Firestore recursive wildcards (`{document=**}`) in rules grant access to all subcollections under a matched path unless overridden with a more specific rule. Developers forget that deal-participant access to the parent deal does not mean they should have access to all subcollections.

**How to avoid:**
- Store legal channels as a top-level collection (`legalChannels/{channelId}`) with a `dealId` reference field, not as a subcollection of the deal. This prevents recursive rule inheritance.
- Rules for `legalChannels`: allow read/write only if `request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.lawyerId`. No deal-party access, no admin-override read (admins should access legal channels only via Admin SDK for legitimate dispute resolution, not via client-side rules).
- The lawyer-client channel must never be exposed in the "deal context" API responses returned to other deal parties. Cloud Functions returning deal summaries must explicitly exclude legal channel data.
- Test with a security rule simulator: log in as the seller, attempt to read the buyer's `legalChannels` document — should deny.

**Warning signs:**
- Legal channels are a subcollection under `deals/{dealId}` and the deal rules have `match /{document=**} { allow read: if isDealParty() }`.
- Deal summary hook fetches all subcollections of the deal document.
- No explicit Firestore rule for legal channel collection.

**Phase to address:**
Trade Flow — Legal Consulting phase. The data model must be locked before the lawyer messaging UI is built.

---

### Pitfall 6: No Immutable Audit Trail for Deal State Transitions

**What goes wrong:**
Deal stages (offer submitted, counter-offered, accepted, legal consulted, insurance selected, shipped) are overwritten on the deal document's `status` field. When a dispute arises — "I never accepted those terms" — there is no verifiable record of who did what and when. An offer history array on the deal document is insufficient because Firestore documents are mutable and an array can be overwritten.

**Why it happens:**
Developers model state as a current-status field because it is simple to query and display. An audit trail feels like overhead. In trade platforms, disputes are not edge cases — they are anticipated events that determine legal liability.

**How to avoid:**
- Maintain a separate append-only `dealEvents` subcollection (e.g., `deals/{dealId}/events/{eventId}`) where each document represents a single state transition: `{ type: 'offer_submitted', actorId, timestamp: serverTimestamp(), payload: { price, incoterm, quantity } }`.
- Firestore security rules must set events to `allow create: if isDealParty()` but `allow update, delete: if false` — no one, not even admins, can delete events via the client SDK. Admin SDK can still access if needed for legitimate legal holds.
- The deal's current `status` field is derived from events and serves as a cache for queries, not the source of truth.
- Store the Incoterms version (e.g., "Incoterms 2020") alongside each offer event — the agreed Incoterm only has meaning if the version is recorded.

**Warning signs:**
- Deal status is a single mutable field on the deal document with no event log.
- Offer history is an array field on the deal document (arrays are mutable and overwritable).
- No Firestore rules preventing delete on offer/event records.

**Phase to address:**
Trade Flow — Negotiation (S1) and Agreement (S2). Events must be written from the first offer action.

---

### Pitfall 7: Quote Expiry Timer Race Condition (Insurance/Logistics)

**What goes wrong:**
Insurance and logistics quotes have validity timers. A buyer selects a quote 30 seconds before it expires. The selection write reaches Firestore after the timer lapses. The provider has already committed resources (capacity, rate-locks) or not — but the platform has accepted an expired quote as valid. Alternatively, the timer is enforced only client-side and a buyer can manually extend it.

**Why it happens:**
Quote expiry is implemented as a countdown in the UI reading a `validUntil` timestamp. The write to accept the quote does not validate server-side whether `now < quote.validUntil`.

**How to avoid:**
- Quote acceptance must go through a Cloud Function (not a direct Firestore write) that reads the current server timestamp and validates `admin.firestore.Timestamp.now() < quote.validUntil` before committing the acceptance.
- The Cloud Function returns an error if the quote is expired; the UI shows the user the quote has expired and refreshes the list.
- Firestore security rules alone cannot enforce this (rules cannot compare server time with document fields in a write condition in a useful way) — Cloud Functions are the correct enforcement point.
- Implement a scheduled Cloud Function that marks expired quotes as `status: 'expired'` every 5 minutes, so the provider portal shows accurate state.

**Warning signs:**
- Quote acceptance is a direct `updateDoc` call from the client.
- Quote expiry is validated only by a `Date.now() < validUntil` check in the React component before the write.
- No Cloud Function in the quote acceptance flow.

**Phase to address:**
Trade Flow — Insurance & Transportation (S3).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing deal price in the main deal document alongside logistics fields | Simple single-document read | Logistics providers see price via client SDK; requires data migration to fix | Never — split from day one |
| Using client-side Firestore writes for all state transitions | No Cloud Function cold starts | Race conditions, no server-side validation, bypassed expiry checks | Never for state transitions; acceptable for non-critical reads |
| Checking role only in Next.js middleware | Simple implementation | CVE-2025-29927 class of bypass; middleware is not a data-layer control | Never alone — always pair with Firestore rules |
| Storing offer history as an array on the deal document | Simple to read | Arrays are mutable; not a reliable audit trail; 1MB document size limit | Only for display cache; never as the source of truth |
| Legal channels as deal subcollections | Intuitive hierarchy | Recursive rule inheritance exposes channels to all deal parties | Never — use top-level collection with foreign key |
| Updating role in Firestore only, without session invalidation | No logout required | User continues with old role for up to 1 hour | Acceptable only if role is read from Firestore in rules (not JWT claims) and the window is acceptable |
| No Cloud Function for quote acceptance | Faster development | Expired quotes accepted; provider confusion; disputes | Never for time-sensitive business actions |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firestore security rules + role system | Using `isAuthenticated()` alone for provider collections | Check `get(users/uid).data.role == 'insurance_provider'` in rules; test with Rules Simulator |
| Firebase custom claims + role | Setting role as custom claim and expecting immediate effect after admin change | Role in Firestore document is always current; JWT claims have 1-hour staleness; revoke tokens via Admin SDK on role change |
| Firebase Functions + quote expiry | Validating expiry client-side before a direct Firestore write | All time-sensitive acceptance logic must run inside a Cloud Function using server-side `admin.firestore.Timestamp.now()` |
| Firestore onSnapshot + provider portal | Attaching onSnapshot listeners to deal collections from the provider portal without cleanup | Return unsubscribe from useEffect; detach listeners when provider navigates away; each active listener bills per-read on reconnect after 30 min offline |
| Next.js middleware + Firebase Auth session cookie | Trusting middleware as the sole auth gate | Firestore rules must independently validate access; middleware is a UX gate, not a security gate |
| Firebase Storage + lawyer documents | Storing lawyer documents in a path accessible to all deal parties (e.g., `deals/{dealId}/documents/`) | Use `legalChannels/{channelId}/documents/` with Storage rules matching the channel's client/lawyer UIDs |
| Email notifications via Firebase Functions + negotiation | Sending email on every Firestore document write without deduplication | Debounce or batch notifications; use a `lastNotifiedAt` field to suppress repeated emails within a threshold window |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| One onSnapshot listener per deal per page load | Firestore read costs spike; billing alarms trigger | Scope listeners to the active deal only; unsubscribe when navigating away; use one-time `getDoc` for historical reads | ~50 concurrent active deal views |
| Fetching all providers' quotes as a collection group query on every buyer page render | Slow page loads; excessive reads | Paginate provider quotes; cache the selected quote ID; re-fetch only on user action | ~200 active deals with 5 quotes each |
| Storing full deal party names/company info on every offer event document (denormalization) | Stale company names in event history | Denormalize immutable identifiers (userId) only; look up display names at read time or use a user-data cache | Data consistency degrades immediately on company name change |
| Real-time listeners on both the deal document and all its subcollections simultaneously | Connection pool exhaustion; unexpected Firestore costs on reconnect after 30 min | Use a single listener on the deal document with an `updatedAt` field; fetch subcollection data on demand | ~100 concurrent users on deal detail pages |
| Unguarded Firestore document size growth for offer history | Document reads time out; writes fail silently | Move offer history to a `dealEvents` subcollection; the main deal document stays small | Deal document reaches 1 MB (Firestore hard limit) — roughly 500+ offer rounds or large payload fields |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logistics provider can read deal price via direct Firestore client SDK call | Price-sensitive commercial information leaked to freight forwarder; deal trust broken | Separate price into a restricted subcollection; only insurance providers and deal parties can read it via rules |
| Lawyer channel messages readable by opposing deal party | Breach of attorney-client privilege; legal liability for the platform | Top-level `legalChannels` collection with rules scoped to `clientId` and `lawyerId` only |
| No event immutability — offer history can be deleted | Audit trail destroyed before dispute resolution | Firestore rules: `allow update, delete: if false` on `dealEvents` collection |
| Invite-only provider accounts created by admin, but admin tool does not verify email domain | Impersonation; a bad actor creates a fake insurance provider account | Admin invite flow must verify the invited email domain matches the provider's registered company domain; log all admin account creation actions |
| Quote amounts stored client-side and submitted directly to Firestore | Provider can submit a quote for 0 or negative amount | Cloud Function validates quote fields (price > 0, coverage type in allowed set, transport mode in allowed set) before writing to Firestore |
| No rate limiting on negotiation counter-offer writes | Automated spam of counter-offers; deal state machine overwhelmed | Cloud Function for offer submission with per-user rate limiting (max N offers per deal per hour) |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No clear deal status indicator showing which party's turn it is to act | Both parties wait for the other; deal stalls | Explicit "Awaiting your response" vs. "Awaiting seller/buyer response" label derived from deal state; shown prominently at the top of the negotiation view |
| Incoterm shown as a 3-letter code (e.g., "FOB") without named point and Incoterms 2020 version | Parties later dispute what FOB meant; legal ambiguity | Always render Incoterm as "FOB [Port Name] (Incoterms 2020)"; require the port/place field when the Incoterm is selected |
| Quote validity countdown only visible in the insurance/logistics step | Buyer returns to the step and quote has expired without warning | Show a persistent banner if any selected quote is expiring within 24 hours; disable "Proceed" if any selected quote has expired |
| Legal consulting shown as a required step in the deal flow UI | Lawyers are optional per PROJECT.md; presenting it as required adds friction | Legal consulting must be a clearly optional side-panel or branch; the main deal flow must be completable without it |
| Single notification for "deal updated" without specifics | Users open the deal to find nothing they need to act on | Notifications must specify action type: "Counter-offer received", "Quote expires in 2 hours", "Both parties approved — proceed to insurance" |
| Provider portal shows all deals without filtering to those needing quotes | Providers are overwhelmed; ignore stale requests | Default view: deals awaiting a quote from this provider type; separate tab for already-quoted deals |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Negotiation flow:** Offer submission appears to work — verify the Firestore transaction enforces state machine transitions and rejects out-of-order state changes.
- [ ] **Legal channel:** Messaging UI renders — verify Firestore rules block the opposing deal party from reading the channel document.
- [ ] **Provider portal:** Quote submission form works — verify a Cloud Function validates the quote fields server-side and checks deal state before writing; verify logistics provider cannot read deal price.
- [ ] **Role system:** Navigation changes on role — verify a new `lawyer` account cannot access `insurance_provider` routes by direct URL; verify Firestore rules independently enforce it.
- [ ] **Quote timer:** Countdown displays correctly — verify that quote acceptance goes through a server-side timestamp check, not just a client-side `Date.now()` comparison.
- [ ] **Audit trail:** Offer history renders — verify the `dealEvents` subcollection has `allow update, delete: if false` in Firestore rules; verify offers cannot be deleted from the client.
- [ ] **Agreement approval:** Both parties checked "approved" — verify the deal cannot advance to the next step until both approval flags are set; verify neither party can set the other's flag.
- [ ] **Incoterms:** Term is selected — verify the named place/port is also captured alongside the 3-letter code and that "Incoterms 2020" version is recorded in the offer event.
- [ ] **Email notifications:** Notification sent on counter-offer — verify deduplication prevents duplicate emails if the Firestore trigger fires more than once (Cloud Functions can retry on failure, causing duplicate sends).
- [ ] **Session invalidation:** Admin changes provider role — verify the user's active session reflects the new role without requiring a 1-hour wait.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Deal price leaked to logistics provider | HIGH | Audit Firestore access logs for the provider's UID; notify affected deal parties; restructure deal document schema and migrate existing deals; update Firestore rules |
| Lawyer channel messages seen by opposing party | HIGH | Immediate Firestore rule fix (same-day deploy); audit which documents were read by which UIDs via Cloud Audit Logs; notify affected parties; legal consultation on platform liability |
| Offer history lost / overwritten | HIGH | Restore from Firestore Point-in-Time Recovery (PITR) if enabled; if not, data is gone — enable PITR immediately |
| Stale role allows provider to act after demotion | MEDIUM | Call `auth.revokeRefreshTokens(uid)` via Admin SDK immediately; add this to the admin user-management flow going forward |
| Expired quote accepted as valid | MEDIUM | Cancel the deal step; notify buyer and provider; re-open the insurance/logistics selection step; provider re-submits quote |
| Middleware bypass exploited (CVE-2025-29927 class) | HIGH | Immediately strip `x-middleware-subrequest` header at CDN/hosting level; audit access logs; patch Next.js; verify Firestore rules independently block unauthorized reads |
| onSnapshot listener leak causing billing spike | MEDIUM | Identify leaked listeners via Firebase console usage graph; deploy fix with proper useEffect cleanup; set up Firebase billing alert threshold immediately |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Middleware-only authorization | Role System (before any portal ships) | Firebase Rules Simulator test: each role can only access its permitted collections |
| Deal price leaking to logistics provider | Provider Portals (data model design) | Security rule test: logistics provider UID reads deal document — price field inaccessible |
| Negotiation state machine without atomic transitions | Trade Flow — Negotiation (S1) | Integration test: simulate concurrent offer + counter-offer write; verify only one transition commits |
| Stale role tokens | Role System | Test: change role in admin; verify effective role in active session within 5 minutes |
| Lawyer-client channel visible to opposing party | Trade Flow — Legal Consulting | Security rule test: seller UID reads buyer's legalChannel — denied |
| No immutable audit trail | Trade Flow — Negotiation (S1) | Firestore rule test: attempt to delete a dealEvent document — denied |
| Quote expiry race condition | Trade Flow — Insurance & Transportation (S3) | Integration test: submit acceptance after validUntil timestamp — Cloud Function rejects |
| onSnapshot listener leak | Trade Flow — Negotiation (S1) (first real-time listeners) | Memory profile: mount deal page, navigate away, verify no active Firestore subscriptions remain |
| Incoterm missing named place / version | Trade Flow — Negotiation (S1) | Form validation: submitting an offer without a named port when using FOB/CIF/etc. fails validation |
| Notification deduplication | Trade Flow — Negotiation (S1) (email triggers) | Test: trigger the same Firestore event twice (simulating Cloud Function retry); verify single email sent |

---

## Sources

- [Firebase Secure data access for users and groups (RBAC)](https://firebase.google.com/docs/firestore/solutions/role-based-access) — HIGH confidence (official docs)
- [Firebase Rules Aren't Enough — Permit.io](https://www.permit.io/blog/firebase-rules-arent-enough-decoupling-authorization-for-scalable-fine-grained-access-control) — MEDIUM confidence (single source, verified consistent with official docs on rule limitations)
- [CVE-2025-29927 Next.js Middleware Authorization Bypass — ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — HIGH confidence (official CVE, multiple independent sources agree)
- [CVE-2025-29927 GitHub Advisory](https://github.com/advisories/GHSA-f82v-jwr5-mffw) — HIGH confidence (official GitHub advisory)
- [Firebase Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions) — HIGH confidence (official docs)
- [Firebase Real-time listeners at scale](https://firebase.google.com/docs/firestore/real-time_queries_at_scale) — HIGH confidence (official docs)
- [Firebase Billing — onSnapshot costs](https://firebase.google.com/docs/firestore/pricing) — HIGH confidence (official docs)
- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) — HIGH confidence (official docs)
- [Firebase Fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules) — HIGH confidence (official docs)
- [Incoterms common mistakes — Trade Finance Global](https://www.tradefinanceglobal.com/incoterms/6-common-mistakes-when-using-incoterms/) — MEDIUM confidence (industry publication, consistent with ICC guidance)
- [Exploiting Firestore Database Rules — Medium/Sethu Satheesh](https://medium.com/@S3THU/exploiting-firestore-database-rules-a-pathway-to-data-breaches-aa945476cc16) — MEDIUM confidence (WebSearch only; consistent with official Firebase security guidance)
- [Mastering Firestore Security — Medium/Sehban Alam](https://medium.com/@sehban.alam/mastering-firebases-firestore-security-9de63c4baa0e) — LOW confidence (WebSearch only, single source)
- [Database concurrency and Firestore Transactions — Medium/Shivamsharmaskp](https://medium.com/@shivamsharmaskp94/database-concurrency-and-firestore-transactions-how-mvcc-works-and-why-you-shouldnt-use-834da0d88e18) — LOW confidence (WebSearch only; consistent with official transaction docs)
- Existing codebase analysis: `.planning/codebase/CONCERNS.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/INTEGRATIONS.md` — HIGH confidence (direct code analysis)

---

*Pitfalls research for: B2B International Trade Platform — Core Trade Global*
*Researched: 2026-02-20*
