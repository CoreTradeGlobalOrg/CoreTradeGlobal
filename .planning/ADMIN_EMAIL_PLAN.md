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
4. ZeptoMail → Agents → (the agent of `ZEPTOMAIL_TOKEN`) → Webhooks → Configure Webhook:
   URL `https://us-central1-core-trade-global.cloudfunctions.net/zeptomailWebhook`, authorization
   header `X-Webhook-Key` = `ZEPTOMAIL_WEBHOOK_KEY` from `functions/.env.core-trade-global`, events
   Hard bounces + Feedback loop. Deploy `zeptomailWebhook` first, then press Verify.

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

## Phase 2: Recipients and sending (deployed 2026-11-19)

Built as described below, except: member selection lives in the Email → Send tab (its own
filters: role, approval, email verified, country, analytics segment) instead of checkboxes in
the Users tab; no scheduling and no image upload yet. Daily cap: `ADMIN_EMAIL_DAILY_CAP`,
default 2000. Queue: one batch of 50 at a time (`maxConcurrentDispatches: 1`), about two emails a
second. `/unsubscribe` now waits for a click.

Deploy order: `firestore:rules`, then one at a time `sendAdminTestEmail`, `createEmailCampaign`,
`updateEmailCampaign`, `sendEmailCampaignBatch` (first deploy enables the Cloud Tasks API),
`zeptomailWebhook`; then push `development`.


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

## Phase 3: Bounces (deployed 2026-11-19; ZeptoMail webhook still to configure)

`zeptomailWebhook` (HTTPS) checks `X-Webhook-Key`, suppresses only the bounced recipient
(`details.bounced_recipient`) or the complainer (`details.to`, event `fbl_compliant`), and updates
the campaign recipient via `client_reference = campaignId:emailHash`. Soft bounces are ignored.
A running send pauses itself at a 5% hard-bounce rate after 50 sent. History lists the
suppressed addresses with Remove.


- ZeptoMail bounce/complaint webhook → `emailSuppressions/{emailHash}`; Phase 2 skips these.
- Bounce/complaint counts per campaign in History.

## Progress log

- 2026-11-18: plan written; Phase 1 committed (2517a03). Firestore rules and `sendAdminTestEmail` deployed to production; the Email tab goes live when `development` is pushed.
- 2026-11-19: `development` pushed; Email tab on the Vercel preview. Fix 065caac: `{{unsubscribe_link}}` rendered empty (unknown variable); now filled by the server. `sendAdminTestEmail` redeployed.
- 2026-11-19: Phases 2 and 3 written and committed locally; e2e test against the Firestore emulator with a fake ZeptoMail API passes. Not deployed. Unverified: whether ZeptoMail passes `List-Unsubscribe` through `mime_headers` (first real test send will show).
- 2026-11-19: Phases 2 and 3 deployed: `firestore:rules`, `sendAdminTestEmail`, `createEmailCampaign`, `updateEmailCampaign`, `sendEmailCampaignBatch` (enabled Cloud Tasks API; queue RUNNING, concurrency 1, 3 attempts), `zeptomailWebhook` (403 without key, 200 with key). `development` pushed (1e3111e). Left: configure the webhook in ZeptoMail, first real test send (List-Unsubscribe check), small real send.
- 2026-11-19: Real test send checked in Gmail "Show original": `List-Unsubscribe` and `List-Unsubscribe-Post` arrive through `mime_headers`, both are in the DKIM `h=` list (d=coretradeglobal.com), SPF/DKIM/DMARC pass. Gmail still shows no Unsubscribe button: that is Gmail's reputation/volume decision, not a header problem.
