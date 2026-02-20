# Phase 1: Role System and Infrastructure - Research

**Researched:** 2026-02-20
**Domain:** Firebase Authentication (custom claims), Firestore security rules, Next.js middleware, admin invite flow
**Confidence:** HIGH (stack already in use; research confirms patterns fit existing codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin invite flow**
- Email invite link approach: admin enters email + role + name + company, system sends invite link
- Invited user clicks link and goes through a full onboarding wizard (set password, confirm details, add profile photo, configure preferences)
- Invite links expire after 7 days; admin can resend if needed
- Single invites only (no bulk/CSV upload)

**Navigation per role**
- Top navbar with dropdowns (existing navbar pattern)
- Unified home page for all roles with role-specific content widgets (not separate dashboards per role)
- Menu items hidden completely for unauthorized areas (not greyed out)
- Existing navbar routes stay as-is; Phase 1 adds role-based filtering to show/hide items
- Existing notification bell remains unchanged
- Providers (insurance/logistics): single dashboard page with tabs/sections for requests, submitted quotes, and history
- Lawyers: separate nav items for client channels and deal review
- Admin: existing admin panel extended with role management features

**Admin panel**
- Existing table/list view extended with new role-related features
- Full CRUD + role change capabilities for admin
- Invite status tracking (pending, accepted, expired) with resend option
- Existing summary stats refined and extended with role-specific counts and invite metrics
- Invite flow via modal/dialog from user list (not separate page)
- Existing soft delete and hard delete functionality stays; integrate with role system
- No admin activity/audit log for v1

**Role visibility**
- User's own role shown on profile page only (not in navbar)
- Other users' roles shown with role badge in deal views, messages, and interactions
- Color-coded role badges: distinct color per role (e.g., blue for member, green for logistics, orange for insurance, purple for lawyer, red for admin)
- Unauthorized URL access shows a clear "You don't have access" page with link back to dashboard

### Claude's Discretion
- Exact color palette for role badges (within the color-coding decision)
- Onboarding wizard step design and flow details
- Firebase custom claims implementation approach
- Firestore security rules structure
- Role-based route guard implementation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROLE-01 | Platform supports 5 roles: member, logistics_provider, insurance_provider, lawyer, admin | Firebase custom claims with `setCustomUserClaims` sets role on the Auth token; Firestore `users` doc mirrors it |
| ROLE-02 | Buyer/seller is contextual per deal — role determined by deal participation, not at registration | No role change needed; member users have one role; deal collection tracks who is buyer/seller per deal |
| ROLE-03 | Admin can create and invite provider and lawyer accounts (no self-registration) | Cloud Function: `createUser` + `setCustomUserClaims` + `generateSignInWithEmailLink` stored in Firestore `invites` collection |
| ROLE-04 | Role-based navigation shows relevant dashboard and menu items per role | Existing Navbar reads `user.role` from AuthContext; extend `NAV_LINKS` with role filtering; add provider/lawyer-only routes |
| ROLE-05 | Firestore security rules enforce role-based access independently of middleware | Replace current Firestore `isAdmin()` (which reads user doc) with `request.auth.token.role` custom claims check — no round-trip reads |
| ROLE-06 | No role overlap — each account has exactly one role that cannot be changed by the user themselves | Cloud Function enforces role assignment; Firestore rules block user from writing their own `role` field; admin-only role mutation |
</phase_requirements>

---

## Summary

The project already runs Next.js 16.1.6 with Firebase 12.4.0 (client) and firebase-admin 13.6.1, plus a Cloud Functions setup that has admin-SDK patterns in use (see `functions/index.js`). The existing auth system stores `role` in the Firestore `users` doc and reads it in the session cookie and `AuthContext`. Phase 1 extends this in two ways: (1) add Firebase custom claims so `role` is also baked into the JWT token (enabling stateless middleware checks and Firestore rule checks without document reads), and (2) build the invite system that creates provider/lawyer accounts via admin action.

The session cookie at `/api/auth/session` currently writes the role from the client body — a comment in the code already flags this as a security concern. Phase 1 should fix that gap by reading role from the verified ID token's custom claims instead of from the client request body. This makes middleware role checks trustworthy without any architectural change to the session pattern.

The key architectural insight: the existing codebase already has the plumbing for role-aware middleware (`session?.role`), role-aware navbar (`user.role === 'admin'`), and role-aware UI (`UsersTable` filters by role). Phase 1 is **extension work, not rewrite work**. The primary new work is: custom claims, the invite Cloud Function, the onboarding wizard, the invite-management admin UI, role-specific nav items/routes, a forbidden page, updated Firestore rules, and role badge components.

**Primary recommendation:** Implement Firebase custom claims as the single source of truth for role enforcement (middleware + Firestore rules), mirror to Firestore `users.role` for UI reads, and build the invite system as a Cloud Function with an `invites` Firestore collection managing lifecycle.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase-admin | 13.6.1 (already installed) | `setCustomUserClaims`, `createUser`, `generateSignInWithEmailLink`, `verifyIdToken` | Only way to set custom claims — must run server-side |
| firebase (client) | 12.4.0 (already installed) | `getIdToken(true)` to force refresh after claims set | Standard Firebase pattern |
| Next.js middleware | 16.1.6 (already installed) | Route protection based on session cookie role | Existing pattern in `middleware.js` |
| Firestore security rules | N/A (already in use) | Independent role enforcement via `request.auth.token.role` | Required by ROLE-05 |
| react-hook-form + zod | 7.66.0 / 4.1.12 (already installed) | Onboarding wizard form validation | Already used throughout the project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hot-toast | 2.6.0 (already installed) | Feedback on invite send/resend/onboarding steps | Already used project-wide |
| framer-motion | 12.33.0 (already installed) | Onboarding wizard step transitions (Claude's discretion) | Already available |
| lucide-react | 0.560.0 (already installed) | Role badge icons, wizard step indicators | Already used throughout |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Firebase custom claims | Role stored only in Firestore user doc (current approach) | Current approach requires a Firestore doc read in every security rule — custom claims are in the JWT, no read needed; much more efficient and secure |
| `generateSignInWithEmailLink` (passwordless link) | `generatePasswordResetLink` on pre-created account | Sign-in link is cleaner for invited users who have no password yet; password reset link requires existing password (not applicable here) |
| Custom `invites` Firestore collection | Firebase Dynamic Links | Dynamic Links is deprecated; custom collection gives full control over invite status tracking |
| Firestore TTL policy for invite expiry | Scheduled Cloud Function cleanup | TTL policies are the modern approach for auto-deleting expired invite docs; simpler than Cloud Tasks |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── app/
│   ├── (auth)/
│   │   └── onboarding/          # Invite acceptance + wizard
│   │       └── page.jsx
│   ├── (main)/
│   │   ├── provider/            # Provider dashboard (insurance/logistics)
│   │   │   └── page.jsx
│   │   ├── lawyer/              # Lawyer workspace
│   │   │   └── page.jsx
│   │   └── forbidden/           # "You don't have access" page
│   │       └── page.jsx
├── presentation/
│   ├── components/
│   │   ├── common/
│   │   │   └── RoleBadge/       # Color-coded role badge component
│   │   │       └── RoleBadge.jsx
│   │   └── features/
│   │       ├── admin/
│   │       │   └── InviteModal/ # Invite flow modal (from user list)
│   │       │       └── InviteModal.jsx
│   │       └── onboarding/      # Onboarding wizard steps
│   │           └── OnboardingWizard.jsx
│   └── hooks/
│       └── admin/
│           ├── useInviteUser.js
│           ├── useResendInvite.js
│           └── useGetInvites.js
├── core/
│   └── constants/
│       └── roles.js             # Role constants and config
functions/
└── index.js                     # Add inviteUser Cloud Function
```

### Pattern 1: Firebase Custom Claims — Setting Role on Account Creation/Invite

**What:** When admin invites a provider/lawyer, a Cloud Function creates the Firebase Auth user, sets custom claims, and generates an invite link. When an existing member is promoted to admin, the admin panel calls the same claim-setting function.

**When to use:** Any time a role is assigned or changed (invite creation, admin toggle).

**Example (Cloud Function addition to `functions/index.js`):**
```javascript
// Source: Official Firebase pattern — admin.auth().setCustomUserClaims
exports.inviteUser = onCall({ cors: true }, async (request) => {
  const { email, role, name, company } = request.data;
  const auth = request.auth;

  // Only admins can invite
  const isAdmin = await isUserAdmin(auth.uid);
  if (!isAdmin) throw new HttpsError('permission-denied', 'Admins only.');

  const validRoles = ['logistics_provider', 'insurance_provider', 'lawyer'];
  if (!validRoles.includes(role)) throw new HttpsError('invalid-argument', 'Invalid role.');

  // 1. Create the Firebase Auth user (no password — passwordless invite)
  const userRecord = await admin.auth().createUser({ email, displayName: name });

  // 2. Set custom claims immediately
  await admin.auth().setCustomUserClaims(userRecord.uid, { role });

  // 3. Create Firestore user doc with invited status
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  await db.collection('users').doc(userRecord.uid).set({
    email,
    displayName: name,
    companyName: company,
    role,
    inviteStatus: 'pending',
    invitedBy: auth.uid,
    invitedAt: admin.firestore.Timestamp.now(),
    createdAt: admin.firestore.Timestamp.now(),
    emailVerified: false,
    adminApproved: true, // Providers/lawyers are pre-approved
  });

  // 4. Store invite record in `invites` collection (for resend/tracking)
  await db.collection('invites').doc(userRecord.uid).set({
    email,
    role,
    name,
    company,
    status: 'pending',
    invitedBy: auth.uid,
    invitedAt: admin.firestore.Timestamp.now(),
    expiresAt,
    expireAt: expiresAt, // Also set TTL field for Firestore TTL policy
  });

  // 5. Generate sign-in link pointing to /onboarding
  const actionCodeSettings = {
    url: `${process.env.APP_URL}/onboarding?uid=${userRecord.uid}`,
    handleCodeInApp: true,
  };
  const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

  // 6. Send invite email (use existing email infrastructure or Firebase email extension)
  // ... send email with `link` ...

  return { success: true, uid: userRecord.uid };
});
```

### Pattern 2: Custom Claims in Firestore Security Rules

**What:** Replace the current `isAdmin()` helper (which reads the Firestore user doc) with a `request.auth.token.role` check from the JWT. This is the required pattern for ROLE-05: rules enforce access independently of middleware, with no round-trip reads.

**When to use:** All Firestore rules that need role-based gating.

**Example (replacing current `firestore.rules` pattern):**
```javascript
// Source: Firebase docs — request.auth.token for custom claims
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: role from custom claim (no Firestore read needed)
    function userRole() {
      return request.auth.token.role;
    }

    function isAdmin() {
      return isAuthenticated() && userRole() == 'admin';
    }

    function isProvider() {
      return isAuthenticated() && (
        userRole() == 'logistics_provider' ||
        userRole() == 'insurance_provider'
      );
    }

    function isLawyer() {
      return isAuthenticated() && userRole() == 'lawyer';
    }

    function isMember() {
      return isAuthenticated() && userRole() == 'member';
    }

    // Insurance-only data example
    match /insuranceQuotes/{quoteId} {
      allow read: if isAuthenticated() && (
        userRole() == 'insurance_provider' || isAdmin()
      );
      allow write: if isAuthenticated() && (
        userRole() == 'insurance_provider' || isAdmin()
      );
    }

    // Logistics providers cannot read insurance collections (ROLE-05)
    // The rule structure itself enforces this — logistics_provider
    // does not match 'insurance_provider' so access is denied.
  }
}
```

### Pattern 3: Custom Claims in Next.js Middleware

**What:** The existing `middleware.js` reads `session?.role` from a JSON cookie. After Phase 1, the session cookie will be set from verified ID token claims (not client-supplied role), making middleware role checks trustworthy. The session API route at `/api/auth/session` needs to be updated.

**When to use:** Route protection for provider/lawyer/admin-only routes.

**Example (updated `middleware.js`):**
```javascript
// Current middleware already has the pattern — just extend protectedRoutes
const providerRoutes = ['/provider'];
const lawyerRoutes = ['/lawyer'];

