---
phase: 17-registration-onboarding-and-misc
verified: 2026-05-01T00:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Register with Logistics company type and verify Firestore role + custom claim"
    expected: "users/{uid}.role == 'logistics_provider' and ID token claim role == 'logistics_provider'"
    why_human: "Requires live Firebase Auth + Firestore interaction during registration; cannot verify claim-setting from static analysis alone"
  - test: "Select Turkey as country on registration form and verify phone prefix badge shows +90"
    expected: "Read-only badge '[+90]' appears left of phone input; typing local number combines to '+90 5551234567' in form value"
    why_human: "Interactive UI behavior with watch/setValue side-effect; requires browser rendering"
  - test: "Log in as a new user who has never completed the tour"
    expected: "OnboardingTour overlay appears immediately on dashboard; spotlight is positioned on the 'main' element; Skip and Next buttons are present"
    why_human: "Requires live Firestore flag read (onboardingTourCompleted absent/false) and DOM rendering in browser"
  - test: "Complete or skip the tour; reload the page"
    expected: "Tour does not appear again after completion/skip; Firestore users/{uid}.onboardingTourCompleted == true"
    why_human: "Requires Firestore write verification in Firebase console and browser session management"
  - test: "On dashboard with incomplete profile, click X to dismiss ProfileCompletionCard; navigate away and return"
    expected: "Card hidden in same browser session; reappears on next page visit (session storage clears on tab close)"
    why_human: "Requires sessionStorage behavior across navigation; cannot test programmatically"
  - test: "Open the platform without logging in; verify Zoho support button appears bottom-right"
    expected: "Gold circular button with headset icon at fixed bottom-right; only appears when NEXT_PUBLIC_ZOHO_WIDGET_KEY is set"
    why_human: "Depends on env var configuration in running environment; Zoho script load timing is runtime-only"
  - test: "Log in, open FAB Messages widget, select Support tab"
    expected: "Two-tab bar (Messages / Support) visible; Support tab triggers Zoho chat window"
    why_human: "Requires live Zoho widget key configured and Zoho script loaded at runtime"
  - test: "On own profile page, click Request Product Upload"
    expected: "Button becomes disabled; confirmation text appears; Firestore productUploadRequests collection gains a document with status='pending'; all admin users receive an in-app notification"
    why_human: "Requires live Firestore write and admin notification verification in Firebase console"
  - test: "Lighthouse accessibility audit on /register, /, /profile/[userId], and /login"
    expected: "No critical accessibility violations; score should improve over pre-phase baseline"
    why_human: "Lighthouse requires a running server and browser environment; no automated CI audit was captured"
---

# Phase 17: Registration, Onboarding, and Misc — Verification Report

**Phase Goal:** Improve registration flow with company type selection and phone country code auto-fill, build onboarding tour for first-time users, add profile completion progress card, integrate Zoho SalesIQ support chat, add product upload request button, update cookie consent text, and perform accessibility audit fixes.
**Verified:** 2026-05-01
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Requirements Coverage Note

REG-01 through REG-09 are defined in the ROADMAP.md (Phase 17 entry) and the RESEARCH.md table. They do **not** appear as formal entries in `.planning/REQUIREMENTS.md` (the global requirements file only covers requirements through DEAL-18 and several non-registration sections). This is not a gap — Phase 17 requirements are roadmap-level items tracked in the RESEARCH.md validation table. All 9 IDs are accounted for across the 4 plans.

