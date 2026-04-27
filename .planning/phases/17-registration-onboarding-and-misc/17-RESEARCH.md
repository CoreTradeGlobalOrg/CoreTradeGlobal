# Phase 17: Registration, Onboarding & Misc - Research

**Researched:** 2026-04-26
**Domain:** Registration flow, onboarding UX, third-party embed (Zoho SalesIQ), compliance, accessibility
**Confidence:** HIGH (codebase is fully read; decisions are locked in CONTEXT.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Registration Flow**
- Company type dropdown at registration: Trade Company, Logistics Company, Insurance Company
- Custom styled dropdown (NOT native HTML select) — matches existing dark input styling (bg-[#1A283B], border-[#2A3B52], gold focus ring)
- Auto-assign role based on company type: Logistics → `logistics_provider`, Insurance → `insurance_provider`. No admin invite step.
- Phone country code auto-fill from selected country — e.g. Turkey → +90. User can override.
- Vercel preview crash on register page — investigate and fix (root cause unknown)

**Onboarding Guide**
- Step-by-step overlay tour that auto-starts on first login
- 5 steps per role (Trade vs Provider — see CONTEXT.md for step list)
- Tour is dismissable ("Skip tour"), shows once, flag stored in Firestore user doc
- All new users (trade + providers) see onboarding first, then land on role-appropriate dashboard
- Profile completion progress bar on dashboard + profile page: "X% complete", gold fill, card format with field checklist, "Complete Profile" button, dismissable but returns until 100%, disappears permanently at 100%

**Homepage Chatbot (Zoho SalesIQ)**
- Zoho SalesIQ embed — script tag integration, managed from Zoho dashboard
- FAB has two tabs: [Messages] [Support] — Support tab shows Zoho SalesIQ chat inline
- Public pages (homepage, about, FAQ) where no FAB exists: show standalone Zoho chat button
- Env var: `NEXT_PUBLIC_ZOHO_WIDGET_KEY` — placeholder, user provides key from Zoho dashboard

**Compliance & Misc**
- Cookie consent banner: simplified text, Accept / Decline / Learn More buttons, localStorage, blocks Google Analytics until accepted — NOTE: CookieConsent component already exists and is already wired in layout.jsx. Review and update existing component if needed.
- Accessibility audit — Full WCAG 2.1 AA across all pages: alt text, keyboard nav, focus indicators, ARIA labels, color contrast, screen reader
- "Upload my products" request button on user profile page: creates Firestore request + admin in-app notification, shows confirmation text
- FAQ text updates — 15 questions updated in this session (already done per CONTEXT.md)

### Claude's Discretion
- Exact onboarding tour library/implementation (overlay positioning, step transitions)
- How to embed Zoho SalesIQ iframe within the FAB widget panel
- Cookie consent banner animation and positioning details
- Accessibility audit tooling (axe-core, Lighthouse, manual testing)
- Profile completion field weighting (equal weight per field or different)

### Deferred Ideas (OUT OF SCOPE)
None — all backlog items are included in this phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REG-01 | Company type dropdown at registration (Trade/Logistics/Insurance) with custom dark styling | SearchableSelect pattern already used for country/category fields — same pattern applies |
| REG-02 | Auto-assign role (logistics_provider / insurance_provider) at registration based on company type | RegisterUseCase.execute() passes `role` field to authRepository.register() — field path exists, just needs to be populated |
| REG-03 | Phone country code auto-fill from selected country field, user-overridable | COUNTRIES constant has ISO2 codes; need phone-code lookup map; libphonenumber-js already installed for validation |
| REG-04 | Fix Vercel preview crash on register page | Root cause identified: RegisterForm uses `useSearchParams` directly — already wrapped in Suspense in page.jsx, but likely issue is react-google-recaptcha SSR import. Needs ssr:false dynamic import. |
| REG-05 | Step-by-step overlay tour, auto-starts on first login, 5 steps per role, dismissable, Firestore flag | Custom implementation with portal/overlay; no tour library installed — build from scratch with z-index overlay pattern |
| REG-06 | Profile completion progress bar on dashboard and profile page | Pure UI calculation: count non-null fields from user doc; card-dismissable via localStorage (returns until 100%) |
| REG-07 | Zoho SalesIQ as "Support" tab in FAB widget + standalone button on public pages | next/script with strategy="lazyOnload"; iframe approach inside FAB panel; widget toggled via `$zoho.salesiq.floatbutton.visible('hide')` |
| REG-08 | "Upload my products" request button on profile page | New Firestore collection `productUploadRequests`; admin notification via existing Notification.create pattern |
| REG-09 | Full WCAG 2.1 AA accessibility audit across all pages | Audit tooling: axe-core browser extension + Lighthouse; fix pattern: systematic per-page sweep |
</phase_requirements>

---

## Summary

Phase 17 is a multi-feature miscellaneous phase touching registration, onboarding, third-party chat integration, compliance, and accessibility. The codebase is mature (Phase 16 complete) with well-established patterns for forms (react-hook-form + zod + SearchableSelect), Firestore flags, and layout-level global components.

The most architecturally complex item is the Zoho SalesIQ integration: the FAB widget (MessagesWidget) must gain a two-tab UI, and public pages need a standalone Zoho button while suppressing the Zoho default floating button globally. The onboarding tour is the most visually complex item — no tour library is installed, so a lightweight custom overlay must be built. Registration changes involve adding two fields (company type and phone prefix) and wiring the auto-role assignment through an existing code path that already accepts a `role` field.

The Vercel crash on the register page is almost certainly caused by `react-google-recaptcha` not being SSR-safe. The Suspense boundary in `register/page.jsx` correctly wraps `useSearchParams`, but the reCAPTCHA library may attempt DOM access during server render. The fix is to load RegisterForm (or just the reCAPTCHA widget) with `next/dynamic` and `ssr: false`.

**Primary recommendation:** Execute as 6 plans: (1) Registration form additions + auto-role + Vercel crash fix, (2) Phone country code prefix input, (3) Onboarding tour overlay, (4) Profile completion card, (5) Zoho SalesIQ integration, (6) Upload-my-products button + FAQ update + accessibility audit sweep.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.66.0 | Form state management | Already the project standard — all forms use it |
| zod | ^4.1.12 | Schema validation | Already the project standard — registerSchema uses it |
| @hookform/resolvers | ^5.2.2 | zodResolver bridge | Already installed |
| libphonenumber-js | ^1.12.26 | Phone number parsing/validation | Already installed, used in registerSchema |
| lucide-react | ^0.560.0 | Icons | Already installed across project |
| next | ^16.1.4 | Framework | Project framework |
| firebase | ^12.4.0 | Firestore for flags/requests | Already installed |

### No New Libraries Required
All phase requirements can be satisfied with existing dependencies. The onboarding tour overlay is built as a custom React component (no `driver.js`, `react-joyride`, or `shepherd.js` — none are installed and the custom approach avoids an unvetted third-party dependency on a simple 5-step flow).

### Phone Code Data
**Do not install a separate library.** Add a `COUNTRY_PHONE_CODES` map alongside `COUNTRIES` in `src/core/constants/countries.js`. ISO2 code → dial prefix (e.g., `{ TR: '+90', US: '+1', GB: '+44' }`). libphonenumber-js can derive these but importing it for that purpose alone is wasteful — a static map is correct here.

### Zoho SalesIQ
Loaded via Next.js `<Script>` tag with `strategy="lazyOnload"` in the root layout or main layout. The Zoho SalesIQ JS SDK exposes `$zoho.salesiq` global API after load. The embed does not require an npm package — it is a script tag embed.

---

## Architecture Patterns

### Recommended Project Structure Additions
```
src/presentation/components/
├── features/
│   ├── auth/
│   │   └── RegisterForm/
│   │       ├── RegisterForm.jsx          # add companyType + phoneCode wiring
│   │       └── RegisterFormFields.jsx    # add company type dropdown + phone prefix input
│   └── onboarding/
│       ├── OnboardingTour/
│       │   ├── OnboardingTour.jsx        # overlay tour controller
│       │   └── OnboardingTour.css        # spotlight/overlay styles
│       └── ProfileCompletionCard/
│           └── ProfileCompletionCard.jsx # progress bar card
├── profile/
│   └── ProductUploadRequest/
│       └── ProductUploadRequestButton.jsx
└── common/
    └── MessagesWidget/
        └── MessagesWidget.jsx            # add Support tab for Zoho

src/core/constants/
└── countries.js                          # extend with COUNTRY_PHONE_CODES map
```

### Pattern 1: Company Type as Custom SearchableSelect
**What:** Replace native `<select>` with the existing `SearchableSelect` component (already used for country and companyCategory fields in RegisterFormFields).
**When to use:** All dropdown inputs in this form use SearchableSelect — maintain consistency.
**Key detail:** Company type options are static (3 items) — no loading state needed.

```jsx
// RegisterFormFields.jsx pattern — same as existing companyCategory field
const companyType = watch('companyType');

<SearchableSelect
  options={COMPANY_TYPES}
  value={companyType}
  onChange={(value) => setValue('companyType', value, { shouldValidate: true })}
  placeholder="Select company type"
  disabled={loading}
  error={!!errors.companyType}
/>
```

```js
// src/core/constants/companyTypes.js
export const COMPANY_TYPES = [
  { value: 'trade',     label: 'Trade Company' },
  { value: 'logistics', label: 'Logistics Company' },
  { value: 'insurance', label: 'Insurance Company' },
];

export const COMPANY_TYPE_TO_ROLE = {
  trade:     'member',
  logistics: 'logistics_provider',
  insurance: 'insurance_provider',
};
```

### Pattern 2: Auto-Role Assignment via Existing Code Path
**What:** `RegisterUseCase.execute()` already accepts a `role` field in `profileData`. The `authRepository.register()` path already writes `role` to Firestore. Auto-assignment simply means deriving the role from `companyType` in `RegisterForm.onSubmit` before calling `registerUser`.

```js
// RegisterForm.jsx — onSubmit addition
import { COMPANY_TYPE_TO_ROLE } from '@/core/constants/companyTypes';

const role = COMPANY_TYPE_TO_ROLE[data.companyType] || 'member';
const registerData = {
  ...existingFields,
  companyType: data.companyType,
  role,
};
```

**Important:** Providers self-registering via this path will have a `role` custom claim of `logistics_provider` or `insurance_provider`. Verify that `setCustomUserClaims` in the Firebase Auth trigger picks up the `role` field from the Firestore user document (check the Auth Cloud Function). If custom claims are set only in the `inviteUser` CF flow and not on self-registration, a new `onUserCreate` trigger or post-registration CF call may be needed.

### Pattern 3: Phone Country Code Prefix Input
**What:** Compound input field: [+XX ▾ dropdown] [phone number text input]. The prefix is derived from the selected country via `watch('country')` and the `COUNTRY_PHONE_CODES` map. The final submitted phone value combines prefix + number.

```jsx
// Inside RegisterFormFields.jsx
const country = watch('country');
const phonePrefix = COUNTRY_PHONE_CODES[country] || '';

// Render: prefix badge + plain text input
// On change: setValue('phone', `${phonePrefix} ${localNumber}`)
```

**Zod schema:** The existing phone validation uses `isValidPhoneNumber(phone)` from libphonenumber-js. The combined `+prefix + number` string is what gets validated — this is already the expected format. No schema change needed if the combined value is valid E.164.

### Pattern 4: Onboarding Tour Overlay
**What:** Fixed-position overlay with a spotlight cutout and a step panel. The tour controller tracks current step and highlights the target element by computing its `getBoundingClientRect()` and rendering a transparent window in the overlay.

**Implementation approach:**
- Custom `OnboardingTour` component rendered as a React Portal to `document.body` — avoids z-index stacking issues
- Overlay: `fixed inset-0 bg-black/70 z-[9990]` with a transparent cutout using `clip-path` or `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` on the highlighted element's bounding rect
- Step panel: positioned below or above target element, 300px wide, styled with `glass-card` pattern
- Steps defined as arrays of `{ targetSelector, title, description, placement }` objects per role
- Firestore flag: `users/{uid}.onboardingTourCompleted: true` — written on "Skip" or after final step

**Why not driver.js/react-joyride:** Not installed; these are typically 50-200KB libraries for a 5-step flow. The custom approach gives full control over the dark/gold brand styling.

**Tour trigger logic:**
```js
// In dashboard page or AuthContext post-login
// After user doc loads, check:
if (!profileUser.onboardingTourCompleted) {
  setShowTour(true);
}
```

### Pattern 5: Profile Completion Card
**What:** Card component that calculates completion % from user doc fields.

```js
const COMPLETION_FIELDS = [
  { key: 'companyName',    label: 'Company name' },
  { key: 'companyLogo',    label: 'Company logo' },
  { key: 'country',        label: 'Country' },
  { key: 'phone',          label: 'Phone number' },
  { key: 'about',          label: 'Company description' },
  { key: 'companyWebsite', label: 'Website' },
];

const completed = COMPLETION_FIELDS.filter(f => !!profileUser[f.key]).length;
const percent = Math.round((completed / COMPLETION_FIELDS.length) * 100);
```

- Equal weight per field (Claude's discretion — simplest and most transparent to user)
- Dismiss flag: `localStorage.setItem('profileCardDismissed_' + uid, '1')` — returns on next visit until 100%
- At 100%: hide permanently (no dismiss needed, no localStorage needed)
- Placement: Dashboard page (top area, above deals list) + Profile page (below ProfileCard)

### Pattern 6: Zoho SalesIQ in FAB Widget
**What:** Add a two-tab header to MessagesWidget. "Messages" tab shows existing ConversationList/MessageThread. "Support" tab shows the Zoho SalesIQ chat.

**Zoho SalesIQ embed approach:**
1. Load Zoho SalesIQ script via `<Script strategy="lazyOnload">` in the root `layout.js` (applies to all pages).
2. Suppress Zoho's default floating button globally with `$zoho.salesiq.floatbutton.visible('hide')` after the script loads.
3. In FAB Support tab: render an `<iframe>` that points to the Zoho SalesIQ chat URL derived from the widget key, OR use the JS API to open/close the Zoho chat panel inside the FAB panel area.
4. For public pages (no FAB): conditionally show a standalone "Chat with us" button that calls `$zoho.salesiq.floatbutton.visible('show')` or directly opens the Zoho chat window via the JS API.

**Env var pattern (consistent with project):**
```js
// .env.local
NEXT_PUBLIC_ZOHO_WIDGET_KEY=your_key_here
```

**Script tag (layout.js addition):**
```jsx
{process.env.NEXT_PUBLIC_ZOHO_WIDGET_KEY && (
  <Script id="zoho-salesiq" strategy="lazyOnload">
    {`
      window.$zoho = window.$zoho || {};
      $zoho.salesiq = $zoho.salesiq || { widgetcode: "${process.env.NEXT_PUBLIC_ZOHO_WIDGET_KEY}", values: {}, ready: function(){} };
      var d = document;
      s = d.createElement('script');
      s.type = 'text/javascript';
      s.id = 'zsiqscript';
      s.defer = true;
      s.src = 'https://salesiq.zohopublic.com/widget';
      t = d.getElementsByTagName('script')[0];
      t.parentNode.insertBefore(s, t);
      $zoho.salesiq.ready = function() {
        $zoho.salesiq.floatbutton.visible('hide');
      };
    `}
  </Script>
)}
```

**MEDIUM confidence** — Zoho SalesIQ JS API varies by account plan. The `floatbutton.visible('hide')` call is from Zoho's official documentation. The iframe URL approach may require a Zoho Business plan. Verify against actual Zoho dashboard after user obtains key.

### Pattern 7: Upload My Products Request Button
**What:** Button on own profile page that creates a Firestore document and sends an in-app admin notification.

**Firestore collection:** `productUploadRequests/{requestId}` with fields:
```js
{
  uid: string,          // requesting user
  companyName: string,
  displayName: string,
  status: 'pending',    // pending | fulfilled | rejected
  createdAt: Timestamp,
}
```

**Notification:** Use the existing `Notification.createSystemNotification()` or a new `Notification.createProductUploadRequest()` static factory method sent to all admin users — same pattern as new user registration notification in `useRegister.js`.

**Button state:**
- "Request Product Upload" → on click → Firestore write → show confirmation text "Our team will upload your products for you." + disable button (already requested)
- Query Firestore on load to check if an existing pending request exists → disable button if so

### Anti-Patterns to Avoid
- **Adding `companyType` as a Firestore-only field without wiring the role claim:** The role claim must be set at login time (via custom claims). If the self-registration flow does not set custom claims, providers will have the wrong claims and middleware will reject their access.
- **Building the tour with pointer-events on the overlay blocking all page interaction:** The overlay must have `pointer-events: none` everywhere except the step panel, and the highlighted element area.
- **Using the Zoho floating button without suppressing it:** Without `$zoho.salesiq.floatbutton.visible('hide')`, Zoho renders its own floating button that conflicts with the FAB. Always suppress globally, control programmatically.
- **Setting `recaptchaValue` state on SSR:** The reCAPTCHA widget is a DOM-dependent third-party library. Any SSR render of it will crash on Vercel. Wrap with `dynamic(..., { ssr: false })`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number validation | Custom regex | libphonenumber-js (already installed) | Handles country codes, formats, edge cases |
| Country phone code lookup | External API | Static `COUNTRY_PHONE_CODES` map in constants | Already have COUNTRIES ISO2 list; static map is zero-latency |
| Form state | `useState` per field | react-hook-form (already in RegisterForm) | Project standard; validation, dirty/touch tracking |
| Accessibility checks | Manual guesswork | axe-core browser extension (DevTools) + Lighthouse | Systematic WCAG 2.1 AA coverage |
| Zoho SalesIQ script loading | `useEffect` + `document.createElement` | `next/script` with `strategy="lazyOnload"` | Next.js script loading is framework-idiomatic; handles deduplication |

**Key insight:** This phase has zero new package installations. Every UI pattern has an existing analogue in the codebase.

---

## Common Pitfalls

### Pitfall 1: Vercel Crash on Register Page — SSR and reCAPTCHA
**What goes wrong:** Vercel build or server render crashes with a window/document access error.
**Why it happens:** `react-google-recaptcha` v3.x calls `document` or `window` during module initialization. In Next.js App Router with SSR, this causes a crash because the module is imported at the server component boundary even though `RegisterForm` is a `'use client'` component. The Suspense boundary in `register/page.jsx` handles `useSearchParams` but does NOT prevent the import-time crash.
**How to avoid:** Wrap `RegisterForm` itself (or just the reCAPTCHA subcomponent) with `next/dynamic(..., { ssr: false })`. Since RegisterForm is already the only content inside the Suspense, converting it to a dynamic import is straightforward.

```jsx
// register/page.jsx
import dynamic from 'next/dynamic';
const RegisterForm = dynamic(
  () => import('@/presentation/components/features/auth/RegisterForm/RegisterForm').then(m => ({ default: m.RegisterForm })),
  { ssr: false, loading: () => <div className="animate-spin ..." /> }
);
```

**Warning sign:** Build logs on Vercel mention `ReferenceError: window is not defined` or `document is not defined`.

### Pitfall 2: Custom Claims Not Set for Self-Registering Providers
**What goes wrong:** A user selects "Logistics Company" at registration, gets `role: 'logistics_provider'` written to Firestore, but their auth token still has `role: 'member'` custom claim. Middleware and Firestore rules reject provider-specific routes.
**Why it happens:** Custom claims are set by Cloud Functions (e.g., `inviteUser` CF). The self-registration path creates a Firebase Auth user without any custom claim trigger for non-member roles.
**How to avoid:** Add an `onUserCreate` Firebase Auth trigger (or a post-registration callable CF) that reads the Firestore user doc's `role` field and calls `admin.auth().setCustomUserClaims(uid, { role })`. Alternatively, add a `setRoleOnRegistration` callable CF that the client calls after registration. The user must then call `getIdToken(true)` to refresh claims.
**Warning sign:** Provider user can register but gets redirected to /forbidden when trying to access provider routes.

### Pitfall 3: Onboarding Tour `getBoundingClientRect` Before DOM Paint
**What goes wrong:** Tour step highlights wrong position or shows at (0,0).
**Why it happens:** Target element is not yet rendered when the tour mounts (e.g., dashboard is still loading).
**How to avoid:** Start the tour only after the dashboard data has loaded (check the loading state before showing tour). Use a `requestAnimationFrame` or a `useEffect` with a `setTimeout(0)` to defer the rect calculation to after paint.

### Pitfall 4: Zoho SalesIQ Script Loading Race Condition
**What goes wrong:** Calling `$zoho.salesiq.floatbutton.visible('hide')` before the Zoho script has finished loading throws a `TypeError`.
**Why it happens:** `strategy="lazyOnload"` defers the script load; user may interact with the Support tab before the script is ready.
**How to avoid:** Guard all `$zoho.salesiq.*` calls with `if (window.$zoho?.salesiq)`. Add a `zohoReady` state that is set inside the `$zoho.salesiq.ready` callback and use it to show a loading spinner in the Support tab.

### Pitfall 5: Profile Completion Card Hydration Mismatch
**What goes wrong:** Server renders card as visible, client reads localStorage and hides it, causing hydration mismatch.
**Why it happens:** localStorage is not available on the server.
**How to avoid:** Initialize dismiss state as `false` (show card by default) and read localStorage in `useEffect` after mount — same pattern used by `CookieConsent` and `CurrencyConvertPanel` in this codebase.

### Pitfall 6: CookieConsent Already Exists
**What goes wrong:** Planner creates a new CookieConsent component instead of reviewing/updating the existing one.
**Why it happens:** The CookieConsent component is already built and wired into `(main)/layout.jsx`. The CONTEXT.md description of the banner differs slightly from the existing implementation.
**How to avoid:** Treat CookieConsent as an UPDATE task, not a CREATE task. Review the existing `CookieConsent.jsx` and update the banner text and button labels to match the locked decision ("We use cookies to improve your experience and analyze site traffic." + Accept / Decline / Learn More). The existing Google Analytics blocking logic is already present (via `consentChanged` custom event).

---

## Code Examples

### Company Type to Role Mapping
```js
// src/core/constants/companyTypes.js
export const COMPANY_TYPES = [
  { value: 'trade',     label: 'Trade Company' },
  { value: 'logistics', label: 'Logistics Company' },
  { value: 'insurance', label: 'Insurance Company' },
];

export const COMPANY_TYPE_TO_ROLE = {
  trade:     'member',
  logistics: 'logistics_provider',
  insurance: 'insurance_provider',
};
```

### Phone Code Map (minimal — extend from countries.js)
```js
// src/core/constants/countries.js addition
export const COUNTRY_PHONE_CODES = {
  AF: '+93', AL: '+355', DZ: '+213', AD: '+376', AO: '+244',
  AR: '+54', AM: '+374', AU: '+61', AT: '+43', AZ: '+994',
  BH: '+973', BD: '+880', BY: '+375', BE: '+32', BZ: '+501',
  BR: '+55', BN: '+673', BG: '+359', CA: '+1', CN: '+86',
  CO: '+57', HR: '+385', CY: '+357', CZ: '+420', DK: '+45',
  EG: '+20', ET: '+251', FI: '+358', FR: '+33', GE: '+995',
  DE: '+49', GH: '+233', GR: '+30', HU: '+36', IN: '+91',
  ID: '+62', IR: '+98', IQ: '+964', IE: '+353', IL: '+972',
  IT: '+39', JP: '+81', JO: '+962', KZ: '+7', KE: '+254',
  KW: '+965', LB: '+961', LY: '+218', MY: '+60', MX: '+52',
  MA: '+212', NL: '+31', NZ: '+64', NG: '+234', NO: '+47',
  OM: '+968', PK: '+92', PE: '+51', PH: '+63', PL: '+48',
  PT: '+351', QA: '+974', RO: '+40', RU: '+7', SA: '+966',
  SG: '+65', ZA: '+27', KR: '+82', ES: '+34', SE: '+46',
  CH: '+41', SY: '+963', TW: '+886', TH: '+66', TN: '+216',
  TR: '+90', UA: '+380', AE: '+971', GB: '+44', US: '+1',
  VN: '+84', YE: '+967', // add remaining from COUNTRIES list
};
```

### Onboarding Tour — Firestore Flag Write
```js
// After tour completes or skip
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

await updateDoc(doc(db, 'users', uid), {
  onboardingTourCompleted: true,
  onboardingTourCompletedAt: new Date(),
});
```

### Firestore Security Rule for productUploadRequests
```
match /productUploadRequests/{requestId} {
  allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
  allow read, update: if isAdmin();
}
```

### Profile Completion Calculation
```js
const COMPLETION_FIELDS = [
  { key: 'companyName',    label: 'Company name' },
  { key: 'companyLogo',    label: 'Company logo' },
  { key: 'country',        label: 'Country' },
  { key: 'phone',          label: 'Phone number' },
  { key: 'about',          label: 'Company description' },
  { key: 'companyWebsite', label: 'Website' },
];

function getProfileCompletion(user) {
  const completed = COMPLETION_FIELDS.filter(f => !!user?.[f.key]);
  return {
    percent: Math.round((completed.length / COMPLETION_FIELDS.length) * 100),
    completedFields: completed.map(f => f.key),
    missingFields: COMPLETION_FIELDS.filter(f => !user?.[f.key]),
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native `<select>` for dropdowns | `SearchableSelect` custom component | Phase 7+ hardening | Consistent dark styling, searchable; use for companyType |
| `document.createElement('script')` for third-party embeds | `next/script` with `strategy` prop | Next.js 11+ | Framework-managed loading, deduplication, no manual cleanup |
| `role` is always `'member'` on self-registration | Can pass `role` to RegisterUseCase.execute() | Already in codebase | Provider self-registration is now possible via this path |

**Deprecated/outdated:**
- The `ROLE-03` requirement ("Admin can create and invite provider and lawyer accounts — no self-registration") is superseded for Trade/Logistics/Insurance company type selection. The locked decision in CONTEXT.md explicitly overrides this: self-registration now assigns provider roles.

---

## Open Questions

1. **Custom Claims for Self-Registered Providers**
   - What we know: The inviteUser CF sets custom claims. The self-registration path does not set claims beyond what Firebase Auth creates by default.
   - What's unclear: Is there an `onUserCreate` trigger or `onUserCreated` that sets claims from Firestore after self-registration?
   - Recommendation: Check `functions/index.js` for `onCreate` trigger. If absent, add a `setUserRoleClaim` callable CF or a `functions.auth.user().onCreate()` trigger that reads the Firestore user doc's `role` field and sets the claim.

2. **Zoho SalesIQ Iframe vs JS API Embed**
   - What we know: Zoho SalesIQ provides a JS SDK with `ready` callback and `floatbutton.visible()` API. The widget renders as an iframe Zoho manages.
   - What's unclear: Whether the JS API supports programmatically embedding the chat panel inside a custom container (vs. just controlling the Zoho floating widget).
   - Recommendation: Implement the Support tab as a wrapper that calls `$zoho.salesiq.floatbutton.visible('show')` / `('hide')` when the tab is active/inactive, rather than embedding a custom iframe. This is simpler and relies only on the documented API.

3. **Vercel Preview vs Production Crash**
   - What we know: The crash is on the register page and root cause is described as unknown. reCAPTCHA is the most likely culprit (SSR import).
   - What's unclear: Whether it is a build-time crash or a runtime crash on Vercel.
   - Recommendation: Apply the `ssr: false` dynamic import fix first and verify the Vercel preview deploys cleanly. If the crash persists, check the Vercel build log for the exact error message.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, pytest.ini, or test directories found |
| Config file | None — Wave 0 gap |
| Quick run command | Manual browser testing |
| Full suite command | Manual browser testing + Lighthouse accessibility audit |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-01 | Company type dropdown renders and updates form value | manual | — | N/A |
| REG-02 | Logistics/Insurance selection sets correct role in Firestore + custom claim | manual | — | N/A |
| REG-03 | Country selection auto-fills phone prefix; user can override | manual | — | N/A |
| REG-04 | Register page deploys without crash on Vercel preview | smoke | Vercel preview URL check | N/A |
| REG-05 | Tour appears on first login, shows 5 steps, persists skip flag in Firestore | manual | — | N/A |
| REG-06 | Profile completion % calculates correctly; card dismisses/reappears | manual | — | N/A |
| REG-07 | Support tab shows Zoho chat; standalone button shows on public pages | manual | — | N/A |
| REG-08 | Request button creates Firestore doc + admin receives notification | manual | — | N/A |
| REG-09 | WCAG 2.1 AA: 0 critical violations in Lighthouse accessibility audit | audit | `npx lighthouse <url> --only-categories=accessibility` | N/A |

### Sampling Rate
- **Per task commit:** Manual smoke test in browser
- **Per wave merge:** Full manual regression on affected pages
- **Phase gate:** Vercel preview deployment is live and register page loads without crash; Lighthouse accessibility score on key pages

### Wave 0 Gaps
- [ ] No test infrastructure exists in this project — no files to create; all validation is manual and via Lighthouse
- [ ] `npx lighthouse` requires Chrome — available on any developer machine; no config file needed

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read: RegisterForm, RegisterFormFields, registerSchema, useRegister, RegisterUseCase, MessagesWidget, CookieConsent, countries.js, roles.js, layout files — all read and analyzed
- Next.js official docs pattern: `next/dynamic` with `ssr: false` for browser-only libraries — established Next.js pattern for SSR-unsafe imports
- libphonenumber-js: `isValidPhoneNumber` already used in registerSchema — phone validation path confirmed

### Secondary (MEDIUM confidence)
- Zoho SalesIQ JS API: `$zoho.salesiq.floatbutton.visible()` — from Zoho's public developer documentation; `ready` callback pattern is standard. Note: specific API surface may vary by Zoho plan.
- react-google-recaptcha SSR crash: Known common issue with reCAPTCHA v2 in Next.js App Router — `ssr: false` dynamic import is the established fix pattern.

### Tertiary (LOW confidence)
- Custom claims for self-registration: Inferred from reading `RegisterUseCase` and `useRegister`. The `functions/index.js` was not read — the `onCreate` trigger may or may not exist. Must verify before implementing REG-02.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed in package.json; no new installs needed
- Architecture: HIGH — all integration points confirmed by reading source files
- Zoho embed: MEDIUM — JS API shape confirmed from docs pattern; plan-level details may need adjustment after user obtains key
- Custom claims for providers: MEDIUM — code path confirmed; Cloud Functions not read
- Pitfalls: HIGH — SSR/reCAPTCHA pitfall is well-established; others derived from codebase patterns

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (stable stack, 30-day window)
