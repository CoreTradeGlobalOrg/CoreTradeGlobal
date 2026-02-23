---
phase: 02-deal-creation-and-negotiation-s1
plan: "06"
subsystem: notifications-messaging
tags: [fcm, push-notifications, deal-events, system-messages, chat-ui]
dependency_graph:
  requires: [02-04]
  provides: [deal-push-notifications, system-message-cards]
  affects: [messaging-ui, notification-routing]
tech_stack:
  added: []
  patterns: [deal_event-fcm-type, service-worker-click-url, system-message-branch]
key_files:
  created: []
  modified:
    - src/presentation/components/common/NotificationListener/NotificationListener.jsx
    - public/firebase-messaging-sw.js
    - src/presentation/components/features/messaging/MessageThread/MessageThread.jsx
    - src/presentation/components/features/messaging/MessageThread/MessageThread.css
    - functions/index.js
decisions:
  - "deal_event type detection added to both foreground (NotificationListener) and background (service worker) FCM handlers -- single dispatch point for both contexts"
  - "clickUrl stored in notification.data at show time, read at notificationclick -- avoids reconstructing URL in service worker context where dealId may not be accessible"
  - "Duplicate system message removed from createDeal; onDealOfferCreated trigger is sole owner of system message posting for new_deal events"
  - "system message branch returns early in messages.map() before isOwn check -- clean separation, no isOwn logic for system messages"
metrics:
  duration: "~2 minutes"
  completed: "2026-02-23"
  tasks_completed: 2
  files_modified: 5
---

# Phase 02 Plan 06: Fix Deal Notifications and System Message Rendering Summary

FCM push notifications for deal events now show deal-specific titles (New Deal, Counter-Offer Received, etc.) and navigate to /deals/[dealId] when clicked. System messages in chat render as centered dashed-border cards with a gold "Check the Deal" button. Duplicate system messages on deal creation are eliminated.

## What Was Built

### Task 1: Fix FCM Notification Handlers and Remove Duplicate System Message

Three changes across three files:

**NotificationListener.jsx (foreground FCM):** Added `dataType` detection from `payload.data?.type`. When `deal_event`, constructs deal-specific title using `eventLabels` map, sets `clickUrl` to `/deals/[dealId]`, and on `notification.onclick` uses `window.location.href = clickUrl` instead of opening the messages FAB. Regular message notifications retain existing behavior.

**firebase-messaging-sw.js (background FCM):** Same `deal_event` type detection in `onBackgroundMessage`. Stores `clickUrl` in `notification.data` at show time. The `notificationclick` handler now reads `event.notification.data?.clickUrl` instead of always building a `/messages/[conversationId]` path -- this fixes the `/messages/undefined` navigation bug.

**functions/index.js:** Removed the entire post-transaction system message block from `createDeal` (lines 1058-1088). The `onDealOfferCreated` Firestore trigger already posts a system message for `round === 1` (new_deal), so the createDeal block was creating a duplicate. Updated `onDealOfferCreated` content strings: `new_deal` now says "Deal initiated for [product]" and `counter_offer` says "Counter-offer (Round N) for [product]".

### Task 2: System Message Rendering in MessageThread

**MessageThread.jsx:** Added `import Link from 'next/link'` and `import { Handshake } from 'lucide-react'`. Added a system message branch at the top of `messages.map()` that returns early when `message.type === 'system'`. Renders a centered card with `message.content`, an optional `Link` button using `message.dealLink` (with Handshake icon), and a timestamp.

**MessageThread.css:** Added `.system-message-wrapper` (flex, justify-content center), `.system-message-bubble` (dashed border, dark background, centered column layout), `.system-message-text` (gray, 13px), `.system-message-deal-btn` (gold border, gold text, hover states), and `.system-message-time` (10px, muted).

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` passes cleanly (both after Task 1 and Task 2).
- FCM foreground handler correctly branches on `deal_event` type.
- FCM background handler stores `clickUrl` in notification data; `notificationclick` reads it.
- `createDeal` no longer posts a system message (comment explains onDealOfferCreated handles it).
- `onDealOfferCreated` content updated to match expected wording.
- MessageThread renders system messages as centered cards with Check the Deal button.
- Regular chat messages continue to render as before (system branch returns early, no interference).

## Self-Check: PASSED

Files verified:
- `src/presentation/components/common/NotificationListener/NotificationListener.jsx` -- FOUND, contains `deal_event`
- `public/firebase-messaging-sw.js` -- FOUND, contains `deal_event` and `clickUrl`
- `src/presentation/components/features/messaging/MessageThread/MessageThread.jsx` -- FOUND, contains `type === 'system'`
- `src/presentation/components/features/messaging/MessageThread/MessageThread.css` -- FOUND, contains `system-message`
- `functions/index.js` -- FOUND, contains `onDealOfferCreated` with updated content

Commits verified:
- `d65fcaa` feat(02-06): fix FCM deal_event handlers and remove duplicate system message
- `2054cc2` feat(02-06): add system message rendering in MessageThread with Check the Deal button