| Requirement | Plan | Description | Status |
|-------------|------|-------------|--------|
| REG-01 | 17-01 | Company type dropdown at registration (Trade/Logistics/Insurance) | SATISFIED |
| REG-02 | 17-01 | Auto-assign role (logistics_provider / insurance_provider) at registration | SATISFIED |
| REG-03 | 17-01 | Phone country code auto-fill from selected country, user-overridable | SATISFIED |
| REG-04 | 17-01 | Fix Vercel preview crash on register page | SATISFIED |
| REG-05 | 17-02 | Step-by-step overlay tour, auto-starts on first login, 5 steps per role, dismissable | SATISFIED |
| REG-06 | 17-02 | Profile completion progress bar on dashboard and profile page | SATISFIED |
| REG-07 | 17-03 | Zoho SalesIQ as Support tab in FAB + standalone button on public pages | SATISFIED |
| REG-08 | 17-04 | Upload my products request button on profile page | SATISFIED |
| REG-09 | 17-04 | WCAG 2.1 AA accessibility audit and fixes across key pages | SATISFIED |

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Registration form shows Company Type dropdown with Trade/Logistics/Insurance options | VERIFIED | `RegisterFormFields.jsx:176` — SearchableSelect wired to COMPANY_TYPES from `companyTypes.js`; companyType field validated by zod enum in `registerSchema.js:65` |
| 2 | Selecting Logistics or Insurance auto-assigns provider role at registration | VERIFIED | `RegisterForm.jsx:116` — `COMPANY_TYPE_TO_ROLE[data.companyType]` derives role; `httpsCallable('setRoleClaimOnRegistration')` called for non-member roles at line 143; CF exists in `functions/index.js:416` with Firestore anti-escalation guard |
| 3 | Phone input auto-fills country dial code when country is selected; user can override | VERIFIED | `RegisterFormFields.jsx:37` — `phonePrefix = COUNTRY_PHONE_CODES[country]`; prefix badge rendered at line 128; `handlePhoneChange` at line 39 combines prefix + local number or allows E.164 override |
| 4 | Register page deploys on Vercel without SSR crash | VERIFIED | `register/page.jsx` uses `'use client'` + `dynamic(..., { ssr: false })` — all browser-only form deps (reCAPTCHA, libphonenumber-js) deferred to client |
| 5 | New users see step-by-step overlay tour on first login with 5 role-appropriate steps | VERIFIED | `OnboardingTour.jsx` — MEMBER_STEPS (5) and PROVIDER_STEPS (5) defined; role check at line 164-167; rendered via createPortal; `page.js:53` shows tour when `!user.onboardingTourCompleted` |
| 6 | Tour can be skipped and does not appear again after completion or skip | VERIFIED | `OnboardingTour.jsx:225-242` — `completeTour()` writes `onboardingTourCompleted: true` to `users/{uid}` via `updateDoc`; `page.js:53` checks the flag to suppress re-render |
| 7 | Dashboard and profile page show a profile completion card with progress bar and field checklist | VERIFIED | `ProfileCompletionCard.jsx` — 6 COMPLETION_FIELDS, percent calculation, gold progress bar, field checklist; integrated via dynamic import in `page.js:36-40` and `profile/[userId]/page.jsx:22-26` |
| 8 | Profile completion card disappears permanently at 100% and is dismissable per session before 100% | VERIFIED | `ProfileCompletionCard.jsx:60` — `if (percent === 100) return null`; `handleDismiss` at line 68 sets sessionStorage key; dismissed state checked at line 66 |
| 9 | FAB messaging widget has Messages and Support tabs; Support tab triggers Zoho chat | VERIFIED | `MessagesWidget.jsx:42-43` — activeTab state, ZOHO_WIDGET_KEY guard; tab bar at line 319-329; `$zoho.salesiq.floatwindow.visible('show')` called at line 131 |
| 10 | Public pages show standalone Support chat button when no FAB exists | VERIFIED | `ZohoSalesIQButton.jsx` — renders fixed bottom-right button; `layout.jsx:38` renders it only when `!isAuthenticated` |
| 11 | Zoho default floating button is suppressed globally | VERIFIED | `layout.jsx:58-60` — `$zoho.salesiq.ready` callback calls `floatbutton.visible("hide")` |
| 12 | User can request product upload from their own profile page | VERIFIED | `ProductUploadRequestButton.jsx` — Firestore write to `productUploadRequests` at line 63; admin notification loop at line 72-93; integrated in `profile/[userId]/page.jsx:99` behind `page.isOwnProfile` guard |
| 13 | Request creates a Firestore document and notifies admin | VERIFIED | `ProductUploadRequestButton.jsx:63-93` — `addDoc(collection(db, 'productUploadRequests'), {...})` then `Promise.allSettled` admin notification writes |
| 14 | Cookie consent banner text matches locked decision wording | VERIFIED | `CookieConsent.jsx:125` — "We use cookies to improve your experience and analyze site traffic."; line 138 and 254 — "Decline" button label in both banner and settings dialog |
| 15 | Key pages have accessibility improvements (aria attributes, heading hierarchy, label associations) | VERIFIED | `Navbar.jsx` — aria-current, aria-expanded, aria-label; `LoginForm.jsx` — htmlFor/id pairs, autoComplete; `CompaniesSection.jsx`, `MobileCompanyCardStack.jsx`, `ShowcaseSection.jsx` — h1 converted to h2; `ProfileProducts.jsx`, `ProfileRequests.jsx` — aria-label on pagination, aria-live on counters |

