---
created: 2026-03-05T22:03:33.605Z
title: Fix deal deadline date picker icon alignment
area: ui
files:
  - src/presentation/components/features/deal/DealForm/DealForm.jsx
---

## Problem

When creating a deal, the calendar icon on the "Delivery Deadline" date picker input is shifted/misaligned to the left. The icon should be flush-right inside the input field but appears offset. This is a CSS/styling issue with the native date input or a custom DatePicker component used in the DealForm.

## Solution

Inspect the date input styling in DealForm.jsx (or the DatePicker component if one is used). Likely fix involves adjusting the input's `appearance`, padding-right, or the icon positioning via `::-webkit-calendar-picker-indicator` pseudo-element styling.
