# Stack Research

**Domain:** B2B international trade platform — subsequent milestone (trade flow features, provider portals, role-based dashboards)
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH (Firebase features verified via official docs; library versions verified via npm; encryption approach verified via MDN and official sources)

---

## Context: What This Research Is For

The existing app runs Next.js 16.1.4 + React 19 + Firebase 12 (Auth, Firestore, Storage, Functions v2) + Tailwind 4 + Zod 4 + React Hook Form 7. This research covers **only the new libraries and Firebase features** needed for:

1. Real-time trade negotiations (offer/counter-offer state machine)
2. Private encrypted lawyer-client messaging channels
3. Provider portals (insurance and logistics)
4. Versioned contract management with change tracking
5. Role-based access control (member, lawyer, insurance_provider, logistics_provider, admin)

Do not re-install anything already in `package.json`.

---

## Recommended Stack

### Firebase Features to Enable (No New Libraries)

These are Firebase capabilities already in the project's `firebase` SDK (v12.4.0) that need to be actively used for the new features:

| Feature | Firebase API | Purpose | Confidence |
|---------|-------------|---------|------------|
| Firestore `onSnapshot` listeners | `firebase/firestore` (already installed) | Real-time negotiation offer/counter-offer updates, provider quote timers, shipment status — zero-refresh UI | HIGH — official Firebase docs confirm this is the correct pattern for real-time B2B workflows |
| Firestore Transactions | `runTransaction()` in `firebase/firestore` | Atomic negotiation state transitions (e.g., "accepted" state must update both parties simultaneously — prevents race conditions) | HIGH — official Firestore docs verify transactions prevent dirty reads during concurrent state changes |
| Firestore Batch Writes | `writeBatch()` in `firebase/firestore` | Submitting quotes that simultaneously update deal status and notify participants | HIGH — verified via official docs; batches up to 500 operations, atomic without read-before-write |
| Firebase Admin SDK `setCustomUserClaims` | `firebase-admin/auth` (already installed in functions) | Setting role claims on the JWT token for RBAC in Firestore security rules and middleware | HIGH — official Firebase Auth docs confirm custom claims appear in `request.auth.token` in Firestore rules |
| Firebase Functions v2 `onDocumentCreated` | `firebase-functions/v2/firestore` (already installed) | Email notifications on new offer, counter-offer received, quote submitted, contract updated | HIGH — already used in codebase for message notifications; same pattern extends to trade events |
| Firebase Storage | `firebase/storage` (already installed) | Lawyer document uploads, contract PDF storage, deal attachments | HIGH — already in use for product images; no new capability needed |
| FCM (Firebase Cloud Messaging) | `firebase-admin` messaging (already in functions) | In-app push notifications for trade events | HIGH — already implemented for messages; extend to trade events |

**Key architectural point:** The existing middleware reads `session.role` from a cookie. The existing Functions check Firestore `role` field. For the new roles, **both layers must be updated simultaneously** — Firestore security rules check `request.auth.token.role` (custom claims), the middleware checks `session.role` from cookie, and Firestore documents store `role` for display. These three must stay synchronized.

---