// In the middleware function:
const isProviderRoute = providerRoutes.some(r => pathname.startsWith(r));
const isLawyerRoute = lawyerRoutes.some(r => pathname.startsWith(r));

if (isProviderRoute && !['logistics_provider', 'insurance_provider'].includes(session?.role)) {
  return NextResponse.redirect(new URL('/forbidden', request.url));
}
if (isLawyerRoute && session?.role !== 'lawyer') {
  return NextResponse.redirect(new URL('/forbidden', request.url));
}
```

**Updated session API route (security fix):**
```javascript
// /api/auth/session/route.js — get role from verified token, not request body
const decodedToken = await auth.verifyIdToken(idToken);
// decodedToken.role contains the custom claim — do not use role from request body
const sessionData = JSON.stringify({
  uid: decodedToken.uid,
  email: decodedToken.email,
  role: decodedToken.role || 'member', // ← from verified JWT, not client
  verified: true,
});
```

### Pattern 4: Token Refresh After Claims Change

**What:** Custom claims only appear in the client after the ID token is refreshed. After admin sets a custom claim, the client must force-refresh.

**When to use:** After any role assignment (invite acceptance, admin toggle).

**Example (in AuthContext or onboarding completion):**
```javascript
// Source: Firebase docs — getIdToken(true) forces refresh
const currentUser = auth.currentUser;
if (currentUser) {
  const freshToken = await currentUser.getIdToken(true); // force refresh
  // Now post freshToken to /api/auth/session to update cookie
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: freshToken }),
  });
}
```

### Pattern 5: Role-Based Navbar Filtering

**What:** The existing `NAV_LINKS` array is extended to include `allowedRoles` metadata. The `Navbar` component already reads `user.role` from `useAuth()`. Filter the rendered links based on role.

**When to use:** Any navigation item that is role-specific.

**Example (in `Navbar.jsx`):**
```javascript
// Extended NAV_LINKS with role gates
const NAV_LINKS = [
  { label: 'Products', href: '/products', roles: null }, // null = all roles
  { label: 'RFQs', href: '/requests', roles: ['member', 'admin'] },
  { label: 'Provider Dashboard', href: '/provider', roles: ['logistics_provider', 'insurance_provider'] },
  { label: 'Client Channels', href: '/lawyer/channels', roles: ['lawyer'] },
  { label: 'Deal Review', href: '/lawyer/deals', roles: ['lawyer'] },
  // ... existing links ...
];

