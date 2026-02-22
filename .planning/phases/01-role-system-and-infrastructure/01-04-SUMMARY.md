---
phase: 01-role-system-and-infrastructure
plan: 04
subsystem: auth
tags: [firebase, cloud-functions, emulator, navbar, session, cors]

# Dependency graph
requires:
  - phase: 01-role-system-and-infrastructure
    provides: Role system, Cloud Functions (inviteUser, setUserRole), session cookie API, Navbar with role filtering
provides:
  - Functions emulator connected in development mode (no CORS errors on inviteUser/setUserRole)
  - Admin navbar shows all role-restricted nav links (Provider Dashboard, Client Channels, Deal Review)
  - Session API call cleaned up -- no longer sends role from client body
  - Clear console warnings when FIREBASE_SERVICE_ACCOUNT_KEY is missing
affects: [phase-02, phase-03, phase-04, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [connectFunctionsEmulator for local development, onCall without cors option, response.ok check pattern for fetch calls]

key-files:
  created: []
  modified:
    - src/core/config/firebase.config.js
    - src/presentation/components/homepage/Navbar/Navbar.jsx
    - src/presentation/contexts/AuthContext.jsx
    - functions/index.js

key-decisions:
  - "connectFunctionsEmulator enabled in development mode -- httpsCallable routes to local emulator, not production"
  - "{ cors: true } removed from all onCall definitions -- it is onRequest-only, silently ignored on onCall"
  - "Admin navbar override uses ROLES.ADMIN constant in visibleLinks filter -- admin sees all role-restricted links"
  - "Session API request body now sends only idToken -- role read from verified JWT claims server-side (security fix)"
  - "sessionResponse.ok check added -- developer gets actionable warning naming FIREBASE_SERVICE_ACCOUNT_KEY when session fails"

patterns-established:
  - "Dev emulator pattern: connectFunctionsEmulator(functions, '127.0.0.1', 5001) in NODE_ENV=development block"
  - "Admin bypass pattern: user.role === ROLES.ADMIN || link.roles.includes(user.role) in role filter conditions"
  - "Session response check: always store fetch response and check .ok for debugging visibility"

requirements-completed: [ROLE-01, ROLE-02, ROLE-04, ROLE-05, ROLE-06]

# Metrics
duration: 8min
completed: 2026-02-22
---

# Phase 01 Plan 04: UAT Gap Closure Summary

**Firebase emulator connected for dev, admin navbar override added, session body cleaned up, all onCall cors options removed -- closing 4 UAT gaps in the Phase 01 role system**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-22T13:57:33Z
- **Completed:** 2026-02-22T14:05:00Z
- **Tasks:** 2 of 3 complete (Task 3 is checkpoint:human-verify)
- **Files modified:** 4

## Accomplishments
- Cloud Functions emulator connection enabled in development mode, eliminating CORS errors on inviteUser and setUserRole
- Removed misleading `{ cors: true }` option from all 9 onCall Cloud Function definitions
- Admin navbar now shows Provider Dashboard, Client Channels, and Deal Review via ROLES.ADMIN override in visibleLinks filter
- AuthContext session API call cleaned up: no longer sends role from client body (security), warns clearly when session fails

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Cloud Functions connectivity and admin navbar override** - `1dfa6b7` (fix)
2. **Task 2: Fix session API call for route protection** - `c6863d9` (fix)
3. **Task 3: Verify all 4 UAT gaps are closed** - awaiting human verification (checkpoint:human-verify)

**Plan metadata:** (to be added after checkpoint completion)

## Files Created/Modified
- `src/core/config/firebase.config.js` - Uncommented connectFunctionsEmulator block for development mode
- `functions/index.js` - Removed `{ cors: true }` from inviteUser, resendInvite, setUserRole, migrateExistingUsers, softDeleteUser, recoverAccount, banUser, unbanUser, deleteUser
- `src/presentation/components/homepage/Navbar/Navbar.jsx` - Added ROLES.ADMIN override in visibleLinks filter
- `src/presentation/contexts/AuthContext.jsx` - Removed role from session body, added sessionResponse.ok check with FIREBASE_SERVICE_ACCOUNT_KEY warning

## Decisions Made
- connectFunctionsEmulator must be enabled in dev for httpsCallable to reach the local emulator; without it, calls hit the non-existent production endpoint and fail with CORS errors
- `{ cors: true }` is a Firebase SDK v2 onRequest-only option; on onCall it is silently ignored and removed for clarity
- Admin bypass in Navbar uses `user.role === ROLES.ADMIN` constant (not string literal) for consistency with the rest of the codebase
- Session request body now sends only `idToken` -- the server reads role from verified JWT claims as designed in 01-01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all 4 root causes were clearly diagnosed in 01-UAT.md and fixes applied directly.

## User Setup Required

For the Cloud Functions fixes to work in development:
1. Start the Firebase Functions emulator: `cd functions && npm install && cd .. && firebase emulators:start --only functions`
2. Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is configured in `.env.local` for route protection to work

## Next Phase Readiness
- Phase 01 role system UAT gaps closed pending human verification (Task 3 checkpoint)
- After checkpoint passes: Phase 01 fully complete, Phase 02 can begin

---
*Phase: 01-role-system-and-infrastructure*
*Completed: 2026-02-22*
