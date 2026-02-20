---
status: diagnosed
phase: 01-role-system-and-infrastructure
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md
started: 2026-02-21T12:00:00Z
updated: 2026-02-21T12:15:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Admin Invite Modal
expected: In the admin panel Users section, there is an "Invite User" button (top-right). Clicking it opens a modal with 4 fields: email, role (dropdown with logistics_provider, insurance_provider, lawyer), name, and company. Submitting with valid data closes the modal and shows a success toast.
result: issue
reported: "I find invite user button I clicked it it opens a modal I filled it but we got internal error. Console shows CORS error: Access to fetch at 'https://us-central1-core-trade-global.cloudfunctions.net/inviteUser' from origin 'http://localhost:3001' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource."
severity: blocker

### 2. Invite Tracking Tab
expected: In the admin Users section, there are two tabs: "Users" and "Invites". The Invites tab shows a table with columns: Email, Role (badge), Name, Company, Status (color badges — yellow for pending, green for accepted, red for expired), Invited date, and Actions (Resend button for pending/expired invites).
result: skipped
reason: Invites tab visible but empty — no invite data exists due to CORS blocker in test 1

### 3. Admin Summary Stats
expected: The admin dashboard shows a summary stats panel with three sections: primary stats (total users, approved, pending, verified, suspended, new), role breakdown (member, logistics, insurance, lawyer, admin counts), and invite metrics (total, pending, accepted, expired).
result: pass

### 4. Role-Filtered Navbar (Member)
expected: Logged in as a regular member, the navbar shows general links (like RFQs) but does NOT show "Provider Dashboard", "Client Channels", or "Deal Review" links. Those items are completely hidden (not greyed out).
result: pass

### 5. Role-Filtered Navbar (Admin)
expected: Logged in as admin, the navbar shows all navigation links including admin-specific items, provider links, and lawyer links. Admin has access to everything.
result: issue
reported: "I cannot see anything related to providers or lawyers on navbar when I logged in as admin"
severity: major

### 6. Route Protection — Forbidden Page
expected: As a member, navigating directly to /provider or /lawyer in the browser redirects to /forbidden. The forbidden page shows an access denied message with a shield icon, displays the user's current role, and has a "Return to Dashboard" link.
result: issue
reported: "we can navigate into provider and lawyer even I logged in as a member account"
severity: blocker

### 7. RoleBadge on Profile Page
expected: Visiting your profile page shows your role as a color-coded pill badge (e.g., blue for member, red for admin) with an icon, instead of plain text.
result: pass

### 8. Provider Dashboard Placeholder
expected: As a provider or admin, navigating to /provider shows a dashboard page with a 3-tab structure: "Quote Requests", "Submitted Quotes", and "History" — each with empty state placeholders.
result: pass

### 9. Lawyer Workspace Placeholder
expected: As a lawyer or admin, navigating to /lawyer shows a workspace landing page with two card links: "Client Channels" and "Deal Review". Clicking each navigates to /lawyer/channels and /lawyer/deals respectively, both showing placeholder pages.
result: pass

### 10. Admin Role Toggle
expected: In the admin Users table, toggling a user's admin status uses the setUserRole Cloud Function (not a direct Firestore write). The role change is reflected in the user's row after the action completes.
result: issue
reported: "same CORS error when toggling admin role"
severity: blocker

## Summary

total: 10
passed: 5
issues: 4
pending: 0
skipped: 1

## Gaps

- truth: "Admin submits invite via modal and receives success toast"
  status: failed
  reason: "User reported: CORS error — inviteUser Cloud Function blocks preflight request from localhost:3001. No Access-Control-Allow-Origin header."
  severity: blocker
  test: 1
  root_cause: "Functions emulator connection is commented out in firebase.config.js (lines 56-60). Client on localhost:3001 hits production Cloud Functions endpoint which either doesn't exist or isn't deployed. The { cors: true } option on onCall v2 functions is a no-op — onCall handles CORS automatically via httpsCallable SDK, but only when the endpoint actually exists."
  artifacts:
    - path: "src/core/config/firebase.config.js"
      issue: "Lines 56-60: connectFunctionsEmulator commented out — localhost hits production"
    - path: "functions/index.js"
      issue: "{ cors: true } on onCall is irrelevant — this is an onRequest option"
  missing:
    - "Either uncomment emulator connection for local dev OR deploy functions to production"
    - "Remove misleading { cors: true } from onCall functions"

- truth: "Admin navbar shows all links including provider and lawyer links"
  status: failed
  reason: "User reported: I cannot see anything related to providers or lawyers on navbar when I logged in as admin"
  severity: major
  test: 5
  root_cause: "NAV_LINKS filter on line 132-134 of Navbar.jsx uses strict includes(user.role) with no admin override. Provider Dashboard roles array is [LOGISTICS_PROVIDER, INSURANCE_PROVIDER] and lawyer links are [LAWYER] — ADMIN is not in any of them."
  artifacts:
    - path: "src/presentation/components/homepage/Navbar/Navbar.jsx"
      issue: "Lines 132-134: filter has no admin override — admin treated as just another role"
    - path: "src/presentation/components/homepage/Navbar/Navbar.jsx"
      issue: "Lines 38-44: provider/lawyer NAV_LINKS roles arrays do not include ROLES.ADMIN"
  missing:
    - "Add admin override to filter: user.role === ROLES.ADMIN || link.roles.includes(user.role)"

- truth: "Member navigating to /provider or /lawyer is redirected to /forbidden"
  status: failed
  reason: "User reported: we can navigate into provider and lawyer even I logged in as a member account"
  severity: blocker
  test: 6
  root_cause: "Middleware logic is correct but depends on session cookie being set. Most likely FIREBASE_SERVICE_ACCOUNT_KEY is not configured in .env.local, causing verifyIdToken to fail silently (firebase-admin.js lines 33-39 logs warning and disables verification). Without token verification, session cookie is never created, so middleware sees no cookie and skips role checks."
  artifacts:
    - path: "src/lib/firebase-admin.js"
      issue: "Lines 33-39: if FIREBASE_SERVICE_ACCOUNT_KEY missing, token verification disabled"
    - path: "middleware.js"
      issue: "Logic correct but depends on session cookie existing — no fallback when cookie absent"
    - path: "src/presentation/contexts/AuthContext.jsx"
      issue: "Lines 81-93: session API call failure silently caught — user not warned"
  missing:
    - "Verify FIREBASE_SERVICE_ACCOUNT_KEY is configured in .env.local"
    - "Add /provider and /lawyer to protectedRoutes array as defense-in-depth"
    - "Add error handling in AuthContext when session API call fails"

- truth: "Admin can toggle user role via setUserRole Cloud Function"
  status: failed
  reason: "User reported: same CORS error when toggling admin role"
  severity: blocker
  test: 10
  root_cause: "Same root cause as test 1 — Functions emulator commented out, setUserRole CF called via httpsCallable hits non-existent/undeployed production endpoint"
  artifacts:
    - path: "src/core/config/firebase.config.js"
      issue: "Lines 56-60: connectFunctionsEmulator commented out"
    - path: "src/presentation/components/features/admin/UsersTable/UsersTable.jsx"
      issue: "Line 106: httpsCallable(functions, 'setUserRole') hits production"
  missing:
    - "Same fix as test 1 — enable emulator or deploy functions"