// In render:
const visibleLinks = NAV_LINKS.filter(link =>
  link.roles === null || (user && link.roles.includes(user.role))
);
```

### Pattern 6: Invite Status Lifecycle in Firestore

**What:** The `invites` collection tracks invite lifecycle. Firestore TTL policy on `expireAt` auto-deletes expired invites after ~24h delay.

**Invite document schema:**
```javascript
{
  email: "provider@example.com",
  role: "logistics_provider",
  name: "John Smith",
  company: "Smith Logistics",
  status: "pending" | "accepted" | "expired",
  invitedBy: "adminUid",
  invitedAt: Timestamp,
  expiresAt: Timestamp,  // 7 days from invite
  expireAt: Timestamp,   // Same as expiresAt — Firestore TTL field name
  acceptedAt: Timestamp | null,
}
```

**Note:** Firestore TTL policies delete within ~24h of expiration, not exactly at expiration. For invite status display, check `expiresAt < now()` client-side and show as "expired" even if the document still exists.

### Pattern 7: Onboarding Wizard for Invited Users

**What:** Invited users arrive at `/onboarding?uid=XXX` via the email link. The wizard completes their profile setup in multiple steps.

**Wizard steps (Claude's discretion on exact flow):**
1. Verify identity / set password (using `signInWithEmailLink` from Firebase client SDK)
2. Confirm name, company, role (read-only display — pre-filled from invite)
3. Add profile photo (upload to Firebase Storage, existing `uploadCompanyLogo` pattern)
4. Configure notifications/preferences
5. Completion → redirect to role-appropriate dashboard

**Key technical requirement:** After step 1 (sign-in with link completes), force refresh ID token (`getIdToken(true)`) before proceeding — this ensures custom claims are loaded into the session.

### Anti-Patterns to Avoid

- **Storing role only in Firestore user doc (without custom claims):** Firestore security rules would need a `get()` call to read the user's role on every operation — expensive, hits rate limits, and can cause race conditions. Use `request.auth.token.role` instead.
- **Trusting client-supplied role in session API:** The current `/api/auth/session` takes `role` from the POST body. After Phase 1, the session route must extract role from the verified ID token, not from `request.json().role`.
- **Checking role in UI only (not middleware + rules):** ROLE-05 requires Firestore rules to enforce access independently. Never rely on nav hiding alone.
- **Updating Firestore `users.role` without also updating custom claims:** These two must stay in sync. Always set custom claims first (server-side), then update Firestore. If they diverge, the JWT is authoritative for Firestore rules.
- **Setting custom claims from client SDK:** Custom claims can only be set from Firebase Admin SDK (server-side). Never expose a client-callable mechanism to set claims.
- **Forgetting to force-refresh the token after setting claims:** New claims don't appear in `request.auth.token` in Firestore rules until the next token refresh (typically 1 hour). For admin actions that take immediate effect, the session must be updated via `getIdToken(true)` after the claim is set.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role enforcement in Firestore | Custom field checks in rules that read user documents | `request.auth.token.role` from custom claims | Firestore document reads in rules are expensive and can hit per-document rate limits |
| Invite link generation | Custom token/UUID in Firestore | Firebase Admin `generateSignInWithEmailLink` | Firebase handles link signing, expiry, one-time use, and the sign-in flow |
| Token refresh after claim change | Custom polling or WebSocket | `currentUser.getIdToken(true)` | Firebase ID tokens auto-refresh every hour; force-refresh is a built-in SDK method |
| Invite doc expiry cleanup | Scheduled Cloud Function | Firestore TTL policy (`expireAt` field) | Native TTL is simpler; no Cloud Scheduler needed |
| Password setup for invited users | Custom password-set flow | Firebase `signInWithEmailLink` + then `updatePassword` | Firebase already handles the invite link auth flow |

**Key insight:** Firebase custom claims are the canonical way to do role-based access in Firebase. The Admin SDK, Firestore rules, and client SDK all have first-class support for this pattern. Building custom role storage outside the JWT adds complexity with no benefit.

---

## Common Pitfalls

### Pitfall 1: Token Refresh Lag After Setting Custom Claims

**What goes wrong:** Admin invites a user and sets custom claims. The invited user completes onboarding and signs in. Their Firestore rules still deny access because the old ID token (without custom claims) is still in use.

**Why it happens:** Firebase ID tokens are cached and only refresh every hour by default. Custom claims set after the last token issuance are not visible until the next refresh.

**How to avoid:** After the onboarding wizard's first step (sign-in with email link), call `getIdToken(true)` to force a token refresh before proceeding to profile setup or the dashboard. Update the session cookie with the fresh token.

**Warning signs:** Provider/lawyer user gets "access denied" on their dashboard immediately after completing onboarding.

### Pitfall 2: Firestore `isAdmin()` Still Uses Document Read

**What goes wrong:** The existing `firestore.rules` defines `isAdmin()` as a `get()` call to read the user document. If Phase 1 adds new role checks using the same pattern, it compounds the read overhead and creates rules that can be bypassed if the user document is temporarily unavailable.

**Why it happens:** The current code predates custom claims. The existing `isAdmin()` in `firestore.rules` reads: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`.

