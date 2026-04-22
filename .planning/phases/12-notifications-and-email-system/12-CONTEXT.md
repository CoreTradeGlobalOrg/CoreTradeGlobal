# Phase 12: Notifications and Email System - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden and expand the notification/email infrastructure: build a full notification center page, extend push notifications to new event types, fix broken FCM setup, change email sender address, create branded email templates, add message email throttling, build admin announcement system, and add LinkedIn sharing to news articles. No new trade flow capabilities — this phase improves the notification/email layer that supports existing features.

</domain>

<decisions>
## Implementation Decisions

### Notification center page
- Access via "View all" link at the bottom of existing NotificationBell dropdown → navigates to /notifications
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

### Email delivery & templates
- Sender address changed from `info@coretradeglobal.com` to `noreply@coretradeglobal.com` for all automated emails
- Stay on Resend (no SMTP migration) — already configured and working
- Branded HTML email template: CTG logo header, gold accent colors matching app dark theme, content body area, unsubscribe footer link
- Template applied consistently to all system emails (deal, legal, message digest, RFQ, announcements)
- Message email throttling: max 1 "You have new messages" email per user per day across all conversations
- Throttle tracking via `lastMessageEmailSentAt` timestamp field on user doc — Cloud Function checks before sending

### Push notification coverage
- New push events added:
  - New member registered → admin gets push notification (currently in-app only)
  - New RFQ created → all members get push notification (currently no notification at all)
  - Quote request broadcast → providers get push notification (currently in-app only)
  - System announcements → all targeted users get push (new capability via admin tool)
- RFQ notifications: every new RFQ triggers individual push to all members (no throttling — low volume at 8 users)
- FCM fix approach: debug and fix existing setup (service worker, token lifecycle, permission flow) — not a rebuild
- All new push events respect Phase 10 notification preferences (`preferences.[category].push`)

### Admin announcement system
- New admin panel section for system announcements
- Announcement form fields: title, message body, audience selector (all users / filter by role)
- Channel toggles: in-app notification, push notification, email — admin selects which channels
- Schedule-for-later: optional date/time picker to schedule future announcements
- Scheduled announcements implemented via Firebase Cloud Functions scheduled trigger (checks for pending announcements)
- Announcement history visible in admin panel

### LinkedIn news sharing
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NotificationRepository.js`: Full CRUD + real-time subscriptions for notifications subcollection — needs pagination extension (currently hardcoded limit=50)
- `NotificationBell/NotificationBell.jsx`: Dropdown with type-specific icons, hover highlights, mark-all-read/delete-all — extend with "View all" link and increase to 10 items
- `usePushNotifications.js`: FCM token management, permission flow, service worker registration — debug and fix
- `NotificationListener.jsx`: Foreground FCM message handler — extend for new event types
- `firebase-messaging-sw.js`: Background push handler with smart suppression — extend for RFQ/announcement events
- `NotificationPrompt.jsx`: Permission request banner — already functional
- `useNotificationPreferences.js`: Real-time preference subscription with deep-merge defaults — used for preference checks
- `useMarkAsRead.js`: Mark individual/all/conversation notifications — extend for batch selection
- Resend email client in `functions/index.js`: Lazy-init pattern, `sendDealEmail`/`sendLegalEmail` helpers — add shared template wrapper
- `buildDealEmailHtml`/`buildLegalEmailHtml`: Existing HTML builders — refactor into shared branded template

### Established Patterns
- IntersectionObserver infinite scroll: `useScrollLoadMore` with `useCallback`-wrapped loadMore (Phase 7 — products/news pages)
- Notification preferences: `userData.preferences?.[category]?.[channel] !== false` check in Cloud Functions
- Smart FCM suppression: `viewingDealId` + 60s staleness window (Phase 2)
- Type-specific notification icons and colors in NotificationBell
- Glass-card UI: `bg-[rgba(255,255,255,0.03)]`, dark theme, gold accents
- Filter tabs: existing tab pattern used in admin panel (Users/Invites), provider dashboard
- Toast notifications via react-hot-toast for user feedback

### Integration Points
- `Navbar.jsx`: NotificationBell component — add "View all" link
- `functions/index.js`: All Cloud Functions for notifications/email — add RFQ notification trigger, announcement CFs, message email throttle, sender address change
- `MessagesContext.jsx`: Global notification subscription — increase from 50 to support center page
- Admin dashboard: Add Announcements tab/section for system announcements
- `firestore.rules`: Notification create rules type allowlist — add `announcement`, `rfq_created` types
- News detail page: Add LinkedIn share + copy buttons
- Middleware `protectedRoutes`: Add `/notifications` route

</code_context>

<specifics>
## Specific Ideas

- Bell dropdown goes from 5 → 10 items with "View all" link at bottom navigating to /notifications
- Notification center tabs match the 5 preference categories exactly (Deals, Messages, Legal, Providers, System)
- Admin announcement tool is a full form: title, body, audience (all/by role), channels (in-app/push/email), optional schedule datetime
- Message email throttle is global per user (1/day total), not per conversation
- RFQ notification goes to ALL members (not filtered by category) since volume is low
- LinkedIn share uses the share-offsite URL scheme (no API integration needed)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-notifications-and-email-system*
*Context gathered: 2026-04-22*
