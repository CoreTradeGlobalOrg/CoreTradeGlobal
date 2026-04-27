# Phase 17: Registration, Onboarding & Misc - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the registration flow with company type selection and phone country code auto-fill, add a step-by-step onboarding tour with profile completion progress bar, integrate Zoho SalesIQ chatbot into the FAB messaging widget, add cookie consent banner, perform full WCAG 2.1 AA accessibility audit, fix Vercel preview crash, add "Upload my products" request button, and update FAQ content.

</domain>

<decisions>
## Implementation Decisions

### Registration Flow
- **Company type dropdown** at registration: Trade Company, Logistics Company, Insurance Company
- Custom styled dropdown (NOT native HTML select) — matches existing dark input styling (bg-[#1A283B], border-[#2A3B52], gold focus ring)
- **Auto-assign role** based on company type: selecting Logistics → `logistics_provider` role, selecting Insurance → `insurance_provider` role. No admin invite step needed for self-registering providers.
- **Phone country code auto-fill** from selected country field — e.g., selecting Turkey shows +90 prefix. User can override if needed.
- **Vercel preview crash** on register page — investigate and fix (root cause unknown)

### Onboarding Guide
- **Step-by-step overlay tour** that auto-starts on first login — highlights key UI elements one at a time
- **5 steps per role:**
  - Trade companies: 1) Dashboard overview, 2) Browse products, 3) Submit RFQ, 4) Start a deal, 5) Messages
  - Providers: 1) Dashboard overview, 2) Quote requests, 3) Submit quote, 4) Active shipments/policies, 5) Messages
- Tour is dismissable ("Skip tour" button), shows once (flag stored in Firestore user doc)
- All new users (trade + providers) see onboarding first, then land on role-appropriate dashboard
- **Profile completion progress bar** on dashboard + profile page
  - Shows "X% complete" with gold fill bar
  - Card format with list of completed/missing fields: company name, logo, country, phone, description, website
  - "Complete Profile" button navigates to profile edit
  - Card is dismissable but comes back until 100%
  - Disappears permanently at 100%

### Homepage Chatbot (Zoho SalesIQ)
- **Zoho SalesIQ embed** — script tag integration, managed from Zoho dashboard
- **Integrated as "Support" tab in the FAB messaging widget** on all pages (logged-in and public)
  - FAB has two tabs: [Messages] [Support]
  - Messages tab: existing conversation list
  - Support tab: Zoho SalesIQ chat inline
- **Public pages** (homepage, about, FAQ) where no FAB exists: show standalone Zoho chat button
- **Env var:** `NEXT_PUBLIC_ZOHO_WIDGET_KEY` — placeholder, user will get the key from Zoho dashboard

### Compliance & Misc
- **Cookie consent banner** at bottom of page on first visit
  - "We use cookies to improve your experience and analyze site traffic."
  - Accept / Decline / Learn More buttons
  - Stores preference in localStorage
  - Blocks Google Analytics until accepted
- **Accessibility audit** — Full WCAG 2.1 AA audit across all pages
  - Fix: alt text, keyboard navigation, focus indicators, ARIA labels, color contrast, screen reader support
- **"Upload my products" request button** on user profile page
  - Button: "Request Product Upload"
  - Creates a request in Firestore and notifies admin (in-app notification)
  - Admin sees request in admin panel and manually uploads products for the user
  - Shows confirmation text: "Our team will upload your products for you."
- **FAQ text updates** — user will provide the new content, Claude implements the UI update (already done in this session — 15 questions updated)

### Claude's Discretion
- Exact onboarding tour library/implementation (overlay positioning, step transitions)
- How to embed Zoho SalesIQ iframe within the FAB widget panel
- Cookie consent banner animation and positioning details
- Accessibility audit tooling (axe-core, Lighthouse, manual testing)
- Profile completion field weighting (equal weight per field or different)

</decisions>

<specifics>
## Specific Ideas

- The custom company type dropdown should feel like a native part of the form — same styling as other fields, not a third-party component
- Phone country code should appear as a prefix segment inside the phone input field: [+90 ▾] [555 123 4567]
- Profile completion card should be prominent on the dashboard but not block the user from using the platform
- The Zoho SalesIQ Support tab in the FAB should feel native — not like an embedded iframe with visible borders

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RegisterForm` (`src/presentation/components/features/auth/RegisterForm/RegisterForm.jsx`): Current registration form with Zod + react-hook-form — needs company type dropdown and phone code additions
- `MessagesWidget` (FAB) (`src/presentation/components/common/MessagesWidget/MessagesWidget.jsx`): FAB chat widget — needs Support tab for Zoho SalesIQ
- `countries.js` (`src/core/constants/countries.js`): Country list — can be extended with phone codes
- `roles.js` (`src/core/constants/roles.js`): Role constants — maps company type to role

### Established Patterns
- Zod + react-hook-form with zodResolver for form validation
- Dark UI theme: bg-[#1A283B], border-[#2A3B52], gold accents (#FFD700)
- Firestore user document for user preferences/flags (onboardingComplete, etc.)
- localStorage for client-side preferences (cookie consent)

### Integration Points
- RegisterForm: add company type dropdown + phone code auto-fill
- Cloud Functions or client-side: auto-assign role based on company type
- MessagesWidget: add tab system for Messages/Support
- Dashboard page: add profile completion card + onboarding tour trigger
- Layout: add cookie consent banner component
- All pages: accessibility fixes (alt text, ARIA, focus, contrast)

</code_context>

<deferred>
## Deferred Ideas

None — all items from the backlog are included in this phase.

</deferred>

---

*Phase: 17-registration-onboarding-and-misc*
*Context gathered: 2026-04-27*
