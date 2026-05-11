---
status: complete
phase: 17-registration-onboarding-and-misc
source: 17-05-SUMMARY.md, 17-06-SUMMARY.md, 17-07-SUMMARY.md, 17-08-SUMMARY.md
started: 2026-05-05T10:00:00Z
updated: 2026-05-05T23:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Company Type Label (GAP-1 retest)
expected: Company type dropdown shows "Supplier" not "Trade Company".
result: pass

### 2. Phone Code Independent Dropdown (GAP-2 retest)
expected: Searchable dropdown on left of phone input with flag + dial code.
result: pass
notes: Fixed dropdown width, removed overlay hack, fixed phone validation (libphonenumber-js)

### 3. Profile Completion Card Position (GAP-4 retest)
expected: Fixed top-right, checklist with strikethrough, Skip per session, hide at 100%.
result: pass
notes: Fixed positioning (layout-level fixed), header alignment, added Company documents field, highlight incomplete fields on profile, click Complete Profile dismisses card

### 4. Onboarding Tour - 3 Part Guide (GAP-3 retest)
expected: 3-part English tour with contextual positioning, collapse/minimize, persist across navigation.
result: pass
notes: Complete redesign — English content, collapse/minimize pill, router.push navigation, tour lives in layout, Go to Profile auto-minimizes

### 5. Tour "?" FAB Button (GAP-3 retest)
expected: Gold "?" FAB on bottom-left on all pages.
result: pass

### 6. Product Upload Request Button (GAP-5 retest)
expected: Upload request button works without permission errors.
result: issue
reported: "Admin notification should navigate to admin panel. User needs ability to upload CSV or send message with product details. Current flow too basic — needs detailed workflow redesign."
severity: major

### 7. Zoho SalesIQ Removed
expected: No Zoho code or UI anywhere.
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Product upload request has proper admin navigation and user can upload CSV or send details"
  status: failed
  reason: "User reported: Admin notification should navigate to admin panel. User needs to upload CSV or send message with product details. Current flow too basic."
  severity: major
  test: 6
  root_cause: "Feature needs redesign — current implementation only creates a simple Firestore doc with no file upload or messaging workflow"
  artifacts: []
  missing: []
  debug_session: ""
