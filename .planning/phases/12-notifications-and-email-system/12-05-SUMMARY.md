---
phase: 12-notifications-and-email-system
plan: "05"
subsystem: admin-announcements
tags: [admin, announcements, cloud-functions, firestore, push, email, scheduling]
dependency_graph:
  requires: [12-02]
  provides: [admin-announcement-system]
  affects: [functions/index.js, firestore.rules, src/app/admin/page.jsx]
tech_stack:
  added: []
  patterns: [onCall-admin-only, onSchedule-every-5-minutes, deliverAnnouncement-helper, httpsCallable-from-client]
key_files:
  created:
    - src/presentation/components/features/admin/AnnouncementManager/AnnouncementManager.jsx
    - src/presentation/components/features/admin/AnnouncementManager/AnnouncementForm.jsx
    - src/presentation/components/features/admin/AnnouncementManager/AnnouncementHistory.jsx
  modified:
    - functions/index.js
    - firestore.rules
    - src/app/admin/page.jsx
decisions:
  - deliverAnnouncement extracted as shared helper to avoid code duplication between sendAnnouncement (immediate) and processScheduledAnnouncements (scheduled)
  - Admin users excluded from targeted announcements in deliverAnnouncement loop (admins manage the system; targeted user audiences are non-admin roles)
  - functions config exports pre-initialized functions instance; AnnouncementForm uses it directly (no getFunctions(app) call needed)
  - announcement doc written first before delivery for immediate sends so doc always exists on failure (status set to failed on error)
metrics:
  duration: "4 minutes"
  completed: "2026-04-22"
  tasks_completed: 2
  files_changed: 6
---

# Phase 12 Plan 05: Admin Announcement System Summary

**One-liner:** Admin announcement system with immediate/scheduled send via in-app, push, and email channels, backed by `sendAnnouncement` onCall CF and `processScheduledAnnouncements` scheduled CF running every 5 minutes.

## What Was Built

### Task 1: Cloud Functions + Firestore Rules

**`functions/index.js`** — three new exports:

- `deliverAnnouncement(announcementData, announcementId)` — shared helper that queries targeted users by audience, then for each user: creates in-app notification doc, sends FCM push (if preference allows), and sends branded email (if preference allows). All sends are non-blocking with per-user try/catch. Invalid FCM tokens are cleaned up automatically via the existing `sendFCMPushToUser` helper.

- `exports.sendAnnouncement` (onCall) — admin-only callable. Validates caller is admin, validates fields (title, body, audience, channels). If `scheduledFor` is in the future: writes pending announcement doc and returns `{ status: 'scheduled' }`. Otherwise: writes doc, calls `deliverAnnouncement`, updates doc with `status: 'sent'`, `sentAt`, `recipientCount`.

- `exports.processScheduledAnnouncements` (onSchedule, every 5 minutes) — queries `announcements` where `status == 'pending'` and `scheduledFor <= now`, calls `deliverAnnouncement` for each, updates docs with sent status and recipient count.

**`firestore.rules`** — `announcements/{announcementId}` collection:
- Read: admin only
- Create/Update: admin only
- Delete: denied (announcements are historical records)

### Task 2: Admin UI

**`AnnouncementForm.jsx`** — form with:
- Title text input (required, max 120 chars)
- Body textarea (required, max 1000 chars with live counter)
- Audience selector dropdown (all/member/logistics_provider/insurance_provider/lawyer)
- Channel checkboxes: In-app (Bell icon), Push (Smartphone icon), Email (Mail icon) — styled gold when active
- "Send later" checkbox toggle revealing `datetime-local` input for scheduling
- Submit button: "Send Announcement" or "Schedule Announcement" with loading state
- On success: toast with recipient count (or "scheduled"), form reset, `onSent()` callback

**`AnnouncementHistory.jsx`** — card list per announcement:
- Title, truncated body, audience label badge
- Channel icons (gold Bell/blue Smartphone/green Mail) for selected channels
- Status badge: sent (green), pending (gold), failed (red)
- Recipient count and sent/scheduled timestamp
- Loading skeleton (3 pulsing cards) and empty state with Bell icon

**`AnnouncementManager.jsx`** — orchestrator:
- Subscribes to `announcements` collection ordered by `createdAt desc` via `onSnapshot`
- Passes `onSent` callback to form that scrolls to history section
- Section header with Megaphone icon and description

**`src/app/admin/page.jsx`** — integration:
- `announcements` added as 6th tab in tab array
- `AnnouncementManager` loaded via `next/dynamic` with `ssr: false` and `AdminTabSkeleton` fallback
- Conditional render block for `activeTab === 'announcements'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong firebase import in AnnouncementForm**
- **Found during:** Task 2 build verification
- **Issue:** `import { app } from '@/core/config/firebase.config'` — `app` is not a named export (it's the default export); firebase.config.js already exports a pre-initialized `functions` instance
- **Fix:** Changed to `import { functions } from '@/core/config/firebase.config'` and removed the redundant `getFunctions(app)` call
- **Files modified:** AnnouncementForm.jsx
- **Commit:** 561f286

## Self-Check: PASSED

Files exist:
- [x] src/presentation/components/features/admin/AnnouncementManager/AnnouncementManager.jsx
- [x] src/presentation/components/features/admin/AnnouncementManager/AnnouncementForm.jsx
- [x] src/presentation/components/features/admin/AnnouncementManager/AnnouncementHistory.jsx

Commits:
- [x] a77f182 — feat(12-05): add sendAnnouncement and processScheduledAnnouncements Cloud Functions
- [x] 561f286 — feat(12-05): add AnnouncementManager admin UI and integrate into admin page

Build: npx next build — PASSED (no errors)
