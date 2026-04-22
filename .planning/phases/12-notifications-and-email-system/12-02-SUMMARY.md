---
phase: 12-notifications-and-email-system
plan: "02"
subsystem: email-infrastructure
tags: [email, branding, throttle, cloud-functions]
dependency_graph:
  requires: []
  provides: [buildBrandedEmailHtml, noreply-sender, message-email-throttle]
  affects: [sendDealEmail, sendLegalNotification, sendMessageNotification, sendInviteEmail]
tech_stack:
  added: []
  patterns: [shared-email-template, per-user-daily-throttle, inline-css-email]
key_files:
  modified:
    - functions/index.js
decisions:
  - buildBrandedEmailHtml is the single source-of-truth HTML email template — all callers pass a body HTML string + optional CTA label/URL + optional footer note
  - buildDealEmailHtml and buildLegalEmailHtml removed — callers now call buildBrandedEmailHtml directly with inline body construction
  - buildInviteEmailHtml updated to delegate to buildBrandedEmailHtml for consistent branding
  - Message email throttle is global per user (not per conversation) — lastMessageEmailSentAt field on user doc
  - Race condition on throttle is acceptable for a 1/day limit — Firestore transaction cost not justified
  - Email failure in sendMessageNotification is non-blocking (try/catch, log, continue) — same pattern as sendDealEmail
metrics:
  duration: 3 min
  completed: "2026-04-22"
  tasks_completed: 2
  files_modified: 1
---

# Phase 12 Plan 02: Email Infrastructure Refactor Summary

**One-liner:** Shared branded dark-theme HTML email template (buildBrandedEmailHtml) replacing two duplicate builders, all senders changed to noreply@, and 24h throttled message digest emails added to sendMessageNotification.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Create shared branded email template and update sender address | a86f25f | buildBrandedEmailHtml added; buildInviteEmailHtml, sendDealNotifications, sendLegalNotification updated to use it; buildDealEmailHtml and buildLegalEmailHtml removed; sender changed to noreply@ |
| 2 | Add message email throttling in sendMessageNotification | 4acf8c2 | Email sending with 24h throttle via lastMessageEmailSentAt added to per-recipient loop |

## What Was Built

### buildBrandedEmailHtml

A single shared HTML email template function with:
- Header: dark `#0F1C2E` background, "CoreTradeGlobal" with gold `#FFD700` "Trade" accent, gold separator bar
- Body: dark `#1A2332` background, `#E8EDF2` text, renders passed `body` HTML string
- CTA button (optional): gold `#FFD700` background, black text
- Footer: standard account footer + link to `/settings` notification preferences
- `footerNote` optional additional text above the standard footer line
- Table-based layout with inline CSS only for email client compatibility

### Sender Address

Changed from `info@coretradeglobal.com` to `noreply@coretradeglobal.com` in:
- `sendInviteEmail` (direct Resend call)
- `sendDealEmail` (covers all deal and legal emails)

No DNS changes required — coretradeglobal.com already verified in Resend.

### Message Email Throttle

Added email section inside `sendMessageNotification` Cloud Function per-recipient loop:
- Checks `preferences.messages.email !== false` (default true)
- Reads `userData.lastMessageEmailSentAt` (Timestamp on user doc)
- Skips if last sent within 24h (86,400,000 ms)
- Sends branded email with "View Messages" CTA to conversation URL
- Updates `lastMessageEmailSentAt: Timestamp.now()` after successful send
- Wrapped in try/catch — non-blocking

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

Files created/modified:
- functions/index.js — modified

Commits:
- a86f25f: feat(12-02): create buildBrandedEmailHtml template and update sender address
- 4acf8c2: feat(12-02): add message email throttling to sendMessageNotification
