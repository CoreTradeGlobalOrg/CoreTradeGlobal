---
phase: 01-role-system-and-infrastructure
plan: "01"
subsystem: role-system
tags: [roles, custom-claims, cloud-functions, firestore-rules, security, session]
dependency_graph:
  requires: []
  provides:
    - role-constants
    - invite-user-cloud-function
    - set-user-role-cloud-function
    - migrate-existing-users-cloud-function
    - session-api-security-fix
    - firestore-custom-claims-rules
  affects:
    - middleware (role enforcement via session cookie)
    - all Firestore rules (custom claims pattern)
    - admin panel (uses setUserRole instead of direct Firestore write)
tech_stack:
  added:
    - Firebase custom claims (JWT role enforcement)
    - inviteUser onCall Cloud Function
    - setUserRole onCall Cloud Function
    - migrateExistingUsers onCall Cloud Function
  patterns:
    - Custom claims as single source of truth for role enforcement
    - Null-role fallback: legacy accounts without claims treated as member
    - Admin check via custom claims first, Firestore fallback for legacy
    - TTL via expireAt field in invites collection
key_files:
  created:
    - src/core/constants/roles.js
  modified:
    - functions/index.js
    - src/lib/firebase-admin.js
    - src/app/api/auth/session/route.js
    - firestore.rules
decisions:
  - "Custom claims (not Firestore reads) are the source of truth for role enforcement in rules and session"
  - "inviteUser generates sign-in link stored in invite doc for resend capability"
  - "isUserAdmin helper updated to check claims first — avoids Firestore read for every admin check"
  - "isMember() includes null fallback (userRole() == null) for existing accounts without claims"
  - "Users cannot self-modify role field in Firestore (blocked at rules level)"
  - "invites TTL uses expireAt field — configure Firebase Console TTL policy manually"
metrics:
  duration_minutes: 2
  completed_date: "2026-02-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 1 Plan 1: Role System Foundation Summary

**One-liner:** JWT custom claims role system with inviteUser/setUserRole/migrateExistingUsers Cloud Functions and security-hardened Firestore rules

## What Was Built

The foundational role layer that all Phase 1 work depends on. Custom claims are now the single source of truth for role enforcement across Firestore rules, middleware, and session cookies.

## Tasks Completed

### Task 1: Role Constants and Cloud Functions

**Files:** `src/core/constants/roles.js`, `functions/index.js`

Created `src/core/constants/roles.js` with:
- `ROLES` object: 5 roles (member, logistics_provider, insurance_provider, lawyer, admin)
- `ROLE_VALUES` array (all role strings)
- `VALID_INVITE_ROLES` array (logistics_provider, insurance_provider, lawyer)
- `ROLE_DISPLAY_NAMES`, `ROLE_BADGE_COLORS`, `ROLE_CONFIG` with color config (blue/green/orange/purple/red)
- `isValidRole()` and `isInviteableRole()` helpers

Added three Cloud Functions to `functions/index.js`:

**`inviteUser` (onCall, admin-only):**
- Validates caller is admin (claims-first check) and role is inviteable
- Creates Firebase Auth user, sets custom claims `{ role }`
- Creates `users/{uid}` Firestore doc (inviteStatus: 'pending', adminApproved: true)
- Generates sign-in link stored in `invites/{uid}` for resend capability
- `invites/{uid}` includes `expireAt` TTL field (7 days)

**`setUserRole` (onCall, admin-only):**
- Validates all 5 roles; blocks self-demotion
- Atomically updates custom claims + Firestore `users/{userId}.role`
- Replaces direct Firestore writes for role changes (e.g., handleToggleAdmin)

**`migrateExistingUsers` (onCall, admin-only):**
- Lists all Firebase Auth users in batches of 1000
- Skips users who already have a role claim
- Sets `member` by default; checks Firestore for legacy `admin` role and sets `admin` claim instead
- Safe to run multiple times

Also updated `isUserAdmin` helper to check custom claims first (avoids a Firestore read per admin action for users with claims set).

**Commit:** `7f17d10`

---

### Task 2: Session API Security Fix and Firestore Rules Rewrite

**Files:** `src/lib/firebase-admin.js`, `src/app/api/auth/session/route.js`, `firestore.rules`

**`src/lib/firebase-admin.js`:**
- `verifyIdToken` now returns `role: decodedToken.role || null`
- Role is available to session API without additional Firestore lookups

**`src/app/api/auth/session/route.js` (security fix):**
- `role` no longer destructured from request body
- `verifiedRole = verification.role || 'member'` — role from verified JWT claims only
- Closes the security gap where any client could pass an arbitrary role string

**`firestore.rules` (full rewrite):**
- Added role helper functions: `userRole()`, `isAdmin()`, `isMember()`, `isProvider()`, `isInsuranceProvider()`, `isLogisticsProvider()`, `isLawyer()`, `isOwner()`
- All role checks use `request.auth.token.role` — no `get()` calls for role checking
- `isMember()` includes `userRole() == null` fallback for existing member accounts
- `users/{userId}` update rule blocks self-modification of role field
- `invites/{inviteId}` collection is admin-only (read + write)
- Preserved all existing rules for products, requests, messages, conversations, categories, fairs, news, newsletter, notifications
- Retained `get()` calls only for non-role data (RFQ ownership, conversation participant lists)

**Commit:** `0b1763a`

---

## Decisions Made

1. **Custom claims as role source of truth:** All role checks use `request.auth.token.role` in Firestore rules, eliminating the Firestore read on every rule evaluation and preventing role escalation via document manipulation.

2. **isUserAdmin claims-first pattern:** The `isUserAdmin` helper in Cloud Functions now checks custom claims first, falling back to Firestore only for legacy accounts. This reduces latency for admin checks as claims are adopted.

3. **Null-role fallback for member:** `isMember()` treats `null` claims the same as `'member'` — existing accounts continue to work without requiring immediate migration.

4. **Session role from verified token:** Closed the security gap where a client could pass an arbitrary role in the POST body. Role is now always read from the server-verified Firebase ID token.

5. **invites TTL via expireAt:** Using Firebase Console TTL policy (Collection=invites, Field=expireAt) rather than a scheduled Cloud Function for invite expiry.

6. **Sign-in link in invite doc:** Stored the generated sign-in link in the invite document for resend capability without regenerating.

## Verification Results

| Criterion | Status |
|-----------|--------|
| `request.auth.token.role` in firestore.rules | 2 occurrences (userRole() helper, isMember() null check) |
| 3 Cloud Functions exported | inviteUser, setUserRole, migrateExistingUsers |
| roles.js exports 5 roles with badge colors | ROLES, ROLE_VALUES, VALID_INVITE_ROLES, ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS, ROLE_CONFIG |
| Session route no longer reads role from request body | const { idToken } = await request.json() |
| functions/index.js syntax | node -c passes |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/core/constants/roles.js | FOUND |
| functions/index.js | FOUND |
| src/lib/firebase-admin.js | FOUND |
| src/app/api/auth/session/route.js | FOUND |
| firestore.rules | FOUND |
| 01-01-SUMMARY.md | FOUND |
| Commit 7f17d10 (Task 1) | FOUND |
| Commit 0b1763a (Task 2) | FOUND |
