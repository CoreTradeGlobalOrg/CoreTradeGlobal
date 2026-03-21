---
status: diagnosed
trigger: "After engagement is completed (close channel), client sees nothing -- no review prompt appears"
created: 2026-03-18T12:00:00Z
updated: 2026-03-18T12:00:00Z
---

## Current Focus

hypothesis: Review prompt UI component was never built -- backend exists, frontend does not
test: Search entire src/ for any review dialog/modal/form component
expecting: No component found
next_action: Report diagnosis

## Symptoms

expected: After engagement completes, client sees a review prompt with star rating + text input
actual: Client sees read-only channel with "This engagement is completed. Read-only." banner -- no review prompt
errors: None (silent omission)
reproduction: Close any active legal engagement -> observe completed channel as client
started: Always -- feature was never implemented on the frontend

## Eliminated

(none needed -- root cause found on first pass)

## Evidence

- timestamp: 2026-03-18T12:01:00Z
  checked: useLegalActions.js hook
  found: submitReview function EXISTS (calls Cloud Function 'submitLawyerReview')
  implication: Backend action hook is ready, just never called from any UI

- timestamp: 2026-03-18T12:02:00Z
  checked: Cloud Functions (functions/index.js lines 3837-3906)
  found: submitLawyerReview Cloud Function EXISTS and is fully implemented -- writes review to users/{lawyerId}/reviews/{auto-id}
  implication: Full backend pipeline exists (CF + Firestore write)

- timestamp: 2026-03-18T12:03:00Z
  checked: LawyerProfileContent.jsx ReviewsSection
  found: ReviewsSection component EXISTS that displays reviews (reads from users/{lawyerId}/reviews subcollection, renders star ratings)
  implication: Review display works -- the missing piece is the review submission UI

- timestamp: 2026-03-18T12:04:00Z
  checked: Glob for src/**/Review*.* components
  found: ZERO files matching Review* pattern in entire src tree
  implication: No ReviewDialog, ReviewModal, ReviewForm, or ReviewPrompt component exists

- timestamp: 2026-03-18T12:05:00Z
  checked: LegalChannel.jsx and ChannelCenter.jsx
  found: When isReadOnly=true, ChannelCenter shows "This engagement is completed. Read-only." banner. No review prompt rendered anywhere.
  implication: Completed state only shows read-only notice, nothing else

- timestamp: 2026-03-18T12:06:00Z
  checked: Legal channel page (deals/[dealId]/legal/page.jsx)
  found: Sets isReadOnly = engagement.isCompleted() and passes to LegalChannel. No review logic at page level.
  implication: Page correctly detects completed state but has no review flow

- timestamp: 2026-03-18T12:07:00Z
  checked: LegalEngagement entity
  found: No review-related fields (no hasReviewed, reviewedAt, etc.) on the entity
  implication: Entity needs a field to track whether client already submitted a review (to prevent showing prompt after review is done)

## Resolution

root_cause: The review submission UI component was never built. The backend is fully wired (Cloud Function `submitLawyerReview` + `useLegalActions.submitReview` hook + `ReviewsSection` display in LawyerProfileContent), but no frontend component exists to collect the star rating and comment from the client after engagement completion.
fix: Build a ReviewPrompt component and render it in the completed engagement flow
verification: (pending implementation)
files_changed: []