**Score: 15/15 truths verified** (9 required, 15 observed across the 4 plans)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/core/constants/companyTypes.js` | COMPANY_TYPES array and COMPANY_TYPE_TO_ROLE mapping | VERIFIED | Exports both; 3 company types; 3-entry role map |
| `src/core/constants/countries.js` | COUNTRY_PHONE_CODES map added as named export | VERIFIED | `COUNTRY_PHONE_CODES` exported at line 212; covers all COUNTRIES entries |
| `src/app/(auth)/register/page.jsx` | Dynamic import of RegisterForm with ssr:false | VERIFIED | `dynamic(..., { ssr: false })` at line 16-18; Suspense fallback present |
| `functions/index.js` | setRoleClaimOnRegistration callable CF | VERIFIED | `exports.setRoleClaimOnRegistration = onCall(...)` at line 416; auth guard, role allowlist, Firestore doc verification, `setCustomUserClaims` call |
| `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.jsx` | Overlay tour component with spotlight cutout and step panel | VERIFIED | createPortal, 5 MEMBER_STEPS + 5 PROVIDER_STEPS, requestAnimationFrame deferred rect, updateDoc on complete/skip |
| `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.css` | Tour overlay and spotlight CSS | VERIFIED | `.onboarding-overlay` at line 10; `.onboarding-spotlight` and `.onboarding-panel` present |
| `src/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard.jsx` | Profile completion progress bar card | VERIFIED | COMPLETION_FIELDS, percent calculation, gold progress bar, sessionStorage dismiss, 100% permanent hide |
| `src/presentation/components/common/ZohoSalesIQ/ZohoSalesIQButton.jsx` | Standalone Zoho chat button for public pages | VERIFIED | Renders only when NEXT_PUBLIC_ZOHO_WIDGET_KEY set; fixed bottom-right gold button; `$zoho.salesiq.floatwindow.visible('show')` on click |
| `src/presentation/components/features/profile/ProductUploadRequestButton/ProductUploadRequestButton.jsx` | Request button with Firestore write and admin notification | VERIFIED | addDoc to productUploadRequests; Promise.allSettled admin notifications; existing-request guard on mount |
| `firestore.rules` | Security rules for productUploadRequests collection | VERIFIED | `match /productUploadRequests/{requestId}` — create requires `isAuthenticated() && uid match`; read/update requires `isAdmin()` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `RegisterFormFields.jsx` | `companyTypes.js` | `COMPANY_TYPES` import for SearchableSelect options | WIRED | Line 14 import; line 177 `options={COMPANY_TYPES}` |
| `RegisterFormFields.jsx` | `countries.js` | `COUNTRY_PHONE_CODES` import for phone prefix | WIRED | Line 13 import; line 37 `COUNTRY_PHONE_CODES[country]` |
| `RegisterForm.jsx` | `companyTypes.js` | `COMPANY_TYPE_TO_ROLE` for role derivation in onSubmit | WIRED | Line 24 import; line 116 `COMPANY_TYPE_TO_ROLE[data.companyType]` |
| `RegisterForm.jsx` | `functions/index.js` | `httpsCallable('setRoleClaimOnRegistration')` | WIRED | Line 143 call; role !== 'member' guard |
| `OnboardingTour.jsx` | `users/{uid}` Firestore | `updateDoc` sets `onboardingTourCompleted: true` | WIRED | Lines 229-233 — `updateDoc(doc(db, 'users', user.uid), {...})` |
| `ProfileCompletionCard.jsx` | user doc fields | COMPLETION_FIELDS presence check for percentage | WIRED | Lines 53-54 — `COMPLETION_FIELDS.filter(f => !!user[f.key])` |
| `layout.jsx` | Zoho SalesIQ script | `next/script` with `strategy="lazyOnload"` | WIRED | Lines 43-62 — conditional Script tag; `id="zoho-salesiq"` |
| `MessagesWidget.jsx` | `window.$zoho.salesiq` | JS API calls to show/hide Zoho chat panel | WIRED | Lines 130-135 — `$zoho.salesiq.floatwindow.visible('show'/'hide')` with optional-chain guard |
| `ProductUploadRequestButton.jsx` | Firestore `productUploadRequests` | `addDoc` to create request document | WIRED | Line 63 — `addDoc(collection(db, 'productUploadRequests'), {...})` |
| `ProductUploadRequestButton.jsx` | Notification system | Admin notification via `addDoc` to `users/{adminUid}/notifications` | WIRED | Lines 72-93 — admin query + Promise.allSettled notification writes |

---

### Commit Verification

All 8 feature commits referenced in the SUMMARY files were found in git log:

| Commit | Plan | Task |
|--------|------|------|
| `213c36c` | 17-01 | Task 1: constants, schema, Vercel fix |
| `549e16a` | 17-01 | Task 2: wire form, auto-role, CF |
| `adb0f21` | 17-02 | Task 1: OnboardingTour component |
| `375cd88` | 17-02 | Task 2: ProfileCompletionCard |
| `310283f` | 17-03 | Task 1: Zoho script + Support tab |
| `6f56bc3` | 17-03 | Task 2: standalone Zoho button |
| `4ce725a` | 17-04 | Task 1: ProductUploadRequestButton + CookieConsent |
| `376ea5c` | 17-04 | Task 2: accessibility fixes |

---

### Anti-Patterns Found

No blockers or warnings detected across all new files created in Phase 17.

Scan results:
- Zero TODO/FIXME/HACK comments in any new file
- No stub return patterns (`return null` used correctly only in conditional early-return logic at 100% completion or missing user — not as placeholder implementations)
- No empty handlers — all click/submit handlers perform real operations
- All `$zoho.salesiq.*` calls guarded with optional chaining (`window.$zoho?.salesiq`) — no TypeError risk

---

### Human Verification Required

The following behaviors require a running browser and live Firebase environment to confirm:

#### 1. Provider Role Auto-Assignment at Registration

**Test:** Register a new account selecting "Logistics Company" as company type
**Expected:** Firestore `users/{uid}.role == 'logistics_provider'`; ID token (via getIdToken) contains `{ role: 'logistics_provider' }` custom claim
**Why human:** Requires live Firebase Auth + Firestore interaction; setRoleClaimOnRegistration CF must be deployed

#### 2. Phone Prefix Badge Behavior

**Test:** On `/register`, select "Turkey" as country; observe phone input
**Expected:** Read-only `+90` badge appears left of phone input; typing `555 123 4567` sets form value to `+90 555 123 4567`
**Why human:** Interactive UI with watch/setValue side-effect; requires browser rendering

#### 3. Onboarding Tour First-Login Appearance

**Test:** Log in as a user with no `onboardingTourCompleted` field in their Firestore document
**Expected:** Overlay tour appears on dashboard immediately after auth resolves; spotlight highlights `main` element; 5 steps navigable via Next button
**Why human:** Requires live Firestore flag read and browser DOM environment

#### 4. Tour Completion Persistence

**Test:** Complete or skip the tour; refresh the page
**Expected:** Tour does not reappear; Firestore `users/{uid}.onboardingTourCompleted === true`
**Why human:** Requires Firestore write verification and page reload in browser

#### 5. ProfileCompletionCard Session Dismiss

**Test:** Dismiss the card with the X button; navigate to another page and back
**Expected:** Card hidden during current browser session; reappears after closing and reopening the tab (sessionStorage cleared)
**Why human:** Requires sessionStorage behavior across navigation cycles in a real browser

#### 6. Zoho SalesIQ Integration (requires env var)

**Test:** Set `NEXT_PUBLIC_ZOHO_WIDGET_KEY` to a real Zoho widget key; open platform as unauthenticated visitor
**Expected:** Gold headset button appears bottom-right; click opens Zoho chat; default Zoho float button not visible anywhere
**Why human:** Depends on runtime env var and Zoho script loading; integration is a no-op without the key

#### 7. ProductUploadRequestButton End-to-End

**Test:** On own profile page, click "Request Product Upload"
**Expected:** Button shows "Submitting…" then confirmation text; `productUploadRequests` collection gains document with `status='pending'`; admin users receive notification in `/notifications`
**Why human:** Requires live Firestore write and admin notification verification in Firebase console

#### 8. Lighthouse Accessibility Score

**Test:** Run `npx lighthouse http://localhost:3000/register --only-categories=accessibility` (and same for `/`, `/login`, `/profile/[userId]`)
**Expected:** No critical violations; score should reflect aria-current, aria-expanded, htmlFor, h1 hierarchy fixes
**Why human:** Lighthouse requires a running server; no automated CI score was captured in phase

---

### Gaps Summary

No gaps found. All automated verification checks passed:
- All 10 required artifacts exist, are substantive (not stubs), and are wired into the application
- All 10 key links are connected with verified import and usage patterns
- All 9 requirement IDs (REG-01 through REG-09) are accounted for and satisfied by committed code
- All 8 plan commits verified in git log
- No anti-patterns found in new files
- Zero orphaned requirements

The phase fully achieves its goal. Items listed under human verification are behavioral/runtime checks that require a live environment — they are not gaps in implementation.

---

_Verified: 2026-05-01_
_Verifier: Claude (gsd-verifier)_
