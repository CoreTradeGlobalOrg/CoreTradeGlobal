---
phase: 17-registration-onboarding-and-misc
plan: "04"
subsystem: ui
tags: [firestore, accessibility, wcag, cookie-consent, profile, notifications]

requires:
  - phase: 17-01
    provides: registration flow, company type constants
  - phase: 12-01
    provides: notification system (users/{uid}/notifications subcollection)

provides:
  - ProductUploadRequestButton component with Firestore write and admin notification
  - productUploadRequests Firestore collection with security rules
  - Updated CookieConsent banner text matching locked decision wording (Decline button)
  - WCAG 2.1 AA accessibility fixes: aria-current, aria-expanded, aria-label, htmlFor, h1 hierarchy

affects:
  - Admin panel (product upload requests visible to admin via Firestore)
  - Firestore rules (new productUploadRequests collection + product_upload_request notification type)

tech-stack:
  added: []
  patterns:
    - "ProductUploadRequestButton uses pending-request check on mount before enabling — idempotent UX"
    - "Admin notifications sent via Promise.allSettled — notification failure never blocks user feedback"
    - "Firestore client-side write for productUploadRequests — no Cloud Function needed (simple user-owned collection)"

key-files:
  created:
    - src/presentation/components/features/profile/ProductUploadRequestButton/ProductUploadRequestButton.jsx
  modified:
    - src/app/(main)/profile/[userId]/page.jsx
    - firestore.rules
    - src/presentation/components/common/CookieConsent/CookieConsent.jsx
    - src/presentation/components/homepage/Navbar/Navbar.jsx
    - src/app/(main)/profile/[userId]/ProfileProducts.jsx
    - src/app/(main)/profile/[userId]/ProfileRequests.jsx
    - src/presentation/components/features/auth/LoginForm/LoginForm.jsx
    - src/presentation/components/homepage/Companies/CompaniesSection.jsx
    - src/presentation/components/homepage/Companies/MobileCompanyCardStack.jsx
    - src/presentation/components/homepage/Showcase/ShowcaseSection.jsx

key-decisions:
  - "ProductUploadRequestButton queries Firestore on mount for existing pending request — prevents duplicate submissions without requiring server-side guard"
  - "product_upload_request added to allowed notification types list in Firestore rules — required for client-side admin notification write"
  - "Section h1 elements in CompaniesSection, MobileCompanyCardStack, ShowcaseSection converted to h2 — HeroSection owns the single h1 on the homepage"
  - "LoginForm inputs now have htmlFor/id pairs and autoComplete attributes — required for screen reader label association"

requirements-completed: [REG-08, REG-09]

duration: 13min
completed: 2026-05-02
---

# Phase 17 Plan 04: Product Upload Request Button, Cookie Consent Update, and Accessibility Fixes

**ProductUploadRequestButton with Firestore write + admin notifications, CookieConsent text updated to Decline/Learn More, and WCAG 2.1 AA fixes across Navbar, LoginForm, profile pages, and homepage heading hierarchy**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-02T09:12:38Z
- **Completed:** 2026-05-02T09:25:43Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Built ProductUploadRequestButton: checks for existing pending request on mount, creates Firestore document in productUploadRequests, sends in-app notifications to all admin users, shows gold outline with confirmation text after submission
- Updated CookieConsent: banner text now reads "We use cookies to improve your experience and analyze site traffic." and "Reject All" renamed to "Decline" in both main banner and settings dialog
- Fixed 6 categories of WCAG 2.1 AA violations: aria-current on active nav links, aria-expanded + aria-label on mobile menu button, aria-label + aria-haspopup on user account button, aria-label on pagination buttons, htmlFor label associations in LoginForm, and h1 hierarchy (multiple h1 elements on homepage reduced to one)

## Task Commits

1. **Task 1: Build ProductUploadRequestButton and update CookieConsent** - `4ce725a` (feat)
2. **Task 2: Accessibility audit and fixes across key pages** - `376ea5c` (feat)

## Files Created/Modified

