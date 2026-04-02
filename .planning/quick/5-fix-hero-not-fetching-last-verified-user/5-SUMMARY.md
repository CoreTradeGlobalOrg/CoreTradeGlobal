---
phase: quick-5
plan: "01"
subsystem: homepage
tags: [hero, firestore, query, index]
dependency_graph:
  requires: []
  provides: [correct-hero-supplier-card]
  affects: [HeroSection, firestore.indexes.json]
tech_stack:
  added: []
  patterns: [server-side Firestore filtering, composite index]
key_files:
  created: []
  modified:
    - src/presentation/components/homepage/Hero/HeroSection.jsx
    - firestore.indexes.json
decisions:
  - "approvedAt field used as ordering key — matches admin approval workflow and avoids client-side sort over arbitrary 20-doc window"
  - "limit:5 buffer (not limit:1) to allow client-side companyName + isSuspended filter without second query"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-02"
  tasks_completed: 1
  files_modified: 2
---

# Quick Task 5: Fix Hero Not Fetching Last Verified User Summary

**One-liner:** Server-side Firestore query with emailVerified+adminApproved filters and approvedAt desc ordering replaces arbitrary 20-doc client-side sort.

## What Was Done

The hero section's "Latest Supplier" card previously fetched 20 arbitrary users, filtered client-side for `companyName`, and sorted by `createdAt`. This meant:
- Users verified/approved outside the first 20 Firestore docs would never appear
- Unverified and unapproved users could be shown
- Suspended users were not excluded

## Changes

### src/presentation/components/homepage/Hero/HeroSection.jsx (lines 157-170)

Replaced the old query block with a filtered, ordered query:

```javascript
const users = await firestoreDS.query('users', {
  where: [
    ['emailVerified', '==', true],
    ['adminApproved', '==', true],
  ],
  orderBy: [['approvedAt', 'desc']],
  limit: 5,
});
if (users?.length > 0) {
  const withCompany = users.filter(u => u.companyName && !u.isSuspended);
  if (withCompany.length > 0) setLatestSupplier(withCompany[0]);
}
```

### firestore.indexes.json

Added composite index for the new query:
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "emailVerified", "order": "ASCENDING" },
    { "fieldPath": "adminApproved", "order": "ASCENDING" },
    { "fieldPath": "approvedAt", "order": "DESCENDING" }
  ]
}
```

**Note:** Deploy with `firebase deploy --only firestore:indexes` (without `--force`) to preserve manually-created product indexes not tracked in this file.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e91c531 | fix(quick-5): fix hero supplier card to show last verified+approved user |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/presentation/components/homepage/Hero/HeroSection.jsx` — modified, verified grep matches
- `firestore.indexes.json` — modified, verified grep matches
- Commit e91c531 — exists
- `npx next build` — succeeded