**How to avoid:** When rewriting rules for Phase 1, replace all `get()` role checks with `request.auth.token.role`. The global admin override (`match /{document=**}`) should also use custom claims: `request.auth.token.role == 'admin'`.

**Warning signs:** Security rules tests pass locally but time out in production under load.

### Pitfall 3: Role in Firestore and Claims Get Out of Sync

**What goes wrong:** Admin changes a user's role in the `users` Firestore doc but forgets to update custom claims (or vice versa). UI shows one role, Firestore rules enforce another.

**Why it happens:** Role exists in two places: `users/{uid}.role` (for UI display) and Firebase Auth custom claims (for enforcement). They must be updated together.

**How to avoid:** All role mutations go through a single Cloud Function (e.g., `setUserRole`) that atomically updates both the custom claim and the Firestore doc. Never update `users.role` directly from a client or from an admin panel direct Firestore write.

**Warning signs:** A user sees themselves as "member" in the UI but can access provider-only pages.

### Pitfall 4: Session Cookie Contains Stale Role

**What goes wrong:** Admin demotes a user from admin to member. The user's session cookie still says `role: 'admin'`, so middleware still lets them into `/admin` until the cookie expires (7 days).

**Why it happens:** The session cookie is set once at login and not automatically refreshed when claims change.

