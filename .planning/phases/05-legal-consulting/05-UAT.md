---
status: complete
phase: 05-legal-consulting
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md
started: 2026-03-18T08:30:00Z
updated: 2026-03-18T09:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Lawyer Directory Page
expected: Navigate to /lawyers. Page shows search bar, specialization filter pills, "Available Now" toggle, and language dropdown. Lawyer cards appear in a responsive grid showing name, specializations, availability badge, star rating, and pricing. Clicking a card navigates to the lawyer's profile page. Skeleton loaders show while fetching. Empty state with "Clear filters" CTA appears when no results match.
result: pass

### 2. Lawyer Profile Page
expected: Click a lawyer card from the directory. Navigates to /profile/{lawyerId}. Shows lawyer-specific content: stats cards (experience, deals, rating, response time), about section with education and specialization/language pills, availability and pricing card with "Hire This Lawyer" button, and reviews section. Member-specific sections (documents, products, requests, account settings) should NOT appear for lawyer profiles.
result: pass
notes: No /lawyers button on navbar — intentional or missing? Lawyers cannot edit lawyer-specific content when logged in as lawyer or admin.

### 3. Legal Banner on Deal Page
expected: Open any deal page (/deals/{dealId}) as the deal owner. A gold-gradient Legal Banner appears with a feature list, pricing badge, and a "Find a Lawyer" button with readable black text. Clicking "Find a Lawyer" navigates to /lawyers?dealId=... The banner can be dismissed (X button) and stays dismissed per-deal. A different deal should still show the banner.
result: pass

### 4. End-to-End Hire Flow (dealId Persistence)
expected: From deal page, click "Find a Lawyer" → navigates to /lawyers?dealId=... Click a lawyer card → profile page still has dealId in URL. Click "Hire This Lawyer" → engagement is created successfully (no "Select a deal first" toast). Return to deal page — Legal Banner now shows compact engagement badge with lawyer name and "Pending" status.
result: issue
reported: "I got bug when lawyer got notification for new legal request recieved but when I click that notification it says awaiting Lawyer Acceptance even I logged in as lawyer. But I can accept on Lawyer Dashboard"
severity: major

### 5. Lawyer Dashboard
expected: Log in as the lawyer. Navigate to /lawyer/dashboard. Dashboard shows 4 stat cards (total, pending, active, completed). The Pending Requests section shows the engagement from Test 4 with client name, deal product, and "Accept" / "Decline" buttons. Click "Accept" — engagement moves to Active section with "Open Channel" link.
result: pass

### 6. Legal Channel — 3-Panel Layout
expected: From the lawyer dashboard, click "Open Channel" on the active engagement. Navigates to /deals/{dealId}/legal. A 3-panel layout loads: Left panel shows lawyer profile, deal info, documents list, and consulting status. Center panel shows chat area with message input and file attachment button. Right panel shows tabs for Contract Drafts, Revisions, and Risk Items.
result: pass

### 7. Legal Channel — Chat & Messages
expected: In the legal channel center panel, type a message and send. Message appears as a styled bubble with sender name and timestamp. Textarea auto-resizes for longer messages. Upload a file via attachment button — appears as attachment card with filename and download link. Messages from other party appear on opposite side. Date separators appear between different days. System messages display distinctly.
result: pass
notes: When uploading an image, pressing download opens a new tab instead of downloading the file.

### 8. Legal Channel — Quick Actions
expected: Quick Action Toolbar appears below chat input. As lawyer, see lawyer-specific actions (Submit Draft, Flag Risk, Mark Resolved, etc). As client, see client-specific actions (Request Review, Close Channel, etc). Clicking an action opens an inline form above the toolbar. Submitting creates a system message in chat and updates the relevant right panel tab.
result: issue
reported: "I added 4 risk as lawyer but somehow client just updated live 2 risk after that I need to reload to page to fetch the other 2 risk, still notification message for lawyer is 'new message from your lawyer' it should be new message for your client because client send that message or actions, other stuff passed"
severity: major

### 9. Legal Channel — Contract Drafts, Revisions & Risks
expected: Right panel Contract tab shows latest draft with download and "Upload New" button. Uploading new draft auto-increments version. Revisions tab shows version timeline (newest first, "Latest" badge on most recent). Risks tab shows risk cards with color-coded severity badges, description, and toggle to mark resolved/open. Can add new risks via inline form.
result: pass

