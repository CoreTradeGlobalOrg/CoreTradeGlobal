# Admin Email Plan

Created 2026-11-18. Admins pick recipients (members, a segment, or a CSV of consented
contacts), choose a sender address and an HTML template, preview it, and send.

## Decisions (2026-11-18)

- **Everything is transactional and goes through ZeptoMail.** No marketing stream, no second
  provider. CSV lists are consented contacts the team keeps elsewhere.
- ZeptoMail judges content, not consent, and blocks accounts with high bounce rates. A block also
  stops sign-in links, deal and RFQ email. So: validate CSVs before sending, throttle sends, and
  never send again to an address that bounced (Phase 3 lands before the first large CSV send).
- **Senders:** `noreply@`, `info@`, `contact@coretradeglobal.com`. Managed in the admin
  Email → Senders tab, stored in `emailSenders`. The client only ever sends a `senderId`; the
  server reads the sender and checks its domain against `EMAIL_ALLOWED_FROM_DOMAINS`
  (default `coretradeglobal.com`).
- **Templates accept raw HTML** with a live preview (sandboxed iframe, desktop/mobile widths,
  variables filled with sample values) and a "Send test to me" button.

## Manual setup (outside the code)

1. ZeptoMail → Sender Address: add `info@` and `contact@coretradeglobal.com` and link them to the
   Mail Agent whose token is `ZEPTOMAIL_TOKEN`. (`noreply@` already sends.)
2. Google Workspace (the domain's MX): `info@` and `contact@` must be real mailboxes, aliases or
   groups so replies land somewhere. `noreply@` gets `replyTo: contact@` in its sender record.
3. DNS: the apex has two SPF TXT records, which makes SPF a permerror. Replace both with one:
   `v=spf1 include:_spf.google.com include:_spf.firebasemail.com include:eu.zcsend.net ~all`

## Phase 1: Senders and templates

- `functions/emailClient.js`: `sendEmail()` accepts an optional `from: { address, name }`.
  System email keeps the env default (`noreply@`).
- `functions/adminEmail/`: variable rendering + sender validation.
- `sendAdminTestEmail` (onCall, admin): renders a template with sample variables and sends it
  from the chosen sender to the calling admin's own address. A success stamps the sender's
  `verifiedAt`; a failure stores `lastTestError`.
- Firestore: `emailSenders/{id}` (address, displayName, replyTo, active, verifiedAt,
  lastTestError) and `emailTemplates/{id}` (name, subject, html, createdBy, updatedAt).
  Admin read/write; sender addresses must be on `coretradeglobal.com` (rules + server).
- Admin tab **Email** with sub-tabs **Templates** and **Senders**.
- Template editor: name, subject, HTML (paste or upload `.html`), live preview, warnings
  (`<script>`, non-https images/links, unknown variables, empty subject, HTML over 100 KB which
  Gmail clips), sample variable inputs, test send.
- Variables: `{{firstName}}`, `{{lastName}}`, `{{companyName}}`, `{{email}}`, plus any CSV
  column (Phase 2). Values are HTML-escaped in the body; the subject is plain text.

## Phase 2: Recipients and sending

- Recipient sources, combinable: member selection (Users-tab filters + checkboxes, "Email
  selected" button), an analytics segment (`getMemberSegments`), CSV upload (papaparse).
- CSV: `email` column required; other columns become variables. Pre-send summary: valid,
  invalid, duplicate, in `unsubscribes`, previously bounced, matched to a member.
- Default exclusions: admins, banned, deleted, suspended accounts. One email per address.
- `emailCampaigns/{id}` (template snapshot, sender, status, counters) and
  `emailCampaigns/{id}/recipients/{emailHash}` (email, uid?, vars, status, skipReason, error).
- `createEmailCampaign` (onCall, admin) writes the campaign and enqueues Cloud Tasks;
  `sendEmailCampaignBatch` (`onTaskDispatched`, rate-limited) sends 50 per task, re-checks
  suppression at send time, and marks each recipient in a transaction so retries never
  double-send. Scheduling uses the task `scheduleTime`.
- History tab, Pause/Cancel, confirmation dialog (type SEND above 100 recipients), daily cap.
- Image upload for templates (Firebase Storage → https URL inserted into the HTML).
- Unsubscribe: `{{unsubscribe_link}}` already renders each recipient's `/unsubscribe?email=` link
  (preview and tests use `test@example.com`). Still to do: skip addresses in `unsubscribes`, add
  `List-Unsubscribe` / `List-Unsubscribe-Post` headers pointing at `/api/unsubscribe/one-click`, and
  give `/unsubscribe` a confirm button. Today it unsubscribes on page load, so corporate link
  scanners (Outlook Safe Links) can unsubscribe people who never clicked.

## Phase 3: Bounces

- ZeptoMail bounce/complaint webhook → `emailSuppressions/{emailHash}`; Phase 2 skips these.
- Bounce/complaint counts per campaign in History.

## Progress log

- 2026-11-18: plan written; Phase 1 committed (2517a03). Firestore rules and `sendAdminTestEmail` deployed to production; the Email tab goes live when `development` is pushed.
- 2026-11-19: `development` pushed; Email tab on the Vercel preview. Fix 065caac: `{{unsubscribe_link}}` rendered empty (unknown variable); now filled by the server. `sendAdminTestEmail` redeployed.