### New Libraries Required (Client-Side)

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| `libsodium-wrappers` | `^0.7.13` | Client-side end-to-end encryption for lawyer-client private channels | The only field-level encryption approach that keeps Firestore as the transport without a separate server. Uses XSalsa20-Poly1305 (NaCl box) — the same algorithm Signal uses. The alternative (Web Crypto API SubtleCrypto) requires key serialization boilerplate that libsodium handles out-of-the-box. Zero dependencies. Compiled from audited C (libsodium). | MEDIUM — npm shows v0.7.13 published; security model verified via libsodium official docs and MDN. Note: Adds ~300KB to bundle; use dynamic import to prevent blocking. |
| `diff-match-patch-es` | `^1.0.1` | Contract revision change tracking — shows what changed between lawyer draft versions | The original `diff-match-patch` (Google) is not ESM and hasn't been published to npm in 6+ years. `diff-match-patch-es` by antfu is an ESM + TypeScript rewrite, tree-shakeable, Apache-2.0. Needed to show "what changed in revision 3 vs revision 2" in the lawyer portal. | MEDIUM — package is v1.0.1 published mid-2025, actively maintained. Verified via npm listing. |
| `@react-pdf/renderer` | `^4.3.2` | Generating downloadable contract PDFs | Works with React 19 (confirmed since v4.1.0). Use only on client-side via `dynamic(() => import(...), { ssr: false })` — server-side rendering in Next.js App Router route handlers has known bugs (confirmed via GitHub issues #2350, #2460). Contracts are generated client-side and stored to Firebase Storage. Alternative `pdfmake` requires imperative JSON API which doesn't compose with existing React component patterns. | MEDIUM — version 4.3.2 confirmed via npm; React 19 compatibility confirmed on react-pdf.org; SSR warning confirmed via GitHub issues. |

---

### New Libraries Required (Server-Side / Functions)

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| `@sendgrid/mail` | `^8.x` | Transactional email notifications from Firebase Functions | Firebase's own recommendation for production email delivery. Replaces Nodemailer SMTP for reliability and deliverability analytics. Already used at scale with Firebase Functions — well-documented pattern. Alternative: Firebase "Trigger Email" extension (Firestore-based) adds operational complexity (another collection to maintain) without benefit for this use case where triggers are already controlled via `onDocumentCreated`. | MEDIUM — version verified via npm listing; SendGrid + Firebase Functions pattern confirmed via official Twilio blog and Firebase docs. Install in `functions/` only. |

---

### Supporting Libraries (Optional / Conditional)

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `next-firebase-auth-edge` | `^1.11.5` | Edge-compatible Firebase token verification in Next.js middleware | Use ONLY if the middleware is moved to Edge runtime (Vercel Edge). The current middleware uses cookie parsing, which doesn't call Firebase Admin SDK, so it already works without this library. If custom claims from Firebase Admin are needed in middleware for role checks (e.g., redirecting `/lawyer/...` routes), this library handles Edge-compatible token verification. | MEDIUM — v1.11.5 released 2026-02-16, confirmed via GitHub releases. |
| `zod` (already installed) | Already `^4.1.12` | Validate Incoterms, deal amounts, trade form inputs | Use the existing Zod 4 installation. No separate Incoterms library exists — use `z.enum(['EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP', 'FCA', 'CPT'])` directly in schemas. | HIGH — already in package.json. |

---

## Installation

```bash
# Client-side — install in root package
npm install libsodium-wrappers diff-match-patch-es @react-pdf/renderer

# Server-side — install in functions/ only
cd functions && npm install @sendgrid/mail
```

---

## Alternatives Considered

| Recommended | Alternative | Why Alternative Was Rejected |
|-------------|-------------|------------------------------|
| `libsodium-wrappers` for E2E encryption | Web Crypto API (`SubtleCrypto`) | SubtleCrypto is built-in but requires manual ECDH key exchange, IV generation, Base64 serialization, and error handling for every encrypt/decrypt call. libsodium wraps all of this into `crypto_box_easy()`. For a lawyer-client channel, correctness matters more than avoiding a 300KB dependency. |
| `libsodium-wrappers` for E2E encryption | TweetNaCl.js | TweetNaCl is smaller but lacks the `secretstream` API needed for chunked file encryption. libsodium-wrappers covers all use cases (messages and file attachments) in one library. |
| `diff-match-patch-es` | Original `diff-match-patch` | The original npm package is a CommonJS module, not ESM, and hasn't been published for 6+ years. The antfu fork is the ecosystem-standard successor. |
| `diff-match-patch-es` | `jsondiffpatch` | jsondiffpatch works on JSON structures; contracts are text. diff-match-patch-es implements Myers' algorithm which produces human-readable "what changed in this clause" output. |
| `@react-pdf/renderer` (client-side only) | `pdfmake` | pdfmake uses a JSON document definition API that doesn't compose with existing React component patterns. @react-pdf/renderer lets lawyers preview the contract as a React component before downloading. |
| `@react-pdf/renderer` (client-side only) | Server-side PDF via Firebase Function | PDF generation in Firebase Functions adds cold-start latency, function invocation costs, and requires passing entire contract state over the wire. Client-side is appropriate since these are not high-security documents that require server-sealed generation. |
| `@sendgrid/mail` in Functions | `nodemailer` with SMTP | nodemailer requires an SMTP server/credentials. SendGrid provides deliverability analytics and bounce handling with a free tier (100 emails/day) sufficient for the current user count. |
| `@sendgrid/mail` in Functions | Firebase "Trigger Email" extension | The extension adds a `mail` Firestore collection as a queue. For this app, email triggers are already controlled via `onDocumentCreated` functions — adding another layer of indirection makes debugging harder. |
| Firestore `onSnapshot` | WebSocket (Socket.io, Ably, Pusher) | The PROJECT.md explicitly constrains: "Use Firestore onSnapshot listeners for live updates — no WebSocket server needed." Additionally, the app is already Firebase-hosted; a separate WebSocket service would require a separate deployment target. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `firebase-admin` SDK in Next.js client components | Admin SDK bundles private key material. Already the pattern in this codebase (admin only in API routes and Functions), but adding new providers/lawyers makes this mistake more tempting. | Keep Admin SDK strictly in `functions/index.js` and Next.js API routes (`/src/app/api/...`). |
| Setting roles in Firestore documents as the SOLE auth mechanism | Current codebase pattern (isAdmin checks Firestore doc at rules-time using `get()`) works but has a latency cost — every rule evaluation that calls `get()` is a chargeable Firestore read. At scale this is expensive. | Migrate role enforcement to Firebase custom claims (`request.auth.token.role`) in Firestore rules. Keep the Firestore `role` field for display only. Set custom claims via Admin SDK in Functions when admin invites a new provider. |
| Storing encryption private keys in Firestore | Private keys stored in Firestore are readable by Firebase rules, Google, and any admin with console access. This defeats E2E encryption. | Store private keys in IndexedDB (browser-local) or derive them from a user password using PBKDF2. For lawyer-client channels, keys should never leave the client unencrypted. |
| `@react-pdf/renderer` in Next.js Server Components or route handlers | Confirmed broken in Next.js App Router route handlers (GitHub issues #2350, #2460). The library crashes with "ba.Component is not a constructor". | Use only in Client Components with `dynamic(() => import('@react-pdf/renderer'), { ssr: false })`. |
| Encrypting all Firestore messages (general chat) | The existing general messaging system (PROJECT.md: "existing messaging system stays as-is") doesn't need encryption. Adding encryption to it retroactively breaks all existing messages. | Apply E2E encryption only to the new lawyer-client trade channels. Encrypt at the message content field level, not the document level. |
| Custom WebRTC or audio/video | PROJECT.md explicitly out-of-scope: "Video/audio calls within lawyer chat — communication stays text-based on platform" | N/A |

---

## Stack Patterns by Scenario

**For real-time negotiation offers:**
- Use Firestore `onSnapshot` on the deal's `negotiations` subcollection
- Use `runTransaction()` when accepting/rejecting an offer (read current status + write new status atomically)
- Because: A buyer accepting an offer while the seller simultaneously submits a counter-offer is a race condition — only transactions prevent this
- Data shape: `deals/{dealId}/negotiations/{roundId}` with status field: `pending_buyer | pending_seller | accepted | rejected`

**For provider portals (insurance/logistics):**
- Use Firestore `onSnapshot` on `deals/{dealId}/quotes` filtered by `providerType`
- Use Firestore security rules with `request.auth.token.role == 'insurance_provider'` or `'logistics_provider'`
- Logistics provider data shape: exclude `deal.price` field using field-level security rules (`request.resource.data.keys().hasNone(['price'])`) or via a Cloud Function that serves a sanitized view
- Because: PROJECT.md states logistics providers cannot see deal price; field exclusion at the rules level is the only guarantee

**For lawyer-client encrypted channels:**
- Channel is a Firestore subcollection: `deals/{dealId}/legalChannels/{channelId}/messages/{messageId}`
- Each party-lawyer pair gets a separate channel (buyer gets their lawyer channel; seller gets their lawyer channel)
- Encryption: libsodium `crypto_box_easy` with ECDH — each channel has a shared key derived from lawyer's public key + client's private key
- Key storage: IndexedDB, never Firestore
- Because: Two independent lawyers on the same deal must have zero visibility into each other's channels

**For versioned contract drafts:**
- Data shape: `deals/{dealId}/contractVersions/{versionId}` subcollection
- Each document: `{ content: string, authorId: string, createdAt: Timestamp, versionNumber: int, diff: string }`
- `diff` field stores the output of `diff-match-patch-es` `makePatch()` between this version and the previous — computed client-side before write
- Because: Storing raw full content + a patch per version is cheaper than full copies and enables efficient "what changed" display without re-computing diffs on read

**For role-based dashboards (same URL, filtered view):**
- The middleware already reads `session.role` from cookie
- Add new routes to `middleware.js`: `/provider/...` and `/legal/...`
- Client-side: role-conditional rendering using `session.role` from a shared auth context
- Do NOT create separate apps or domains per role — PROJECT.md: "Same app with role-filtered navigation and dashboards"

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@react-pdf/renderer@4.3.2` | React 19.x | Confirmed compatible since v4.1.0 per official docs |
| `@react-pdf/renderer@4.3.2` | Next.js 16.x | Client-side only (no SSR); requires `dynamic()` import with `ssr: false` |
| `libsodium-wrappers@0.7.13` | Browser (all modern) + Node.js 20 | Pure JS/WASM, no native bindings, works in Next.js client and Functions |
| `diff-match-patch-es@1.0.1` | ESM environments, Node 18+ | ESM only — no CommonJS. Works in Next.js App Router (ESM) and modern browsers |
| `@sendgrid/mail@8.x` | Node.js 20 (Functions) | Install only in `functions/`, not in the Next.js root. |
| `next-firebase-auth-edge@1.11.5` | Next.js 15-16, Edge runtime | Only needed if middleware moves to Edge; current middleware is Node.js |

---

## Firestore Security Rules Pattern for New Roles

The current `firestore.rules` uses `get()` to check the role field in Firestore documents. For the new provider/lawyer roles, the recommended pattern is **custom claims** to avoid per-read costs:

```javascript
// In Firebase Function (Admin SDK) — called when admin invites a provider
await admin.auth().setCustomUserClaims(uid, { role: 'insurance_provider' });

// In firestore.rules — no Firestore read needed, role is in the JWT
function hasRole(role) {
  return request.auth.token.role == role;
}

// Example: Only insurance_providers can see deal quotes with price
match /deals/{dealId}/quotes/{quoteId} {
  allow read: if hasRole('insurance_provider') &&
    request.auth.uid == resource.data.assignedProviderId;
}

// Example: Lawyer can only read their own channel
match /deals/{dealId}/legalChannels/{channelId} {
  allow read: if hasRole('lawyer') &&
    request.auth.uid == resource.data.lawyerId;
  allow read: if request.auth.uid == resource.data.clientId; // client (member)
}
```

**Important:** Custom claims are capped at **1000 bytes total** per user (official Firebase docs). A single `role` string field uses ~30 bytes — well within limits. Do NOT store arrays of deal IDs or complex objects in claims.

---

## Sources

- [Firebase Firestore onSnapshot — Official Docs](https://firebase.google.com/docs/firestore/query-data/listen) — Verified real-time listener pattern; HIGH confidence
- [Firebase Custom Claims — Official Docs](https://firebase.google.com/docs/auth/admin/custom-claims) — Verified `setCustomUserClaims`, JWT inclusion, Firestore rules usage; HIGH confidence
- [Firebase Secure Data Access for Groups — Official Docs](https://firebase.google.com/docs/firestore/solutions/role-based-access) — Verified role-based Firestore patterns; HIGH confidence
- [Firebase Transactions — Official Docs](https://firebase.google.com/docs/firestore/manage-data/transactions) — Verified atomic write patterns; HIGH confidence
- [libsodium-wrappers npm](https://www.npmjs.com/package/libsodium-wrappers) — Version 0.7.13 verified; MEDIUM confidence (npm listing)
- [diff-match-patch-es npm](https://www.npmjs.com/package/diff-match-patch-es) — Version 1.0.1 verified; MEDIUM confidence (npm listing)
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — Version 4.3.2, React 19 compatibility verified; MEDIUM confidence
- [react-pdf React 19 compatibility](https://react-pdf.org/compatibility) — Official site confirms React 19 support since v4.1.0; MEDIUM-HIGH confidence
- [react-pdf SSR bug in Next.js App Router](https://github.com/diegomura/react-pdf/issues/2350) — SSR breakage confirmed via GitHub issues; HIGH confidence (reproduces reliably)
- [next-firebase-auth-edge v1.11.5 release](https://github.com/awinogrodzki/next-firebase-auth-edge/releases) — Version confirmed released 2026-02-16; HIGH confidence
- [SubtleCrypto ECDH — MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) — Verified ECDH key derivation API; HIGH confidence (used as basis for rejecting it in favor of libsodium)
- [SendGrid Firebase Functions pattern — Twilio Blog](https://www.twilio.com/en-us/blog/email-notifications-sendgrid-firebase-functions) — Integration pattern verified; MEDIUM confidence
- [Firebase Functions v2 onDocumentCreated](https://firebase.google.com/docs/functions/firestore-events) — Already in use in codebase; HIGH confidence

---

*Stack research for: Core Trade Global — Trade Flow Features Milestone*
*Researched: 2026-02-20*
