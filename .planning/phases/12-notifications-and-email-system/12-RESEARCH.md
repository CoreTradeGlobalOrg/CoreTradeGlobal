# Phase 12: Notifications and Email System - Research

**Researched:** 2026-04-22
**Domain:** Firebase Cloud Messaging, Firestore subcollections, Resend email, React infinite scroll, Next.js routing
**Confidence:** HIGH — all findings derived from direct codebase inspection and existing established patterns

## Summary

Phase 12 is a hardening and expansion of the notification/email infrastructure that already exists. The codebase has a mature notification system: Firestore subcollection storage (`users/{uid}/notifications`), a `NotificationRepository` with full CRUD, a `NotificationBell` dropdown, `NotificationListener` for foreground FCM, and `sendDealNotifications`/`sendLegalNotification` helpers in Cloud Functions. The phase extends this without rebuilding it.

The six major work areas are: (1) a new `/notifications` full-page notification center with filter tabs, infinite scroll, and bulk actions; (2) email sender address migration from `info@` to `noreply@` and a shared branded HTML template; (3) four new push notification event types (new member, RFQ created, quote broadcast, announcement); (4) FCM debugging; (5) an admin announcement system with scheduling; and (6) LinkedIn share + clipboard copy on the news detail page.

No new data models are needed at the collection level — all work fits in existing Firestore paths with the addition of an `announcements` collection and the `lastMessageEmailSentAt` timestamp field on user docs.

**Primary recommendation:** Work in three groups: (A) pure client changes (notification center page, bell dropdown, LinkedIn share), (B) Cloud Function additions (new push triggers, message email throttle, announcement CF), and (C) integrations (Firestore rules updates, middleware, admin tab).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Notification center page**
- Access via "View all" link at the bottom of existing NotificationBell dropdown, navigates to /notifications
- Bell dropdown increased from 5 to 10 items, "View all" link added below
- Single chronological list with type filter tabs: All | Deals | Messages | Legal | Providers | System (matches Phase 10 preference categories)
- Infinite scroll for loading older notifications (IntersectionObserver pattern from Phase 7)
- No retention limit — keep all notifications forever, never auto-delete
- Unread visual: bold title text + small accent dot indicator; read notifications are dimmer
- Empty state: bell icon illustration + "No notifications yet" message
- Bulk actions:
  - "Mark all as read" button
  - "Delete all" button
  - Individual checkbox selection with batch mark-read/delete for selected
  - Clicking a notification marks it as read and navigates to the relevant page

**Email delivery & templates**
- Sender address changed from `info@coretradeglobal.com` to `noreply@coretradeglobal.com` for all automated emails
- Stay on Resend (no SMTP migration) — already configured and working
- Branded HTML email template: CTG logo header, gold accent colors matching app dark theme, content body area, unsubscribe footer link
- Template applied consistently to all system emails (deal, legal, message digest, RFQ, announcements)
- Message email throttling: max 1 "You have new messages" email per user per day across all conversations
- Throttle tracking via `lastMessageEmailSentAt` timestamp field on user doc — Cloud Function checks before sending

**Push notification coverage**
- New push events added:
  - New member registered → admin gets push notification (currently in-app only)
  - New RFQ created → all members get push notification (currently no notification at all)
  - Quote request broadcast → providers get push notification (currently in-app only)
  - System announcements → all targeted users get push (new capability via admin tool)
- RFQ notifications: every new RFQ triggers individual push to all members (no throttling — low volume at 8 users)
- FCM fix approach: debug and fix existing setup (service worker, token lifecycle, permission flow) — not a rebuild
- All new push events respect Phase 10 notification preferences (`preferences.[category].push`)

**Admin announcement system**
- New admin panel section for system announcements
- Announcement form fields: title, message body, audience selector (all users / filter by role)
- Channel toggles: in-app notification, push notification, email — admin selects which channels
- Schedule-for-later: optional date/time picker to schedule future announcements
- Scheduled announcements implemented via Firebase Cloud Functions scheduled trigger (checks for pending announcements)
- Announcement history visible in admin panel

