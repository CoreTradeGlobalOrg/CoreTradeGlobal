---
created: 2026-03-05T22:07:42.240Z
title: Fix insurance quote policy end date picker overflow clipping
area: ui
files:
  - src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx
  - src/presentation/components/common/DatePicker/
---

## Problem

In the insurance provider quote form, the "Policy End Date" date picker calendar dropdown is clipped/cut off on the right side. The Saturday column and the forward navigation arrow are partially hidden, making it difficult to navigate months or select Saturday dates. This is caused by the calendar popover overflowing its parent container which has `overflow: hidden` or the popover not being positioned correctly relative to the viewport edge.

## Solution

Investigate the DatePicker component used in QuoteFormInsurance:
1. Check if the calendar popover is rendered inside a container with `overflow: hidden` or `overflow: auto` — if so, use a portal (e.g., React Portal) to render the popover at the document body level
2. Alternatively, adjust the popover alignment to open left-aligned instead of right-aligned when near the right edge
3. Check if the form container or modal has constrained width causing the clip
4. If using a custom DatePicker component, ensure the dropdown has proper z-index and is not constrained by parent overflow
