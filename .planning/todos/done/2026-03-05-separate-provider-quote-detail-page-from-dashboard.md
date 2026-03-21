---
created: 2026-03-05T22:14:54.196Z
title: Separate provider quote detail page from dashboard
area: ui
files:
  - src/app/(main)/provider/dashboard/page.jsx
---

## Problem

On the provider dashboard, clicking a quote shows the quote detail on the same page (`/provider/dashboard`) instead of navigating to a separate route. When the user presses the browser back button, it doesn't return to the dashboard — the navigation history doesn't work as expected because the URL never changed. This breaks standard browser navigation UX.

## Solution

Create a dedicated quote detail route for providers (e.g., `/provider/quotes/[quoteId]`) so that:
1. Clicking a quote on the dashboard navigates to the new route
2. Browser back button returns to `/provider/dashboard` correctly
3. Quote detail page can be shared/bookmarked independently