- `src/presentation/components/features/profile/ProductUploadRequestButton/ProductUploadRequestButton.jsx` - New component: pending-check, Firestore write, admin notification loop, gold outline button with confirmation state
- `src/app/(main)/profile/[userId]/page.jsx` - Import and render ProductUploadRequestButton below ProfileCard for own-profile view
- `firestore.rules` - Add productUploadRequests collection (user create, admin read/update), add product_upload_request to allowed notification types
- `src/presentation/components/common/CookieConsent/CookieConsent.jsx` - Updated banner description text, renamed Reject All to Decline in both banner and settings dialog, added aria-label + focus-visible to close button
- `src/presentation/components/homepage/Navbar/Navbar.jsx` - aria-current="page" on active nav links (desktop + mobile), aria-expanded + aria-haspopup + aria-label on user menu button, aria-expanded + aria-controls + aria-label on mobile menu toggle, id on mobile menu container
- `src/app/(main)/profile/[userId]/ProfileProducts.jsx` - aria-label on Previous/Next buttons, aria-live + aria-atomic on page counter
- `src/app/(main)/profile/[userId]/ProfileRequests.jsx` - aria-label on Previous/Next buttons, aria-live + aria-atomic on page counter
- `src/presentation/components/features/auth/LoginForm/LoginForm.jsx` - htmlFor/id pairs on email and password inputs, autoComplete attributes, aria-label on show/hide password toggle, focus-visible ring
- `src/presentation/components/homepage/Companies/CompaniesSection.jsx` - h1.section-title converted to h2 (homepage has one h1 in HeroSection)
- `src/presentation/components/homepage/Companies/MobileCompanyCardStack.jsx` - h1.section-title converted to h2
- `src/presentation/components/homepage/Showcase/ShowcaseSection.jsx` - h1.section-title converted to h2

## Decisions Made

- ProductUploadRequestButton queries Firestore for existing pending request on mount — prevents duplicate button press without server-side enforcement, degrades gracefully on permission error (button remains enabled)
- Admin notifications sent via `Promise.allSettled` so individual admin notification failure never blocks the user success state
- `product_upload_request` added to the Firestore rules notification type allowlist — required because the client writes directly to `users/{adminUid}/notifications`
- Section component h1 elements converted to h2 because HeroSection already owns the single meaningful h1 on the homepage; CSS class `section-title` preserves existing visual styling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added product_upload_request to Firestore notification type allowlist**
- **Found during:** Task 1 (ProductUploadRequestButton)
- **Issue:** Existing Firestore rules for `users/{uid}/notifications` restrict allowed `type` values. The new `product_upload_request` type was not in the allowlist, so admin notification writes would silently fail with a permission error
- **Fix:** Added `'product_upload_request'` to the type allowlist array in firestore.rules
- **Files modified:** firestore.rules
- **Verification:** Build passes; rule is part of Task 1 commit
- **Committed in:** 4ce725a (Task 1 commit)

**2. [Rule 1 - Bug] Fixed wrong Firebase import path**
- **Found during:** Task 1 (ProductUploadRequestButton)
- **Issue:** Initial component used `@/infrastructure/firebase/firebase` which doesn't exist; actual path is `@/core/config/firebase.config`
- **Fix:** The linter auto-corrected to `@/core/config/firebase.config` which exports `db`
- **Files modified:** ProductUploadRequestButton.jsx
- **Verification:** Build passes
- **Committed in:** 4ce725a (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical security rule, 1 wrong import path)
**Impact on plan:** Both essential for correct operation. No scope creep.

## Issues Encountered

- The Prettier/ESLint linter running in the background repeatedly reverted CookieConsent text changes between tool calls. Used `sed -i` to apply the text change atomically then followed up with targeted Edit calls for the button label, successfully locking in all changes before the next build.
- Git stash conflict: stash contained prior plan (17-03) changes to register/page.jsx which conflicted during stash pop — resolved by discarding the local copy and re-popping.

## User Setup Required

None - no external service configuration required. Firestore rules must be deployed to take effect:
```
firebase deploy --only firestore:rules
```

## Next Phase Readiness

- ProductUploadRequestButton is ready; admin must review productUploadRequests in Firestore console (no admin UI built for this collection yet)
- Accessibility fixes applied to key pages; Lighthouse audit recommended post-deploy for quantitative score
- Phase 17 plan 04 is the final plan in phase 17

---
*Phase: 17-registration-onboarding-and-misc*
*Completed: 2026-05-02*
