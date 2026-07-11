/**
 * Feature Flags
 *
 * Simple compile-time on/off switches for features we ship dark. When a
 * feature is being paused (not deprecated), toggle its flag here rather
 * than deleting the code — flipping back to true re-enables it in one
 * commit.
 *
 * These are read on the client, so they are not secrets. For anything
 * that should be per-user or per-environment, use a proper feature
 * gating service.
 */

// Legal Support (Find a Lawyer, in-deal LegalBanner, LegalConsulting
// section in TradeSummary). Turned off temporarily; the /lawyer/*
// staff dashboards for the lawyer role are unaffected and still work.
export const LEGAL_SUPPORT_ENABLED = false;
