---
phase: 01-role-system-and-infrastructure
plan: "02"
subsystem: admin-invite-and-onboarding
tags: [invite-flow, onboarding, admin, cloud-functions, firebase-auth, firestore, wizard]
dependency_graph:
  requires:
    - 01-01 (role constants, inviteUser/setUserRole/resendInvite Cloud Functions, invites collection)
  provides:
    - invite-modal
    - invite-tracking-ui
    - onboarding-wizard
    - admin-summary-stats
  affects:
    - admin panel (UsersTable now has invite flow + tab-based UI)
    - AdminSummaryStats (role counts + invite metrics)
    - onboarding route (new /onboarding page)
tech_stack:
  added:
    - framer-motion AnimatePresence (step transitions in OnboardingWizard)
    - react-hook-form + zod (InviteModal and OnboardingWizard step 1)
    - Firestore onSnapshot real-time listener (useGetInvites)
    - Firebase signInWithEmailLink flow (onboarding step 1)
    - Firebase Storage upload (profile photo in step 3)
    - resendInvite Cloud Function (functions/index.js)
  patterns:
    - Admin invite via modal -> Cloud Function -> real-time invite list
    - Email link sign-in with same-device/cross-device fallback
    - Force token refresh (getIdToken(true)) after sign-in and after onboarding
    - Role-based redirect on onboarding completion
    - Client-side expiry check for invite status (pending + past expiresAt = expired)
key_files:
  created:
    - src/presentation/hooks/admin/useInviteUser.js
    - src/presentation/hooks/admin/useGetInvites.js
    - src/presentation/hooks/admin/useResendInvite.js
    - src/presentation/components/features/admin/InviteModal/InviteModal.jsx
    - src/presentation/components/features/admin/AdminSummaryStats/AdminSummaryStats.jsx
    - src/app/(auth)/onboarding/page.jsx
    - src/presentation/components/features/onboarding/OnboardingWizard.jsx
  modified:
    - src/presentation/components/features/admin/UsersTable/UsersTable.jsx
    - functions/index.js (added resendInvite Cloud Function)
decisions:
  - "resendInvite is a separate Cloud Function — not re-calling inviteUser, avoids race conditions and keeps concerns separate"
  - "useResendInvite calls resendInvite CF (not inviteUser) — CF looks up existing user by email, regenerates sign-in link"
  - "UsersTable uses tab pattern (Users / Invites) instead of stacked sections — cleaner UX at large invite counts"
  - "handleToggleAdmin replaced with httpsCallable(functions, 'setUserRole') — no direct Firestore write"
  - "onboarding page guards: valid email link OR already authenticated; neither shows error with login link"
  - "Force getIdToken(true) twice in onboarding: after sign-in (get initial claims) and after step 4 (confirm final state)"
metrics:
  duration_minutes: 8
  completed_date: "2026-02-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 2
---

# Phase 1 Plan 2: Admin Invite Flow & Onboarding Wizard Summary

**One-liner:** Admin invite modal with real-time tracking and 4-step onboarding wizard for invited providers and lawyers

## What Was Built

Complete invite lifecycle: admins send invites via modal, track status in real-time, resend expired invites — and invited users click the email link to complete a 4-step onboarding wizard that signs them in, confirms their role, optionally uploads a photo, sets preferences, and redirects to their role-appropriate dashboard.

## Tasks Completed

### Task 1: Admin Invite Flow

**Files created:** `useInviteUser.js`, `useGetInvites.js`, `useResendInvite.js`, `InviteModal.jsx`, `AdminSummaryStats.jsx`
**Files modified:** `UsersTable.jsx`, `functions/index.js`

**`useInviteUser.js`:** Calls `inviteUser` Cloud Function via `httpsCallable`. Returns `{ inviteUser, loading, error }`. Shows toast on success/error.

**`useGetInvites.js`:** Queries `invites` collection with `onSnapshot` ordered by `invitedAt` desc. Client-side expiry check: if `status === 'pending'` and `expiresAt < now`, displays as `'expired'`. Returns `{ invites, loading, error }`.

**`useResendInvite.js`:** Calls `resendInvite` Cloud Function. Shows toast on success/error. The CF looks up the existing Auth user by email, regenerates the sign-in link, resets `expiresAt` to 7 days, and updates the invite doc.

**`InviteModal.jsx`:** Dialog with react-hook-form + zod validation. Fields: email (required, email), role (required, VALID_INVITE_ROLES dropdown), name (required, min 2), company (required, min 2). Calls `useInviteUser` on submit. Closes and resets on success.

**`UsersTable.jsx` (modified):**
- Added "Invite User" button (top-right of header)
- Tab-based layout: "Users" tab (existing table) and "Invites" tab (new invite tracking table)
- Invites table columns: Email, Role (badge), Name, Company, Status (color badges), Invited date, Actions (Resend button for pending/expired)
- Status badges: pending=yellow, accepted=green, expired=red
- Updated role filter dropdown to support all 5 roles (was only admin/member)
- `handleToggleAdmin` now calls `httpsCallable(functions, 'setUserRole')` — no direct Firestore write

**`AdminSummaryStats.jsx` (new):** Three stat sections using the existing card pattern — primary stats (total, approved, pending, verified, suspended, new), role breakdown (member, logistics, insurance, lawyer, admin), invite metrics (total, pending, accepted, expired). Uses `useGetInvites` for live invite counts.

**`functions/index.js` (modified):** Added `resendInvite` onCall Cloud Function — admin-only, looks up user by email, regenerates Firebase sign-in link, updates invite doc with new `expiresAt` and `signInLink`.

**Commit:** `ccabda1`

---

### Task 2: Onboarding Wizard for Invited Users

