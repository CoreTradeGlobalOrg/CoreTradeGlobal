---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/components/common/NotificationBell/NotificationBell.jsx
  - src/presentation/components/common/NotificationBell/NotificationBell.css
autonomous: true
requirements: [QUICK-1]

must_haves:
  truths:
    - "Clicking a deal notification in the NotificationBell dropdown navigates to /deals/[dealId]"
    - "Deal notifications show a Handshake icon (not the default MessageSquare)"
    - "Deal notification items have a gold-tinted unread background consistent with deal theme"
  artifacts:
    - path: "src/presentation/components/common/NotificationBell/NotificationBell.jsx"
      provides: "deal notification click handler and icon mapping"
      contains: "notification.type === 'deal'"
    - path: "src/presentation/components/common/NotificationBell/NotificationBell.css"
      provides: "deal notification styling"
      contains: "deal-icon"
  key_links:
    - from: "NotificationBell.jsx handleNotificationClick"
      to: "/deals/[dealId]"
      via: "router.push using notification.dealId or notification.link"
      pattern: "router\\.push.*deals"
---

<objective>
Add deal notification handling to the NotificationBell in-app dropdown so clicking a deal notification navigates to /deals/[dealId].

Purpose: The Cloud Function `sendDealNotifications` already writes Firestore notification documents with `type: 'deal'`, `dealId`, and `link: /deals/${dealId}`. The push notification handlers (NotificationListener.jsx and firebase-messaging-sw.js) already handle `deal_event` type correctly. However, the NotificationBell.jsx in-app dropdown has NO branch for `type === 'deal'` -- deal notifications silently do nothing when clicked. This is the gap.

Output: NotificationBell handles deal notifications with correct routing, icon, and styling.
</objective>

<execution_context>
@/Users/wenubey/.claude/get-shit-done/workflows/execute-plan.md
@/Users/wenubey/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/presentation/components/common/NotificationBell/NotificationBell.jsx
@src/presentation/components/common/NotificationBell/NotificationBell.css
@functions/index.js (lines 1557-1568 — Firestore notification doc shape: type='deal', eventType, dealId, link)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add deal notification click handler, icon, and styling to NotificationBell</name>
  <files>
    src/presentation/components/common/NotificationBell/NotificationBell.jsx
    src/presentation/components/common/NotificationBell/NotificationBell.css
  </files>
  <action>
In NotificationBell.jsx:

1. Add `Handshake` to the lucide-react import (line 12): `import { Bell, MessageSquare, FileText, X, Check, Trash2, CheckCircle, XCircle, UserPlus, Handshake } from 'lucide-react';`

2. In `handleNotificationClick` (line 36), add a NEW branch for deal notifications BEFORE the fallback conversationId check (before line 52). The Cloud Function stores deal notifications with `type: 'deal'` and both `dealId` and `link` fields directly on the notification object (NOT nested in `notification.data`). Add:
   ```
   } else if (notification.type === 'deal' && (notification.dealId || notification.link)) {
     router.push(notification.link || `/deals/${notification.dealId}`);
   }
   ```
   This must be inserted between the quote_accepted/quote_rejected block (line 51) and the conversationId fallback (line 52).

3. In `getNotificationIcon` (line 61), add a case for deal notifications:
   ```
   case 'deal':
     return <Handshake className="w-4 h-4" />;
   ```

4. In `getIconClass` (line 77), add a case for deal notifications:
   ```
   case 'deal':
     return 'deal-icon';
   ```

In NotificationBell.css:

5. Add deal notification icon styling (after the `.notification-item-icon.approval-icon` block around line 202):
   ```css
   .notification-item-icon.deal-icon {
     background: rgba(255, 215, 0, 0.15);
     color: #FFD700;
   }
   ```

6. Add deal notification unread background (after the `.notification-item.new_user_approval.unread` block around line 169):
   ```css
   .notification-item.deal.unread {
     background: rgba(255, 215, 0, 0.08);
   }
   ```

7. Add deal unread dot color (after the `.notification-unread-dot.approval` block around line 253):
   ```css
   .notification-unread-dot.deal {
     background: #FFD700;
   }
   ```

IMPORTANT: The notification.type stored by the Cloud Function is 'deal' (NOT 'deal_event'). The FCM data payload uses type='deal_event' but the Firestore notification document uses type='deal'. These are two different notification delivery channels. Do NOT confuse them.

ALSO IMPORTANT: The CF stores `dealId` and `link` as top-level fields on the notification document (lines 1558-1568 of functions/index.js), NOT nested inside a `data` object. So access them as `notification.dealId` and `notification.link`, NOT `notification.data.dealId`.
  </action>
  <verify>
    Run `npm run build` -- should pass with no errors.
    Manually verify in NotificationBell.jsx:
    - handleNotificationClick has a branch for `notification.type === 'deal'` that calls `router.push`
    - getNotificationIcon has a `case 'deal'` returning Handshake icon
    - getIconClass has a `case 'deal'` returning 'deal-icon'
    Manually verify in NotificationBell.css:
    - `.notification-item-icon.deal-icon` exists with gold styling
    - `.notification-item.deal.unread` exists with gold-tinted background
  </verify>
  <done>
    Clicking a deal notification in the NotificationBell dropdown navigates to /deals/[dealId] using Next.js router (client-side navigation, no full page reload). Deal notifications display a Handshake icon with gold background. Unread deal notifications have a gold-tinted highlight consistent with the platform's deal theme. Existing notification types (messages, quotes, approvals) continue to work unchanged.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes cleanly
- NotificationBell.jsx `handleNotificationClick` has 5 distinct type branches: new_user_approval, quote_received, quote_accepted/rejected, deal, and fallback conversationId
- No regressions to existing notification types (quote, message, approval handlers untouched)
</verification>

<success_criteria>
1. A Firestore notification document with `type: 'deal'` and `dealId: 'abc123'` triggers navigation to `/deals/abc123` when clicked in the NotificationBell dropdown
2. Deal notifications show a Handshake icon with gold accent (matching the deal theme used throughout the platform)
3. Existing notification click behavior for messages, quotes, and user approvals is unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/1-when-user-click-notification-for-deal-i-/1-SUMMARY.md`
</output>