**How to avoid:** After admin demotes a user, the user must log out and log back in for the new session cookie to be issued. For immediate enforcement, add server-side session invalidation (Cloud Function revokes refresh tokens: `admin.auth().revokeRefreshTokens(uid)`). For Phase 1, document this limitation; immediate revocation is a Phase 7 hardening concern.

**Warning signs:** Demoted admin can still access `/admin` without logging out.

### Pitfall 5: Invite Link Accepted on a Different Browser/Device

**What goes wrong:** User opens invite link on mobile, then tries to complete onboarding on desktop. The `signInWithEmailLink` is device/browser-bound for security — the link is for the device that initiated sign-in.

**Why it happens:** Firebase email link auth stores a local state (`emailForSignIn` in localStorage) on the device that sends the request. The email must be re-entered on a different device.

**How to avoid:** The onboarding page should handle the case where `isSignInWithEmailLink(window.location.href)` is true but no local `emailForSignIn` is found — prompt the user to enter their email manually before calling `signInWithEmailLink`.

**Warning signs:** Invited user reports "invalid action link" error on first click.

### Pitfall 6: Existing Member Accounts Break

**What goes wrong:** Existing member accounts were created without custom claims. After Phase 1, Firestore rules require `request.auth.token.role == 'member'` but existing tokens have no `role` claim.

