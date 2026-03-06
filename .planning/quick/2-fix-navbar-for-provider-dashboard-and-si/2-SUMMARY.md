---
phase: quick
plan: 2
subsystem: navbar
tags: [navbar, roles, admin, provider, auth]
tech-stack:
  added: []
  patterns: [role-based nav filtering, includes() over admin bypass]
key-files:
  created: []
  modified:
    - src/presentation/components/homepage/Navbar/Navbar.jsx
decisions:
  - "Removed blanket admin override from visibleLinks filter — admin now sees only links with explicit ROLES.ADMIN in roles array, superseding Phase 01 decision"
metrics:
  duration: 5 min
  completed: 2026-03-06
---

# Quick Task 2: Fix Navbar for Provider Dashboard and Admin Summary

**One-liner:** Removed blanket `user.role === ROLES.ADMIN` bypass from navbar visibleLinks filter so admins see member-equivalent links and providers see Provider Dashboard via explicit roles array.

## What Was Done

Fixed the `visibleLinks` filter in `Navbar.jsx` by removing the `user.role === ROLES.ADMIN ||` bypass. The filter now uses `link.roles.includes(user.role)` exclusively, meaning each NAV_LINKS entry's `roles` array fully controls visibility for all roles including admin.

**Before:**
```jsx
const visibleLinks = NAV_LINKS.filter(
  (link) => link.roles === null || (user && (user.role === ROLES.ADMIN || link.roles.includes(user.role)))
);
```

**After:**
```jsx
const visibleLinks = NAV_LINKS.filter(
  (link) => link.roles === null || (user && link.roles.includes(user.role))
);
```

## Role Behavior After Fix

| Role | Nav Links Visible |
|------|------------------|
| Admin | Products, RFQs, My Deals, Categories, Fairs, News, FAQ, About Us (same as member) |
| Member | Products, RFQs, My Deals, Categories, Fairs, News, FAQ, About Us |
| logistics_provider / insurance_provider | Products, Provider Dashboard, Categories, Fairs, News, FAQ, About Us |
| Lawyer | Products, Client Channels, Deal Review, Categories, Fairs, News, FAQ, About Us |
| Unauthenticated | Products, Categories, Fairs, News, FAQ, About Us |

Admin Dashboard link in profile dropdown menu is unchanged — it uses `user.role === 'admin'` independently and is not affected.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix visibleLinks filter and verify roleLoading guard | 33373f5 | src/presentation/components/homepage/Navbar/Navbar.jsx |

## Verification

All automated checks passed:
- Admin override removed from visibleLinks filter
- Filter uses `includes()` only
- `roleLoading` guard present and correct
- Provider Dashboard link exists in NAV_LINKS with correct provider roles
- RFQs and My Deals include ROLES.ADMIN in their roles arrays

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

- **Superseded decision [Phase 01]:** "Admin navbar override: ROLES.ADMIN check in visibleLinks filter so admin sees all role-restricted nav links" — now removed. Admin only sees links with explicit ROLES.ADMIN in their roles array. This simplifies the admin experience to be member-equivalent in the main nav while retaining the Admin Dashboard in the profile dropdown.

## Self-Check: PASSED

- File exists: src/presentation/components/homepage/Navbar/Navbar.jsx — FOUND
- Commit 33373f5 exists — FOUND