**LinkedIn news sharing**
- LinkedIn share button on news detail page only (not on homepage cards)
- Two buttons: LinkedIn icon (opens LinkedIn share dialog) + copy icon (copies formatted text to clipboard)
- LinkedIn only — no X/Twitter or other platforms
- Share content: news title + first ~200 characters (2 sentences) of article content + direct URL to article on CTG
- Uses LinkedIn's share URL scheme (`https://www.linkedin.com/sharing/share-offsite/`) — no API key needed

### Claude's Discretion
- Notification center page styling details (spacing, card design)
- Email template exact HTML/CSS implementation
- FCM debugging approach and root cause fix
- Announcement scheduling implementation details (Cloud Function polling interval)
- LinkedIn share dialog URL parameter formatting
- Copy-to-clipboard toast feedback text

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Firebase Cloud Messaging (web SDK) | Already in project (`firebase/messaging`) | Push token management, foreground message handler | Already configured in `usePushNotifications.js` and `NotificationListener.jsx` |
| Firebase Admin SDK (`firebase-admin/messaging`) | Already in `functions/index.js` | Server-side `messaging.send()` for push delivery | Established pattern — used in `sendDealNotifications` |
| Resend SDK (`resend`) | Already in `functions/index.js` | Transactional email delivery | Already lazy-initialized, domain verified |
| `react-hot-toast` | Already in project | Toast feedback (copy-to-clipboard, bulk actions) | Established pattern across the app |
| Lucide React | Already in project | Icons (Bell, Linkedin, Copy, Check, Trash2, etc.) | Used across all UI components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `navigator.clipboard.writeText` | Browser built-in | Copy-to-clipboard for LinkedIn share | Web Clipboard API, supported in all modern browsers; no npm dependency |
| `IntersectionObserver` (via `useScrollLoadMore`) | Browser built-in | Infinite scroll sentinel | Already used in `NewsSection.jsx` and product grid via `useResponsiveLimit` |
| `next/dynamic` with `ssr: false` | Already in project | Lazy-load heavy admin tab components | Established pattern in `admin/page.jsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `navigator.clipboard.writeText` | `document.execCommand('copy')` | execCommand is deprecated; clipboard API is the standard |
| Firestore scheduled CF for announcements | External cron (Cloud Scheduler separate job) | CF scheduled trigger is already used (e.g., `updateFairStatuses`, `checkExpiredOffers`) — no new infrastructure |
| Real-time subscription for notification center | One-shot fetch with manual refresh | Real-time is already the pattern; one-shot would regress UX |

**Installation:** No new packages required. All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure
```
src/app/(main)/notifications/
└── page.jsx                     # New: /notifications route (server component shell)
src/presentation/components/features/notifications/
├── NotificationCenterPage/
│   ├── NotificationCenterPage.jsx   # Orchestrator
│   ├── NotificationFilterTabs.jsx   # All|Deals|Messages|Legal|Providers|System
│   ├── NotificationCenterItem.jsx   # Single notification row with checkbox
│   └── NotificationBulkActions.jsx  # Mark all read / Delete all / batch selection bar
src/presentation/components/common/NotificationBell/
└── NotificationBell.jsx             # Extend: 5→10 items, add "View all" link
src/presentation/components/features/admin/AnnouncementManager/
├── AnnouncementManager.jsx          # Orchestrator for admin announcements tab
├── AnnouncementForm.jsx             # title, body, audience, channels, schedule
└── AnnouncementHistory.jsx          # Read-only list of past announcements
functions/index.js                   # Add: sendAnnouncement CF, processScheduledAnnouncements CF, onRFQCreated trigger, message email throttle, sender address update, buildBrandedEmailHtml
firestore.rules                      # Add: 'deal', 'announcement', 'rfq_created' to notification type allowlist; add announcements collection rules
```

### Pattern 1: Notification Center Infinite Scroll
**What:** The `/notifications` page loads the first N notifications via the existing real-time subscription from MessagesContext, then fetches older pages on scroll using `NotificationRepository.getByUserId` with `startAfter` cursor.

**When to use:** When the notification list exceeds the real-time subscription window (currently hard-capped at limit=50 in `subscribeToUserNotifications`).

**Key insight:** The existing `subscribeToUserNotifications` in `MessagesContext` must be increased from `limit: 50` to a higher number (e.g., `limit: 100`) to reduce the frequency of pagination fetches. The notification center page can then use `getByUserId` with cursor-based pagination for loading history beyond the subscription window.

**Example:**
```javascript
// NotificationRepository — new method for cursor pagination
async getByUserIdAfter(userId, afterDoc, limitCount = 30) {
  return await this.firestoreDataSource.querySubcollection(
    COLLECTIONS.USERS,
    userId,
    SUBCOLLECTIONS.NOTIFICATIONS,
    {
      orderBy: [['createdAt', 'desc']],
      limit: limitCount,
      startAfter: afterDoc,  // FirestoreDataSource already supports startAfter
    }
  );
}
```

The `FirestoreDataSource.querySubcollection` already accepts `startAfter` (line 164 of FirestoreDataSource.js) — just needs to be exposed via `NotificationRepository`.

**Infinite scroll trigger pattern (established in Phase 7):**
```javascript
// useScrollLoadMore already exists and is used by NewsSection, FeaturedProducts
useScrollLoadMore(scrollRef, loadMore, hasMore, 200);
```

### Pattern 2: Filter Tabs by Notification Type
**What:** Map the notification `type` field to the 5 preference categories.

**Type mapping (from existing notification types in codebase):**
```javascript
const TYPE_TO_TAB = {
  deal: 'deals',
  legal: 'legal',
  // message types:
  message: 'messages',
  new_message: 'messages',
  conversation_created: 'messages',
  // provider/quote types:
  quote: 'providers',
  quote_received: 'providers',
  quote_accepted: 'providers',
  quote_rejected: 'providers',
  // system types:
  system: 'system',
  admin: 'system',
  new_user_approval: 'system',
  announcement: 'system',
  rfq_created: 'system',  // new
};
```

### Pattern 3: Batch Selection for Bulk Actions
**What:** Checkbox per notification item; a selection set (Set of IDs) held in component state; "Delete selected" and "Mark selected as read" act on the set using `Promise.all`.

**Pattern:**
```javascript
const [selected, setSelected] = useState(new Set());

