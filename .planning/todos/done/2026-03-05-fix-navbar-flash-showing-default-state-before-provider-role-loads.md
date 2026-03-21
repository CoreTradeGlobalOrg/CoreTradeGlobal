---
created: 2026-03-05T22:06:25.536Z
title: Fix navbar flash showing default state before provider role loads
area: ui
files:
  - src/presentation/components/homepage/Navbar/Navbar.jsx
  - src/app/(main)/layout.jsx
---

## Problem

When a provider user logs in, the navbar initially renders with the default (buyer) state for a noticeable period before switching to the provider dashboard view. This causes a flash of incorrect UI — bad UX that makes the app feel sluggish and unpolished. The issue is that the user's role/type is loaded asynchronously (likely from Firestore user profile) and the navbar renders before this data is available.

## Solution

Investigate the auth/role loading flow:
1. Check how user role is fetched in the auth context and when it becomes available
2. In `Navbar.jsx`, either show a skeleton/loading state while role is unknown, or defer rendering the role-specific nav items until the role is resolved
3. Consider caching the user role in localStorage on login so it's available immediately on subsequent page loads (optimistic role rendering)
4. Alternatively, prevent the navbar from rendering role-specific content until the auth state is fully resolved (not just authenticated, but profile loaded)