**Why it happens:** Custom claims are only set when the invite function runs. Pre-existing accounts have no claim.

**How to avoid:** The Firestore rules must handle the missing claim gracefully. For member-accessible collections, use: `request.auth.token.role == 'member' || request.auth.token.role == null`. Also write a one-time Cloud Function migration that runs `setCustomUserClaims` for all existing users. Per the CONTEXT.md decision: "Existing member accounts continue to work without migration" — this means the rules must tolerate null/missing role claims as equivalent to `member`.

**Warning signs:** Existing users cannot read products or RFQs after rules are deployed.

---

## Code Examples

Verified patterns from existing codebase and official Firebase sources:

### Setting custom claims in Cloud Function (new inviteUser function)
```javascript
// Source: firebase-admin SDK, functions/index.js pattern
await admin.auth().createUser({ email, displayName: name });
await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'logistics_provider' });
```

### Reading custom claims in Firestore security rules
```javascript
// Source: firebase.google.com/docs/auth/admin/custom-claims
function userRole() {
  return request.auth.token.role;
}
allow read: if userRole() == 'insurance_provider' || userRole() == 'admin';
```

### Force-refreshing token after claim change (client-side)
```javascript
// Source: Firebase JS SDK docs
const user = auth.currentUser;
const freshToken = await user.getIdToken(/* forceRefresh */ true);
// Then update session cookie with freshToken
await fetch('/api/auth/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken: freshToken }),
});
```