const toggleSelect = (id) =>
  setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

const deleteSelected = async () => {
  await Promise.all([...selected].map(id =>
    notificationRepository.delete(user.uid, id)
  ));
  setSelected(new Set());
};
```

### Pattern 4: Shared Branded Email Template
**What:** Extract `buildDealEmailHtml` and `buildLegalEmailHtml` into a single `buildBrandedEmailHtml(body, ctaLabel, ctaUrl, footerNote)` helper and update all call sites.

**Current state:** Both functions (`buildDealEmailHtml` at line 1767 and `buildLegalEmailHtml` at line 3879) share identical HTML structure but are duplicated. Phase 12 refactors them.

**Sender address change:** Update `from: 'CoreTradeGlobal <info@coretradeglobal.com>'` to `from: 'CoreTradeGlobal <noreply@coretradeglobal.com>'` in both `sendDealEmail` (line 1683) and the `inviteUser` CF (line 131). A single change in `sendDealEmail` covers deal/legal/announcement emails. The `inviteUser` CF sends via Resend directly and needs a separate update.

**Unsubscribe footer link:** The Phase 9 unsubscribe system uses signed HMAC tokens. The branded template footer should link to `/unsubscribe?email={email}&sig={sig}` — the token can be pre-generated in the CF using Node's built-in `crypto.createHmac`.

### Pattern 5: Message Email Throttling
**What:** Before sending "new messages" email, check `userData.lastMessageEmailSentAt`. If the timestamp is within the last 24 hours (86,400,000ms), skip. On send, update the field.

**Where it lives:** In `sendMessageNotification` Cloud Function (line 935) — which currently only sends FCM push, not email. Email sending logic is added here.

**Firestore write:**
```javascript
// Inside sendMessageNotification, after deciding to send email:
const lastSent = userData.lastMessageEmailSentAt?.toMillis?.() || 0;
const oneDayMs = 86400000;
if (Date.now() - lastSent < oneDayMs) {
  console.log(`throttle: skipping message email for ${recipientId} — sent within 24h`);
  return;
}
await db.collection('users').doc(recipientId).update({
  lastMessageEmailSentAt: Timestamp.now(),
});
await sendDealEmail(userData.email, 'You have new messages on CoreTradeGlobal', html);
```

**Email preferences:** Check `userData.preferences?.messages?.email !== false` before sending (follows the established pattern in `sendDealNotifications`).

### Pattern 6: New Push Event Triggers

**New member registered → admin push:**
Add to `inviteUser` or add a new `onDocumentCreated('users/{uid}', ...)` trigger. Since member accounts are created via the invite flow (existing `inviteUser` CF), the simplest approach is to add admin notification logic at the end of `inviteUser` after account creation succeeds. Look up admin UIDs by `role === 'admin'` query.

**New RFQ created → all members push:**
Add `onDocumentCreated('requests/{requestId}', async (event) => { ... })` trigger. Fetch all users with `role === 'member'`, send in-app + push to each. Respect `preferences.providers.push` (RFQ is a platform event affecting all members).

**Quote request broadcast → providers push:**
Currently `broadcastQuoteRequests` (line 2584) creates `quoteRequests` docs but does not push to providers. Add push within that function after writing each request doc, or add an `onDocumentCreated('quoteRequests/{requestId}', ...)` trigger. The trigger approach is cleaner as it avoids bloating `broadcastQuoteRequests`.

**System announcements → targeted users:**
New `sendAnnouncement` onCall CF handles immediate sends. `processScheduledAnnouncements` onSchedule CF (running every 5 minutes, consistent with `updateFairStatuses` pattern) processes `announcements` docs with `scheduledFor <= now` and `status === 'pending'`.

### Pattern 7: Admin Announcement System

**Firestore collection: `announcements`**
```
announcements/{announcementId}
  title: string
  body: string
  audience: 'all' | 'member' | 'logistics_provider' | 'insurance_provider' | 'lawyer'
  channels: { inApp: boolean, push: boolean, email: boolean }
  scheduledFor: Timestamp | null   // null = send immediately
  status: 'pending' | 'sent' | 'failed'
  createdBy: string (admin uid)
  createdAt: Timestamp
  sentAt: Timestamp | null
  recipientCount: number | null
