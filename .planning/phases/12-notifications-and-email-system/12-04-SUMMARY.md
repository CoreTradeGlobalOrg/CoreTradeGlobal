---
phase: 12-notifications-and-email-system
plan: 04
subsystem: notifications
tags: [fcm, push-notifications, cloud-functions, firestore-rules]
dependency_graph:
  requires: [12-02]
  provides: [rfq-push, member-registration-push, provider-quote-push, fcm-generic-handler]
  affects: [functions/index.js, firestore.rules, NotificationListener]
tech_stack:
  added: []
  patterns:
    - sendFCMPushToUser helper (single-user FCM send with invalid token cleanup)
    - post-batch FCM dispatch pattern in broadcastQuoteRequests
    - generic foreground FCM handler in NotificationListener
key_files:
  created: []
  modified:
    - functions/index.js
    - firestore.rules
    - src/presentation/components/common/NotificationListener/NotificationListener.jsx
decisions:
  - sendFCMPushToUser extracted as a shared helper to avoid code duplication across three new triggers
  - broadcastQuoteRequests sends FCM AFTER batch.commit() — follows established non-blocking, outside-transaction pattern
  - onRFQCreated uses preferences?.providers?.push (not system) — RFQ is a marketplace/provider-facing event
  - onNewMemberRegistered uses preferences?.system?.push for admin alerts — system category matches admin notification context
  - NotificationListener foreground handler now has explicit new_message branch and a fully generic fallback for all other types
metrics:
  duration: 4 min
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_modified: 3
---

# Phase 12 Plan 04: New Push Notification Triggers and FCM Fix Summary

**One-liner:** Extended FCM push coverage to member registration, RFQ creation, and quote broadcast events with generic foreground handler and updated Firestore allowlist.

## What Was Built

### Task 1: FCM Pipeline Debug and Fix

Inspected all three FCM files. The pipeline was functionally correct (VAPID key correctly read from `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, service worker path `/firebase-messaging-sw.js` correct, `getToken` called with vapidKey + serviceWorkerRegistration, background push handler using native `push` event + `showNotification`).

The one gap was in `NotificationListener.jsx`: the foreground `onMessage` handler's else-branch treated all non-`deal_event` types as message notifications — using `senderName` and `messageContent` fields that only message events have. This would silently fail for new event types.

**Fix applied:**
- Added explicit `new_message` branch (existing behavior preserved)
- Added generic fallback for all other types (`rfq_created`, `new_user_approval`, `quote_received`, `announcement`, future types) — reads `title`, `body`, and `link` data fields that all new CF triggers set
- Fixed `onclick` handler: `new_message` opens FAB, all other types navigate to `clickUrl`

### Task 2: New Push Notification Triggers and Firestore Rules

**`sendFCMPushToUser` helper added** (`functions/index.js`): single-user FCM send with invalid token cleanup (mirrors the pattern in `sendDealNotifications`). Used by all three new trigger paths.

**`onNewMemberRegistered` trigger** (`users/{userId}`): fires on document create, only acts when `role === 'member'`. Queries all admin users, sends in-app (`type: 'new_user_approval'`) + FCM push to each admin. Respects `preferences?.system?.push`.

**`onRFQCreated` trigger** (`requests/{requestId}`): fires on document create. Queries all members, skips the RFQ creator. Sends in-app (`type: 'rfq_created'`) + FCM push + email to each member. Respects `preferences?.providers?.push` and `preferences?.providers?.email`.

**`broadcastQuoteRequests` updated**: after `batch.commit()`, iterates a `providerPushQueue` (populated during the batch loop). Sends in-app (`type: 'quote_received'`) + FCM push to each provider. Respects `preferences?.providers?.push`.

**Firestore rules updated**: notification type allowlist in `users/{userId}/notifications` create rule now includes `'deal'`, `'legal'`, `'announcement'`, `'rfq_created'` alongside the existing types.

## Verification

- `npx next build`: compiled successfully
- `grep "rfq_created" firestore.rules`: present in allowlist
- `grep "announcement" firestore.rules`: present in allowlist
- `grep "VAPID_KEY" usePushNotifications.js`: `NEXT_PUBLIC_FIREBASE_VAPID_KEY` correctly used in `getToken`
- `onRFQCreated` trigger at `requests/{requestId}` confirmed in functions/index.js

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Generic FCM foreground handler**
- **Found during:** Task 1
- **Issue:** NotificationListener's foreground handler defaulted to treating unknown types as messages (`senderName`, `messageContent` fields) — would silently fail to display rfq_created and other new notification types
- **Fix:** Added explicit `new_message` branch + generic fallback reading `title`/`body`/`link` data fields
- **Files modified:** `src/presentation/components/common/NotificationListener/NotificationListener.jsx`
- **Commit:** 62a8ccf

## Self-Check: PASSED

- `functions/index.js` modified: confirmed (exports.onNewMemberRegistered, exports.onRFQCreated, sendFCMPushToUser)
- `firestore.rules` modified: confirmed (deal, legal, announcement, rfq_created in allowlist)
- `NotificationListener.jsx` modified: confirmed (new_message branch + generic fallback)
- Commits exist: 62a8ccf (task 1), 21a70eb (task 2)
