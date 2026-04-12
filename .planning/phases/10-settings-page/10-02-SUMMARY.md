---
phase: 10-settings-page
plan: 02
subsystem: ui
tags: [firebase-auth, totp, 2fa, zod, react-hook-form, qrcode, settings, security]

requires:
  - phase: 10-01
    provides: SettingsPage shell with Security section placeholder, glass-card CSS pattern
  - phase: 07-platform-hardening
    provides: Phase 7 form validation standard (zodResolver + mode:onSubmit + reValidateMode:onBlur)

provides:
  - SecuritySection component with password change form and 2FA toggle
  - TwoFactorSetup component with QR code display, 6-digit TOTP verify, backup codes
  - usePasswordChange hook with reauthentication and updatePassword
  - useTwoFactor hook managing full TOTP enrollment/unenrollment state machine
  - changePasswordSchema (Zod) with strength requirements
  - totpVerifySchema (Zod) for 6-digit TOTP code
  - Backup codes: client-side generation with SHA-256 hashing stored in Firestore

affects: [10-03]

tech-stack:
  added: [qrcode.react@4.2.0]
  patterns:
    - "SecuritySection uses next/dynamic ssr:false for TwoFactorSetup — avoids SSR issues with qrcode.react and SubtleCrypto"
    - "useTwoFactor: step state machine (idle|reauthenticating|scanning|showCodes) drives UI without prop drilling"
    - "Backup codes: window.crypto.getRandomValues + SubtleCrypto SHA-256 — no npm dependency for crypto"
    - "Disable 2FA: password input inline in SecuritySection, not in a modal — keeps UX contained"

key-files:
  created:
    - src/core/validation/changePasswordSchema.js
    - src/core/validation/totpVerifySchema.js
    - src/presentation/hooks/settings/usePasswordChange.js
    - src/presentation/hooks/settings/useTwoFactor.js
    - src/presentation/components/features/settings/SettingsPage/SecuritySection.jsx
    - src/presentation/components/features/settings/SettingsPage/TwoFactorSetup.jsx
  modified:
    - src/presentation/components/features/settings/SettingsPage/SettingsPage.jsx

key-decisions:
  - "TwoFactorSetup loaded via next/dynamic ssr:false — qrcode.react and SubtleCrypto both require browser APIs; SSR would crash"
  - "Backup codes generated client-side with SubtleCrypto (no npm dep) — hashed with SHA-256 before Firestore storage"
  - "useTwoFactor step state machine drives all multi-step UI — single hook, no prop drilling across SecuritySection"
  - "Disable 2FA password input lives directly in TwoFactorSection (not TwoFactorSetup) — TwoFactorSetup handles enrollment steps only"
  - "auth/invalid-credential added alongside auth/wrong-password in error maps — Firebase SDK v9+ uses invalid-credential for wrong password"

patterns-established:
  - "TOTP enrollment flow: reauthenticate -> getSession -> generateSecret -> generateQrCodeUrl -> assertionForEnrollment -> enroll -> backup codes"
  - "Backup code format: 5-byte random Uint8Array -> uppercase hex -> XXXXX-XXXXX (10 chars)"

requirements-completed: [SET-02, SET-03]

duration: 12min
completed: 2026-04-12
---

# Phase 10 Plan 02: Security Section Summary

**Password change with zodResolver + reauthentication and TOTP 2FA enrollment/disable with QR code, backup codes (SHA-256 hashed in Firestore), and inline re-auth gate**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-12T18:04:32Z
- **Completed:** 2026-04-12T18:16:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Password change form with Phase 7 zodResolver standard: strength validation (uppercase, lowercase, number, special char), mismatch check, inline errors, Firebase reauthentication before update
- TOTP 2FA enrollment: reauth -> QR code (qrcode.react) -> 6-digit verify -> enroll -> display 10 backup codes with copy/download
- Backup codes generated client-side using SubtleCrypto, SHA-256 hashed before storage in `users/{uid}/security/backupCodes` Firestore subcollection
- Disable 2FA with password re-authentication and factor unenrollment; backup codes deleted from Firestore
- SecuritySection replaces placeholder in SettingsPage; TwoFactorSetup loaded dynamically (ssr:false)

## Task Commits

1. **Task 1: Create Zod schemas, password change hook, and 2FA hook** - `df1da0d` (feat)
2. **Task 2: Build SecuritySection and TwoFactorSetup UI, wire into SettingsPage** - `090480c` (feat)

## Files Created/Modified
- `src/core/validation/changePasswordSchema.js` - Zod schema for password change with strength requirements
- `src/core/validation/totpVerifySchema.js` - Zod schema for 6-digit TOTP code
- `src/presentation/hooks/settings/usePasswordChange.js` - Reauthentication + updatePassword with Firebase error mapping
- `src/presentation/hooks/settings/useTwoFactor.js` - Full TOTP state machine: enroll, backup codes, unenroll
- `src/presentation/components/features/settings/SettingsPage/SecuritySection.jsx` - Password form + 2FA toggle UI
- `src/presentation/components/features/settings/SettingsPage/TwoFactorSetup.jsx` - Multi-step QR/verify/backup-codes UI
- `src/presentation/components/features/settings/SettingsPage/SettingsPage.jsx` - Replaced Security placeholder with SecuritySection

## Decisions Made
- `TwoFactorSetup` loaded via `next/dynamic` with `ssr: false` — `qrcode.react` and `SubtleCrypto` require browser APIs, SSR would crash the build
- `auth/invalid-credential` added alongside `auth/wrong-password` in all error maps — Firebase SDK v9+ returns `invalid-credential` for wrong password (breaking change from older SDK versions)
- Backup codes generated purely client-side with `window.crypto.getRandomValues` + `SubtleCrypto SHA-256` — avoids any npm crypto dependency
- Disable 2FA password input lives in `TwoFactorSection` inline form rather than routing through `TwoFactorSetup` — cleaner separation: `TwoFactorSetup` owns enrollment steps only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 can now replace the Notifications and Danger Zone placeholders in SettingsPage
- Firebase TOTP MFA must be enabled in Firebase Console under Authentication > Sign-in methods > Multi-factor (production requirement)
- Firestore security rules should allow `users/{uid}/security/backupCodes` read/write for authenticated owner (may need rule addition before production)

---
*Phase: 10-settings-page*
*Completed: 2026-04-12*