```

**Firestore rules for announcements:** Admin-only write; admin-only read (or restrict to CF service account with no client-side reads).

**Admin tab:** Add `'announcements'` to the existing tab array in `admin/page.jsx` (currently `['users', 'messages', 'categories', 'fairs', 'news']`). Load `AnnouncementManager` via `next/dynamic` following the existing pattern.

### Pattern 8: LinkedIn Share
**What:** Two buttons added to the news detail page. LinkedIn button opens the share dialog in a new tab. Copy button writes formatted text to clipboard and shows a react-hot-toast.

**LinkedIn share URL:**
```javascript
const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
window.open(linkedInShareUrl, '_blank', 'noopener,noreferrer');
```

**Copy text format:**
```javascript
const copyText = `${article.title}\n\n${article.content?.slice(0, 200)}...\n\n${articleUrl}`;
navigator.clipboard.writeText(copyText).then(() => {
  toast.success('Copied to clipboard');
});
```

**Placement:** Add to `NewsDetailClient.jsx` — the existing news detail client component. Use Lucide `Linkedin` and `Copy` icons.

### Anti-Patterns to Avoid
- **Rebuilding FCM from scratch:** The context decision is "debug and fix existing setup." Inspect the token lifecycle (is `VAPID_KEY` set in `.env.local`? does the service worker URL match the registered path?), not rebuild.
- **Adding email to high-frequency events without throttling:** Message notifications currently send FCM only — adding email without the `lastMessageEmailSentAt` throttle would spam users.
- **Putting announcement email sends inside the Firestore transaction:** Follow the established pattern — side effects outside transactions.
- **Real-time subscription for the notification center full list:** The `/notifications` page subscription should be the same global one from MessagesContext (to avoid duplicate listeners), plus cursor-based fetch for history pages.
- **Duplicate notification listener:** `NotificationListener.jsx` is already mounted globally — don't add a second `onMessage` handler in the notification center page.
- **Adding `startAfter` to `subscribeToSubcollection`:** The real-time subscription does not support cursor pagination (Firestore limitation). Pagination uses `getByUserId` (one-time fetch), not a subscription.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Infinite scroll | Custom scroll listener | `useScrollLoadMore` (Phase 7 hook) | Already handles throttling, cleanup, `useCallback` wrapping |
| Email delivery | SMTP server | Resend SDK (already configured) | Domain verified, lazy-init pattern established |
| Push delivery | Direct FCM HTTP API | `firebase-admin/messaging` `messaging.send()` | Already used in `sendDealNotifications`; handles token cleanup on invalid tokens |
| LinkedIn share | OAuth + LinkedIn API | LinkedIn share-offsite URL scheme | No API key, no OAuth, works reliably for sharing article URLs |
| Clipboard copy | `document.execCommand` | `navigator.clipboard.writeText` | `execCommand` is deprecated; Clipboard API is standard |
| Scheduled jobs | External cron | Firebase `onSchedule` CF | Already established pattern (`updateFairStatuses`, `checkExpiredOffers`, `sendExpiryReminders`) |
| Notification type routing | Custom switch chains | Extend existing `handleNotificationClick` in `NotificationBell.jsx` | Already handles deal, legal, quote, message types |

## Common Pitfalls

### Pitfall 1: FCM VAPID Key Not Set in Dev
**What goes wrong:** `getToken()` silently returns `null` or throws `messaging/failed-service-worker-registration`. Push notifications never arrive.
**Why it happens:** `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is missing from `.env.local`. The service worker can initialize Firebase but `getToken` needs the VAPID key to register with FCM.
**How to avoid:** Verify `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is set in `.env.local` before debugging other FCM issues. The Firebase console path: Project Settings > Cloud Messaging > Web configuration > Key pair.
**Warning signs:** `usePushNotifications` returns `isSupported: true, permission: 'granted', fcmToken: null`.

### Pitfall 2: Notification Type Not in Firestore Rules Allowlist
**What goes wrong:** Cloud Function successfully creates in-app notification, but Firestore rejects it with `PERMISSION_DENIED`.
**Why it happens:** `firestore.rules` has an explicit allowlist for notification `type` values. New types `announcement`, `rfq_created`, and `deal` (already used in CFs but may not be in rules) must be added.
**Current allowlist (line 87 of firestore.rules):** `['message', 'quote', 'system', 'admin', 'new_message', 'conversation_created', 'quote_received', 'quote_accepted', 'quote_rejected', 'new_user_approval']`
**Missing types to add:** `'deal'`, `'legal'`, `'announcement'`, `'rfq_created'`
**Note:** `'deal'` and `'legal'` are written by Cloud Functions (which bypass client rules), but adding them keeps the allowlist accurate for any future client-side writes.

### Pitfall 3: Message Email Throttle Race Condition
**What goes wrong:** High-frequency conversation activity triggers multiple `sendMessageNotification` CF invocations simultaneously, all read `lastMessageEmailSentAt` before any writes it — all decide to send email.
**Why it happens:** CF invocations are concurrent; read-check-write is not atomic.
**How to avoid:** Use `db.collection('users').doc(uid).update` with a conditional update pattern, or accept low-probability duplicates given Firestore's eventual consistency. For a max-1/day throttle, a rare double-send is acceptable — the cost of a Firestore transaction is not worth it here. Document this in code comments.

### Pitfall 4: Subscription Limit Mismatch Between Bell and Center Page
**What goes wrong:** The NotificationBell shows 10 items from MessagesContext (capped at current `limit: 50` subscription), but the notification center page appears to load fine because it uses the same subscription — then the "load more" pagination fetches items that are already in state, causing duplicates.
**How to avoid:** The notification center page should display from the MessagesContext subscription (real-time window) as page 1, and use `getByUserIdAfter` starting from the last item in that list for subsequent pages. Track the last cursor doc from the subscription, not a separate fetch.

### Pitfall 5: Scheduled Announcement CF Polling Interval
**What goes wrong:** Using `schedule('every 1 minutes')` accumulates cloud function invocations unnecessarily and incurs cost.
**How to avoid:** Use `schedule('every 5 minutes')` — consistent with other scheduled CFs in the project. Scheduled-for-later announcements are not time-critical to the minute.

### Pitfall 6: `subscribeToSubcollection` Does Not Support `startAfter`
**What goes wrong:** Attempting to pass `startAfter` to `subscribeToUserNotifications` for infinite scroll with a real-time subscription. `FirestoreDataSource.subscribeToSubcollection` does NOT include `startAfter` support (verified — only `where`, `orderBy`, `limit`).
**How to avoid:** Infinite scroll uses `getByUserId` (one-time query via `querySubcollection`, which DOES support `startAfter`) — not a real-time subscription. The notification center shows real-time data for the top window and static pages for history.

### Pitfall 7: Sender Domain Must Be Verified in Resend
**What goes wrong:** Changing from `info@coretradeglobal.com` to `noreply@coretradeglobal.com` fails with Resend `domain_not_verified` error.
**Why it happens:** Resend verifies domains, not individual addresses. `coretradeglobal.com` is already verified — adding a new `From` address at the same domain works without additional DNS changes.
**How to avoid:** The domain is already verified (Phase 2 note confirms custom domain). The address change is safe. No DNS action needed.

## Code Examples

Verified patterns from existing source:

### Existing `sendDealNotifications` — 3-channel orchestrator to follow
```javascript
// Source: functions/index.js lines 1805-1895
// Pattern: in-app notification → FCM push (with preference check) → Resend email
// All non-blocking, all called OUTSIDE transactions
async function sendDealNotifications(dealId, eventType, senderUid, deal) {
  // a) Firestore in-app notification
  await db.collection('users').doc(recipientId).collection('notifications').add({ ... });
  // b) FCM push (check preferences?.deals?.push !== false)
  await messaging.send({ token: fcmToken, data: { type: 'deal_event', ... } });
  // c) Resend email (check preferences?.deals?.email !== false)
  await sendDealEmail(userData.email, subject, htmlBody);
}
```

### Invalid FCM token cleanup (already established)
```javascript
// Source: functions/index.js lines 1866-1876
if (
  fcmErr.code === 'messaging/invalid-registration-token' ||
  fcmErr.code === 'messaging/registration-token-not-registered'
) {
  await db.collection('users').doc(recipientId).update({
    fcmToken: FieldValue.delete(),
  });
}
```

### Notification preference check pattern
```javascript
// Source: functions/index.js lines 1842-1844
const pushEnabled = userData.preferences?.deals?.push !== false;
const emailEnabled = userData.preferences?.deals?.email !== false;
// Default is true — only false if explicitly set to false
```

### Admin tab lazy-load pattern
```javascript
// Source: src/app/admin/page.jsx lines 38-62
const AnnouncementManager = dynamic(
  () => import('@/presentation/components/features/admin/AnnouncementManager/AnnouncementManager')
    .then(m => ({ default: m.AnnouncementManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
// Add 'announcements' to the tab array on line 224
```

### Firestore type allowlist update (firestore.rules)
```
// Current (lines 87-90):
request.resource.data.type in ['message', 'quote', 'system', 'admin',
  'new_message', 'conversation_created', 'quote_received',
  'quote_accepted', 'quote_rejected', 'new_user_approval']
// Updated:
request.resource.data.type in ['message', 'quote', 'system', 'admin',
  'new_message', 'conversation_created', 'quote_received',
  'quote_accepted', 'quote_rejected', 'new_user_approval',
  'deal', 'legal', 'announcement', 'rfq_created']
```

### LinkedIn share button
```javascript
// No API key required. Source: LinkedIn share URL scheme (stable, widely used)
const handleLinkedInShare = () => {
  const articleUrl = `${window.location.origin}/news/${newsId}`;
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
```

### Scheduled announcement CF pattern
```javascript
// Follows: exports.updateFairStatuses (line 3461) and exports.checkExpiredOffers (line 3528)
exports.processScheduledAnnouncements = onSchedule('every 5 minutes', async () => {
  const now = Timestamp.now();
  const pending = await db.collection('announcements')
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', now)
    .get();
  // Process each, update status to 'sent' or 'failed'
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `info@coretradeglobal.com` sender | `noreply@coretradeglobal.com` sender | Phase 12 | Standard for automated email; reduces reply-to confusion |
| Hardcoded `limit: 50` in notification subscription | Subscription limit increased + cursor pagination for history | Phase 12 | Supports notification center page with full history |
| Duplicate `buildDealEmailHtml`/`buildLegalEmailHtml` | Single `buildBrandedEmailHtml` helper | Phase 12 | DRY, consistent branding across all email types |
| Bell shows 5 items | Bell shows 10 items + "View all" link | Phase 12 | Better discoverability of notification history |

**Deprecated/outdated:**
- `buildDealEmailHtml`: Replaced by `buildBrandedEmailHtml` (refactored, call sites updated)
- `buildLegalEmailHtml`: Same — both become wrappers or are removed

## Open Questions

1. **FCM root cause**
   - What we know: `usePushNotifications.js` and `NotificationListener.jsx` exist and the logic looks correct; `firebase-messaging-sw.js` is properly structured
   - What's unclear: Why push notifications are "broken" — is it VAPID key missing in `.env.local`? Is `NEXT_PUBLIC_FIREBASE_VAPID_KEY` set in production? Is the service worker registration hitting a scope conflict?
   - Recommendation: The FCM fix plan should start with a diagnostic checklist task: check env vars, check `Notification.permission`, check whether `getToken()` returns a token, check whether the service worker is active. Fix root cause discovered during that task.

2. **New member notification: trigger point**
   - What we know: Members are created via Firebase Auth (email link from `inviteUser` CF)
   - What's unclear: Should the trigger be at invite creation time, or when the user completes onboarding? The CONTEXT says "New member registered" — this likely means when a user completes the signup flow, which happens client-side in onboarding.
   - Recommendation: Use an `onDocumentUpdated('users/{uid}', ...)` trigger checking for transition to `isVerified === true` (or `adminApproved === true`), since the CF can reliably detect the moment a member is fully registered.

3. **`inviteUser` email sender address**
   - What we know: `inviteUser` CF sends the sign-in link email via Resend at line 131 with `from: 'CoreTradeGlobal <info@coretradeglobal.com>'`
   - What's unclear: Whether this invite email should also use `noreply@` (CONTEXT says "all automated emails")
   - Recommendation: Yes — change all automated email senders including `inviteUser` to `noreply@coretradeglobal.com`.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `functions/index.js` — Cloud Function patterns, email helpers, FCM send, preference checks
- Direct codebase inspection: `NotificationRepository.js` — CRUD, subscription, pagination support
- Direct codebase inspection: `NotificationBell.jsx` — Current UI, type routing, 5-item limit
- Direct codebase inspection: `NotificationListener.jsx` — Foreground FCM handler, token save pattern
- Direct codebase inspection: `firebase-messaging-sw.js` — Background push handler, click routing
- Direct codebase inspection: `usePushNotifications.js` — Permission flow, VAPID key usage
- Direct codebase inspection: `FirestoreDataSource.js` — `startAfter` support confirmed in `querySubcollection`, absent in `subscribeToSubcollection`
- Direct codebase inspection: `MessagesContext.jsx` — Notification subscription with `limit: 50`
- Direct codebase inspection: `admin/page.jsx` — Tab structure, lazy-load pattern
- Direct codebase inspection: `firestore.rules` — Notification type allowlist (lines 77-92)
- Direct codebase inspection: `src/middleware.js` — `/notifications` not yet in `protectedRoutes`

### Secondary (MEDIUM confidence)
- LinkedIn share URL scheme: `https://www.linkedin.com/sharing/share-offsite/?url=` — widely documented, no API key required, stable pattern
- Resend domain-level verification: Domain `coretradeglobal.com` is already verified per Phase 2 notes; new `From` address at same domain does not require additional DNS

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — all patterns established in prior phases, directly verified in source
- Pitfalls: HIGH — directly traced from code (rules allowlist, subscription limits, FCM token flow)

**Research date:** 2026-04-22
**Valid until:** 2026-07-22 (stable stack, 90 days)
