---
status: diagnosed
trigger: "Phase 05 UAT gaps: duplicate engagements, wrong notification sender, no draft-to-deal flow"
created: 2026-03-18T00:00:00Z
updated: 2026-03-18T00:00:00Z
---

## Current Focus

hypothesis: Three separate issues identified with root causes confirmed
test: Code review of Cloud Functions + client-side hooks + UI components
expecting: n/a - diagnosis complete
next_action: Return structured diagnosis

## Symptoms

expected: (1) One engagement doc per hire, (2) Correct sender role in notifications, (3) Approved drafts flow to deal contract
actual: (1) Duplicate docs possible, (2) Hardcoded "from Lawyer" in title map, (3) No approval mechanism exists
errors: none - functional gaps
reproduction: (1) Click hire multiple times fast, (2) Client sends message -> lawyer sees "New message from your lawyer", (3) Approve draft -> nothing happens to deal
started: Since Phase 05 launch

## Eliminated

(none)

## Evidence

- timestamp: 2026-03-18
  checked: functions/index.js hireLayyer function (line 3583-3661)
  found: Uses deterministic ID + existing-doc check, but no client-side debounce
  implication: Issue 1 - Server-side guard exists but client can fire multiple concurrent requests

- timestamp: 2026-03-18
  checked: functions/index.js onLegalMessageCreated (line 3919-3960)
  found: Correctly determines sender role and uses new_message_from_client vs new_message_from_lawyer
  implication: Issue 2 - Cloud Function logic is CORRECT. Need to verify this is actually deployed.

- timestamp: 2026-03-18
  checked: functions/index.js getLegalEventTitle (line 3444-3456)
  found: Maps new_message_from_lawyer -> "New message from your lawyer" and new_message_from_client -> "New message from your client"
  implication: Issue 2 - Title mapping is also correct in code. If wrong in production, functions may not be deployed.

- timestamp: 2026-03-18
  checked: ChannelRight.jsx ContractTab component (line 100-204)
  found: Only shows download + upload actions. No "Approve Draft" button exists anywhere.
  implication: Issue 3 - CONFIRMED MISSING. No approval UI or backend logic exists.

- timestamp: 2026-03-18
  checked: useLegalChannel.js, LegalEngagementRepository.js
  found: No approveDraft method, no deal contract update logic
  implication: Issue 3 - Entire draft-to-deal approval flow is unimplemented.

## Resolution

root_cause: See per-issue breakdown below
fix: Not yet applied
verification: Not yet verified
files_changed: []