**Files created:** `OnboardingWizard.jsx`, `src/app/(auth)/onboarding/page.jsx`

**`OnboardingWizard.jsx`:** 4-step wizard with framer-motion `AnimatePresence` slide transitions:

- **Step 1 — Verify Identity:** `isSignInWithEmailLink` check, email pre-fill from `localStorage.emailForSignIn` (same-device), cross-device fallback (manual email input). Calls `signInWithEmailLink`, then `updatePassword`. Force-refreshes token with `getIdToken(true)`. Updates session cookie via `/api/auth/session` POST.
- **Step 2 — Confirm Details:** Fetches `users/{uid}` Firestore doc, displays name/email/company/role read-only. `RoleBadge` component shows role in dark-theme badge colors.
- **Step 3 — Profile Photo:** File input with image preview, validates type/size (max 5MB). Uploads to `users/{uid}/profile.{ext}` in Firebase Storage. Updates `updateProfile(auth.currentUser, { photoURL })` and Firestore `users/{uid}.photoURL`. Skip button available.
- **Step 4 — Preferences & Complete:** Email notifications toggle (default on), platform announcements toggle (default off). On complete: saves preferences to Firestore, sets `onboardingComplete: true`, `inviteStatus: 'accepted'`, updates `invites/{uid}` with `status: 'accepted'` and `acceptedAt`, force-refreshes token again, redirects by role: `logistics_provider`/`insurance_provider` → `/provider`, `lawyer` → `/lawyer`, default → `/`.

**`/onboarding/page.jsx`:** Client component with Suspense wrapper. Guards: checks if current URL `isSignInWithEmailLink` or user already authenticated — renders wizard for valid state, error page with login link for invalid/expired link.

**Commit:** `d3c34c4`

---

## Decisions Made

1. **Separate `resendInvite` CF:** Rather than re-calling `inviteUser` (which would fail on `auth/email-already-exists`), a dedicated `resendInvite` CF was added. It looks up the existing user by email, regenerates the sign-in link, and resets the expiry — keeping concerns separate and avoiding partial-state risks.

2. **Tab layout for UsersTable:** Users and Invites are shown in tabs rather than stacked sections, keeping the table clean even as invite volume grows.

3. **setUserRole CF for admin toggle:** `handleToggleAdmin` in UsersTable now uses `httpsCallable(functions, 'setUserRole')` — both custom claims and Firestore are updated atomically in the CF, closing the gap where a direct Firestore write would not update claims.

4. **Double token refresh in onboarding:** `getIdToken(true)` is called after sign-in (Step 1) to get initial custom claims, and again at Step 4 completion to get the final state before role-based redirect. This ensures the session cookie always reflects the current claims.

5. **Onboarding validity guard:** The page checks `isSignInWithEmailLink` OR authenticated user — the wizard handles both new sign-ins and re-visits from already-signed-in users (who may have refreshed). Invalid/expired links show a clear error with a login link.

## Deviations from Plan

### Auto-added: resendInvite Cloud Function (Rule 2)

**Found during:** Task 1
**Issue:** `useResendInvite` hook referenced `resendInvite` CF but the CF didn't exist. The plan noted that `inviteUser` CF "should handle email-already-exists" for resend, but adding that logic to `inviteUser` would conflate creation and resend semantics. A dedicated CF is cleaner and safer.
**Fix:** Added `resendInvite` onCall Cloud Function to `functions/index.js`. It looks up the existing Auth user by email, regenerates the sign-in link, and updates the invite doc.
**Files modified:** `functions/index.js`
**Commit:** `ccabda1`

## Verification Results

| Criterion | Status |
|-----------|--------|
| InviteModal renders with email, role, name, company fields | Verified (InviteModal.jsx form fields) |
| InviteModal calls inviteUser CF via httpsCallable | Verified (useInviteUser.js:25) |
| UsersTable has Invite User button | Verified (UsersTable.jsx:363) |
| UsersTable invite tracking with status badges and resend | Verified (invites tab, getInviteStatusClasses) |
| handleToggleAdmin calls setUserRole CF, not direct Firestore | Verified (UsersTable.jsx:106) |
| AdminSummaryStats shows role counts and invite metrics | Verified (AdminSummaryStats.jsx) |
| Onboarding wizard has 4 steps | Verified (STEPS array, step 1-4 render) |
| Step 1 handles same-device and cross-device | Verified (localStorage.emailForSignIn + manual input) |
| Step 1 sets password and force-refreshes token | Verified (updatePassword, getIdToken(true)) |
| Step 2 displays Firestore details | Verified (fetchUserProfile, userProfile display) |
| Step 3 has photo upload with skip | Verified (handlePhotoUpload, handleSkipPhoto) |
| Step 4 saves preferences and redirects by role | Verified (handleComplete, role-based window.location.href) |
| Invite doc status set to accepted on completion | Verified (invites/{uid} update with status: 'accepted') |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/presentation/hooks/admin/useInviteUser.js | FOUND |
| src/presentation/hooks/admin/useGetInvites.js | FOUND |
| src/presentation/hooks/admin/useResendInvite.js | FOUND |
| src/presentation/components/features/admin/InviteModal/InviteModal.jsx | FOUND |
| src/presentation/components/features/admin/UsersTable/UsersTable.jsx | FOUND |
| src/presentation/components/features/admin/AdminSummaryStats/AdminSummaryStats.jsx | FOUND |
| src/app/(auth)/onboarding/page.jsx | FOUND |
| src/presentation/components/features/onboarding/OnboardingWizard.jsx | FOUND |
| Commit ccabda1 (Task 1) | FOUND |
| Commit d3c34c4 (Task 2) | FOUND |