### Firestore TTL policy for invite expiry
```javascript
// Source: firebase.google.com/docs/firestore/ttl
// In invite document:
{
  expireAt: admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )
}
// Configure TTL policy in Firebase Console: Collection=invites, Field=expireAt
```

### Session API route — reading role from verified token (not request body)
```javascript
// Source: existing /api/auth/session/route.js pattern, security improvement
const decodedToken = await verifyIdToken(idToken); // returns { uid, email, role }
// Note: verifyIdToken currently only returns uid and email — needs to also return role claim
// Update verifyIdToken in /src/lib/firebase-admin.js:
const decodedToken = await auth.verifyIdToken(idToken);
return { valid: true, uid: decodedToken.uid, email: decodedToken.email, role: decodedToken.role };
```

### Role filter in Navbar
```javascript
// Source: existing Navbar.jsx pattern, extended
const NAV_LINKS = [
  { label: 'Products', href: '/products', roles: null }, // all roles
  { label: 'Provider Dashboard', href: '/provider', roles: ['logistics_provider', 'insurance_provider'] },
  { label: 'Client Channels', href: '/lawyer/channels', roles: ['lawyer'] },
];
// Filter:
const visibleLinks = NAV_LINKS.filter(l => !l.roles || (user && l.roles.includes(user.role)));
```