### 10. Close Engagement & Read-Only State
expected: Click "Close Channel" button. Engagement status changes to "completed". Legal channel becomes read-only — chat input disabled, Quick Action Toolbar hidden, upload buttons disabled. "Channel is now read-only" system message appears. Past messages and documents remain visible.
result: pass

### 11. Review After Engagement
expected: After engagement is completed, client sees a review prompt. Client submits review (star rating + text). Review appears on the lawyer's profile page in the reviews section.
result: issue
reported: "no client sees nothing after engagement is completed"
severity: major

### 12. Lawyer Channels Page
expected: Lawyer visits /lawyer/channels. Shows list of all engagements sorted by recently updated. Pending cards show status and link to dashboard. Active/completed cards link to /deals/{dealId}/legal.
result: pass
notes: Lawyer gets "Missing or insufficient permissions" Firestore error when navigating to /deals/{dealId}/legal directly.

### 13. Lawyer Deals Page
expected: Lawyer visits /lawyer/deals. Shows only active and completed engagements (pending excluded). Active show "Open Channel" link, completed show "View Channel" link.
result: pass
notes: /lawyer/deals is basically same as /lawyer/channels (just product name vs client name) — consider removing it. Also channel cards not clickable, only the button is — should make whole card clickable.

### 14. Lawyer Navbar & Routing
expected: Logged in as lawyer, Navbar shows "Lawyer Dashboard", "Client Channels", "Deal Review" links. Each navigates to the correct page. These links are hidden for member/buyer/seller roles.
result: pass
notes: Admin navbar is overcrowded with all links — needs dropdown/submenu solution for lawyer links.

### 15. Real-Time Status Updates
expected: When lawyer accepts a hire request, status updates simultaneously across Lawyer Dashboard, LegalBanner on DealPage, and Channels page without page refresh.
result: pass

### 16. Notifications
expected: Notifications fire for: (1) lawyer hired → lawyer gets notification, (2) hire accepted → client gets notification, (3) new message in channel → other party notified, (4) new contract draft uploaded → other party notified, (5) risk item created/updated → other party notified. Both in-app and email.
result: issue
reported: "we canceled the sending an email. lawyer gets notification like client 'New Message from Lawyer' when client send a message. Very serious bug: legalEngagements docs on firestore create duplicated entries. Contract drafts created by lawyer have no path to apply to the real deal for buyer/seller — when client clicks approve action we need to update the deal contract for buyer-seller."
severity: major

### 17. No-Lawyer Deal Path
expected: Create or open a deal without hiring a lawyer. Progress through all stages (negotiation, contract, payment, etc.). Deal advances normally — legal consulting never blocks deal progression.
result: pass

### 18. Privacy — Opposing Party Cannot See Lawyer
expected: Log in as the opposing party of a deal with an active lawyer engagement (hired by other side). Visit the deal page. No indication of other party's lawyer — no engagement badge, no access to their legal channel. See standard promotional Legal Banner (or nothing if dismissed).
result: pass

## Summary

total: 18
passed: 12
issues: 4
pending: 0
skipped: 2

## Gaps

- truth: "Legal channel page should show accept/decline UI for lawyer when engagement is pending, not the client-facing 'Awaiting Lawyer Acceptance' screen"
  status: failed
  reason: "User reported: I got bug when lawyer got notification for new legal request recieved but when I click that notification it says awaiting Lawyer Acceptance even I logged in as lawyer. But I can accept on Lawyer Dashboard"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Risk items added by lawyer should update in real-time for client (all items, not just first 2), and notification text should correctly identify sender role"
  status: failed
  reason: "User reported: I added 4 risk as lawyer but somehow client just updated live 2 risk after that I need to reload to page to fetch the other 2 risk, still notification message for lawyer is 'new message from your lawyer' it should be new message for your client because client send that message or actions, other stuff passed"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Client should see a review prompt after engagement is completed to rate and review the lawyer"
  status: failed
  reason: "User reported: no client sees nothing after engagement is completed"
  severity: major
  test: 11
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Notifications should correctly identify sender role, legalEngagements should not create duplicate docs, and approved contract drafts should flow back to the real deal for buyer/seller"
  status: failed
  reason: "User reported: we canceled the sending an email. lawyer gets notification like client 'New Message from Lawyer' when client send a message. Very serious bug: legalEngagements docs on firestore create duplicated entries. Contract drafts created by lawyer have no path to apply to the real deal for buyer/seller — when client clicks approve action we need to update the deal contract for buyer-seller."
  severity: major
  test: 16
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
