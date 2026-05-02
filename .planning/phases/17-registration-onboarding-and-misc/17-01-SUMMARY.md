---
phase: 17-registration-onboarding-and-misc
plan: 01
subsystem: auth
tags: [registration, firebase, cloud-functions, react-hook-form, zod, next-dynamic]

# Dependency graph
requires:
  - phase: 01-role-system-and-infrastructure
    provides: ROLES constants, setUserRole CF pattern, custom claims architecture
provides:
  - Company Type dropdown on registration form (COMPANY_TYPES, COMPANY_TYPE_TO_ROLE)
  - COUNTRY_PHONE_CODES map in countries.js for phone prefix auto-fill
  - setRoleClaimOnRegistration callable CF for provider self-registration
  - SSR-safe register page via next/dynamic ssr:false
affects: [provider-onboarding, registration-flow, role-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - next/dynamic with ssr:false on 'use client' page shell to prevent SSR crash from browser-only form deps
    - COMPANY_TYPE_TO_ROLE map decouples UI selection from role string — single change point
    - setRoleClaimOnRegistration CF pattern: self-callable (not admin-only), Firestore doc verification prevents escalation

key-files:
  created:
    - src/core/constants/companyTypes.js
  modified:
    - src/core/constants/countries.js
    - src/core/validation/registerSchema.js
    - src/app/(auth)/register/page.jsx
    - src/presentation/components/features/auth/RegisterForm/RegisterForm.jsx
    - src/presentation/components/features/auth/RegisterForm/RegisterFormFields.jsx
    - functions/index.js

key-decisions:
  - "register/page.jsx uses 'use client' + next/dynamic ssr:false (not metadata export + dynamic) — Turbopack 16.2 does not allow dynamic() with JSX loading prop in Server Components"
  - "setRoleClaimOnRegistration guards: caller must be authenticated, role restricted to logistics_provider/insurance_provider, Firestore doc role must match — prevents claim escalation without admin overhead"
  - "Phone prefix badge is read-only display; user can override by typing a + prefix — full E.164 manual entry still works"
  - "CF call is non-blocking (try/catch) — registration succeeds even if claim-setting fails; admin can correct later"

patterns-established:
  - "Provider self-registration pattern: CompanyType field -> COMPANY_TYPE_TO_ROLE derivation -> registerUser with role -> setRoleClaimOnRegistration CF -> getIdToken(true) refresh"
  - "Country dial code auto-fill: COUNTRY_PHONE_CODES[country] prefix badge + uncontrolled local input merged in onChange"

requirements-completed: [REG-01, REG-02, REG-03, REG-04]

# Metrics
duration: 9min
completed: 2026-05-02
---

# Phase 17 Plan 01: Registration Enhancements Summary

**Company type dropdown with auto-role assignment for provider self-registration, phone country code prefix auto-fill, and SSR-safe register page via next/dynamic**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-02T09:12:43Z
- **Completed:** 2026-05-02T09:22:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Company Type SearchableSelect field added to registration form (Trade/Logistics/Insurance), auto-assigning the platform role on submit
- Phone input now shows a read-only dial code prefix badge when a country is selected (e.g., Turkey = +90), with E.164 override allowed
- `setRoleClaimOnRegistration` callable Cloud Function added with Firestore anti-escalation verification
- Register page fixed to load on Vercel without SSR crash (reCAPTCHA + libphonenumber-js are browser-only)

## Task Commits

1. **Task 1: Create constants, extend schema, fix Vercel crash** - `213c36c` (feat)
2. **Task 2: Wire registration form fields, auto-role, and Cloud Function** - `549e16a` (feat)

## Files Created/Modified

- `src/core/constants/companyTypes.js` - COMPANY_TYPES array and COMPANY_TYPE_TO_ROLE mapping
- `src/core/constants/countries.js` - Added COUNTRY_PHONE_CODES map covering all COUNTRIES entries
- `src/core/validation/registerSchema.js` - Added companyType enum field
- `src/app/(auth)/register/page.jsx` - Converted to 'use client' + next/dynamic ssr:false
- `src/presentation/components/features/auth/RegisterForm/RegisterForm.jsx` - Role derivation, CF call, token refresh
- `src/presentation/components/features/auth/RegisterForm/RegisterFormFields.jsx` - Company Type field, phone prefix badge
- `functions/index.js` - Added setRoleClaimOnRegistration callable CF

## Decisions Made

- `register/page.jsx` uses `'use client'` + `next/dynamic ssr:false` instead of Server Component + metadata export — Turbopack 16.2.1 does not support `dynamic()` with JSX loading prop in Server Components
- `setRoleClaimOnRegistration` is restricted to `logistics_provider` and `insurance_provider` roles (members get `member` as default without a CF call)
- CF reads Firestore `users/{uid}.role` to verify the requested role matches what was written during registration, preventing escalation
- CF call is wrapped in try/catch — registration success is not coupled to claim-setting success

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken import path in ProductUploadRequestButton**
- **Found during:** Task 1 (build verification)
- **Issue:** `ProductUploadRequestButton.jsx` imported `db` from `@/infrastructure/firebase/firebase` which doesn't exist — caused Turbopack build failure
- **Fix:** Changed import to `@/core/config/firebase.config` (the correct path used by all other client-side files)
- **Files modified:** `src/presentation/components/features/profile/ProductUploadRequestButton/ProductUploadRequestButton.jsx`
- **Verification:** Build passes after fix
- **Committed in:** `213c36c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Pre-existing untracked file with wrong import; fix was required to unblock build. No scope creep.

## Issues Encountered

- `metadata` export + `dynamic()` with JSX loading prop in the same file caused Turbopack build error. Resolution: changed page to `'use client'` (drops metadata — acceptable since auth pages don't need per-page SEO metadata)

## Next Phase Readiness

- Provider self-registration flow is complete end-to-end
- Firestore rules and Cloud Function deployment needed before testing in production
- Plan 17-02 onwards can proceed immediately

---
*Phase: 17-registration-onboarding-and-misc*
*Completed: 2026-05-02*