### Existing `handleToggleAdmin` pattern (reference for role mutation)
```javascript
// Source: src/presentation/components/features/admin/UsersTable/UsersTable.jsx
// Currently updates Firestore directly — Phase 1 should route through Cloud Function
const userRepository = container.getUserRepository();
await userRepository.update(user.id, { role: newRole }); // ← REPLACE THIS
// with:
const setUserRole = httpsCallable(functions, 'setUserRole');
await setUserRole({ userId: user.id, role: newRole }); // ← calls CF that sets both claims + Firestore
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firestore doc read in security rules for role | `request.auth.token.role` from custom claims | 2018–present (but many apps still use old approach) | No round-trip reads; rules work independently of middleware (ROLE-05) |
| Custom email link infrastructure | Firebase Admin `generateSignInWithEmailLink` | Firebase SDK v9+ | Handles link signing, expiry, one-time use natively |
| Firebase Dynamic Links for invite URLs | Custom URL in `ActionCodeSettings` | Dynamic Links deprecated Nov 2025 | Must use `url` parameter in `ActionCodeSettings` pointing to own domain |
| Scheduled Cloud Function for doc TTL | Firestore native TTL policy (`expireAt` field) | Firebase 2022+ | No scheduler needed; simpler setup |
| `getIdToken()` with no argument | `getIdToken(true)` to force refresh | N/A (always available) | Must use `true` argument after claims change to get fresh token |

**Deprecated/outdated:**
- Firebase Dynamic Links: Deprecated and shut down November 2025 — do not use for invite links. Use standard HTTPS URLs in `ActionCodeSettings`.
- Checking role via `get()` in Firestore rules: Works but is expensive and creates implicit dependency on user document availability. Replace with `request.auth.token.role`.
- Trusting `role` from POST body in session API: Security gap already noted in codebase comments. Phase 1 closes this.

---

## Open Questions

1. **Email delivery for invites**
   - What we know: The project uses Firebase's built-in email for verification/password reset (Gmail SMTP via Firebase). The `functions/index.js` sends push notifications via FCM but does not send transactional email.
   - What's unclear: Is Firebase's built-in email template system sufficient for invite emails, or does the project need an external email service (Resend, Sendgrid)? Firebase templates are limited in customization.
   - Recommendation: For Phase 1, use Firebase Admin `generateSignInWithEmailLink` and rely on the existing Firebase email delivery (which already works for verification emails). If custom invite email branding is needed, the Firestore Send Email extension is the simplest Firebase-native option. This is Claude's discretion.

2. **Role claim on existing member accounts**
   - What we know: The CONTEXT.md states "Existing member accounts continue to work without migration." Firestore rules currently do not check custom claims.
   - What's unclear: The rules migration and member account backfill must be sequenced carefully. If rules are deployed before existing members get claims, members cannot access their data.
   - Recommendation: Deploy rules with null-role fallback first (`request.auth.token.role == null || request.auth.token.role == 'member'` treated as member). Then run a one-time Admin SDK migration script to set `{ role: 'member' }` claims on all existing users. Then tighten rules. The migration script can be a one-time Cloud Function triggered by an admin HTTP call.

3. **Admin role claim for the existing admin account**
   - What we know: At least one admin exists (set via `user.role === 'admin'` in Firestore). After Phase 1, admin claims must also be set.
   - What's unclear: How to bootstrap the first admin's claim without a UI (chicken-and-egg).
   - Recommendation: Provide a one-time admin bootstrap script (Node.js script using Admin SDK, not a Cloud Function) that sets `{ role: 'admin' }` on the known admin UID. This is a safe one-time operation during deployment.

4. **`setUserRole` Cloud Function — admin demotion security**
   - What we know: The current `handleToggleAdmin` in `UsersTable` directly writes to Firestore. This does not update custom claims.
   - What's unclear: Phase 1 must decide whether to add a `setUserRole` Cloud Function for admin toggles, or handle this differently.
   - Recommendation: Yes, add `setUserRole` Cloud Function (callable, admin-only) that atomically sets both custom claims and Firestore `users.role`. The `handleToggleAdmin` in `UsersTable` calls the Cloud Function instead of writing Firestore directly. This is the only correct approach.

---

## Sources

### Primary (HIGH confidence)
- Firebase official docs: `firebase.google.com/docs/auth/admin/custom-claims` — custom claims API, size limits, `setCustomUserClaims`, token refresh
- Firebase official docs: `firebase.google.com/docs/auth/admin/email-action-links` — `generateSignInWithEmailLink` with `ActionCodeSettings`
- Firebase official docs: `firebase.google.com/docs/rules/rules-and-auth` — `request.auth.token` in Firestore rules
- Firebase official docs: `firebase.google.com/docs/firestore/solutions/role-based-access` — role-based access patterns
- Firebase official docs: `firebase.google.com/docs/firestore/ttl` — Firestore TTL policy
- Existing codebase: `functions/index.js` — Cloud Function patterns (banUser, deleteUser, isUserAdmin, onCall)
- Existing codebase: `src/app/api/auth/session/route.js` — session cookie pattern
- Existing codebase: `src/presentation/components/homepage/Navbar/Navbar.jsx` — existing nav + role check
- Existing codebase: `middleware.js` — existing route protection
- Existing codebase: `firestore.rules` — current rules structure
- Existing codebase: `src/presentation/contexts/AuthContext.jsx` — auth flow + session update

### Secondary (MEDIUM confidence)
- WebSearch: freecodecamp.org/news/firebase-rbac-custom-claims-rules — RBAC patterns with custom claims, confirmed against Firebase docs
- WebSearch: medium.com/firebase-developers/patterns-for-security-with-firebase — supercharged custom claims pattern (document reads in rules are expensive)
- WebSearch: next-firebase-auth-edge-docs.vercel.app — edge middleware patterns for Firebase auth

### Tertiary (LOW confidence)
- WebSearch: `isSignInWithEmailLink` cross-device behavior — confirmed in multiple sources but not verified against official Firebase JS SDK v12 docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, patterns confirmed in official docs
- Architecture: HIGH — existing codebase provides 80% of the patterns; extensions are straightforward
- Pitfalls: HIGH — most pitfalls are confirmed by official Firebase documentation warnings and existing code comments
- Invite flow: MEDIUM — `generateSignInWithEmailLink` is the right API; exact email delivery mechanism has one open question

**Research date:** 2026-02-20
**Valid until:** 2026-08-20 (Firebase Admin SDK and custom claims API is stable; unlikely to change)
