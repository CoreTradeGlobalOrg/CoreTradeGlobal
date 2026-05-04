---
status: complete
phase: 17-registration-onboarding-and-misc
source: 17-01-SUMMARY.md, 17-02-SUMMARY.md, 17-03-SUMMARY.md, 17-04-SUMMARY.md
started: 2026-05-04T10:00:00Z
updated: 2026-05-04T11:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Company Type Selection on Registration
expected: On the registration page, there should be a "Company Type" dropdown with options like Trade, Logistics, Insurance, etc.
result: issue
reported: "Need to change UI label from 'Trade Company' to 'Supplier'"
severity: minor

### 2. Phone Country Code Auto-Fill
expected: When you select a country, a read-only dial code badge should appear next to the phone input.
result: issue
reported: "Should be an independent selectable dropdown on the left of phone input (like HubSpot forms), not auto-filled from company country. User may want a different country code than company country — bad UX."
severity: major

### 3. Auto-Role Assignment on Registration
expected: Register with a provider company type, user gets the corresponding role after verification.
result: pass

### 4. Register Page Loads Without Crash
expected: Navigate to /register without errors or white screen.
result: pass

### 5. Onboarding Tour for New Users
expected: Step-by-step overlay tour on homepage for new users.
result: issue
reported: "Doesn't match specification. Need: (1) '?' FAB button on left corner to relaunch tour, (2) Tour buttons on FAQ, About Us, Settings pages, (3) 3-part guided tour: Profile Creation Guide (4 steps), Product Upload Guide (3 steps), RFQ Creation Guide (3 steps) with specific Turkish text content provided by user."
severity: major

### 6. Profile Completion Card
expected: Gold progress bar card showing profile completeness on homepage.
result: issue
reported: "Can't see any progress bar on homepage"
severity: major

### 7. Zoho SalesIQ Support Tab (Authenticated)
expected: Two-tab FAB widget with Messages and Support tabs.
result: skipped
reason: User decided to drop Zoho SalesIQ — will build custom AI chatbot instead

### 8. Zoho SalesIQ Button (Public Pages)
expected: Gold floating chat button on public pages.
result: skipped
reason: Zoho SalesIQ dropped from scope

### 9. Product Upload Request Button
expected: "Upload my products" button on profile creates a request.
result: issue
reported: "Missing or insufficient permissions error — Firestore rules likely not deployed"
severity: major

### 10. Cookie Consent Banner Text
expected: Banner shows updated text with "Decline" button instead of "Reject All".
result: pass

### 11. Accessibility - Login Form
expected: Proper labels, autoComplete, aria-labels on login form.
result: pass

### 12. Accessibility - Heading Hierarchy
expected: Single h1 on homepage, other sections use h2.
result: pass

## Summary

total: 12
passed: 5
issues: 5
pending: 0
skipped: 2

## Gaps

- truth: "Company type dropdown shows 'Supplier' label"
  status: failed
  reason: "User reported: Need to change UI label from 'Trade Company' to 'Supplier'"
  severity: minor
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Phone country code is an independent selectable dropdown"
  status: failed
  reason: "User reported: Should be independent dropdown like HubSpot forms, not auto-filled from company country"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Onboarding tour follows 3-part specification with Turkish content"
  status: failed
  reason: "User reported: Doesn't match spec. Need ? FAB button, tour on FAQ/About/Settings pages, 3-part guide (Profile 4 steps, Product 3 steps, RFQ 3 steps) with specific Turkish text"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Profile completion progress card visible on homepage"
  status: failed
  reason: "User reported: Can't see any progress bar on homepage"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Product upload request button works without permission errors"
  status: failed
  reason: "User reported: Missing or insufficient permissions error"
  severity: major
  test: 9
  root_cause: "Firestore rules not deployed — productUploadRequests collection rules exist in code but not on server"
  artifacts: []
  missing: []
  debug_session: ""

## Scope Changes

- **Zoho SalesIQ dropped** — User wants to build custom AI chatbot instead. Tests 7 and 8 skipped.
- **Onboarding tour redesign** — User provided detailed 3-part tour specification in Turkish. Current implementation doesn't match.
