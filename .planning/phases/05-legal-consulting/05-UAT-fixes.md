---
status: diagnosed
phase: 05-legal-consulting
source: 05-09-SUMMARY.md, 05-10-SUMMARY.md, 05-11-SUMMARY.md
started: 2026-03-21T10:00:00Z
updated: 2026-03-21T10:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Lawyer Redirect on Pending Engagement
expected: Log in as the hired lawyer. Click the "new legal request" notification (or navigate directly to /deals/{dealId}/legal while engagement is pending). Instead of seeing "Awaiting Lawyer Acceptance" client screen, you should be redirected to /lawyer/dashboard where you can accept/decline.
result: pass

### 2. Hire Request Notification Link
expected: When lawyer receives hire_request notification, clicking it navigates to /lawyer/dashboard (not /deals/{dealId}/legal).
result: pass

### 3. Risk Items Real-Time (Rapid Addition)
expected: As lawyer, add 4+ risk items rapidly in the legal channel. Switch to client view — all risk items should appear in real-time without page reload. No items missing or delayed.
result: pass

### 4. Duplicate Hire Prevention
expected: On a lawyer's profile page, click "Hire This Lawyer" rapidly (double/triple click). Only ONE engagement document should be created in Firestore. Button should disable after first click. No duplicate entries.
result: pass

### 5. Review Prompt After Engagement Close
expected: Close an engagement (as client, click "Close Channel"). After channel becomes read-only, an amber review prompt banner appears with 5 interactive star icons, optional comment textarea, and "Submit Review" button. Submit a review — banner disappears, review appears on lawyer's profile page.
result: issue
reported: "pass but when client send it does not dissappear as if client didn't send yet"
severity: minor

### 6. Review Deduplication
expected: After submitting a review, revisit the completed legal channel. The review prompt banner should NOT appear again (engagement has reviewedAt set).
result: pass

### 7. Approve Draft Flow
expected: As client in an active legal channel, go to the Contract Drafts tab in the right panel. The latest draft should have an "Approve & Apply to Deal" button. Click it — button is replaced by a green "Approved & applied to deal" badge. The deal's contract is updated with the approved draft content.
result: pass
notes: User wants to expand this flow — need changes for the other party (buyer/seller) to see/interact with approved contract.

### 8. Notification Sender Role Text
expected: When client sends a message or action in the legal channel, the lawyer's notification should say "New message from your client" (not "New message from your lawyer"). Deploy Cloud Functions first if not yet deployed.
result: pass
notes: Two additional bugs found during testing — (1) After client hires a lawyer, "Hire this Lawyer" button doesn't update to show request was sent, (2) After lawyer accepts engagement, accept/reject buttons still visible instead of updating.

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Review prompt banner should disappear immediately after client submits review"
  status: failed
  reason: "User reported: pass but when client send it does not dissappear as if client didn't send yet"
  severity: minor
  test: 5
  root_cause: "subscribeToEngagementForDeal in LegalEngagementRepository.js missing includeMetadataChanges:true — server-side reviewedAt update doesn't trigger immediate re-render"
  artifacts:
    - path: "src/data/repositories/LegalEngagementRepository.js"
      issue: "Line 131: onSnapshot missing includeMetadataChanges option"
  missing:
    - "Add { includeMetadataChanges: true } to subscribeToEngagementForDeal onSnapshot call"
  debug_session: ""
  fix_applied: true

## Additional Bugs (found during testing, not from fix plans)

- "Hire this Lawyer" button doesn't update state after client sends hire request — still shows "Hire this Lawyer" instead of "Request Sent" or disabled state
- After lawyer accepts engagement on dashboard, accept/reject buttons remain visible instead of updating to show accepted state
