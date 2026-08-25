/**
 * Site Analytics — Bölüm 6 of the plan.
 *
 * First cut is a "control tower" rather than an in-app dashboard:
 * GA4 Data API + Clarity Export API both need service-account /
 * paid-tier work that hasn't happened yet, so surfacing the live
 * numbers inside CoreTradeGlobal is deferred. What ships here is
 * everything we CAN show today:
 *
 *   - Connection status for each provider (env var + script wiring)
 *   - Deep links straight into each provider's own dashboard
 *   - Explanation of what each provider tracks and why
 *   - Confirmation that Clarity identify() is live so per-user
 *     filtering / recording lookups work
 *
 * Once GA4 credentials land, we can render trend charts here without
 * touching the section shell.
 */

'use client';

import { Ga4LiveBlock } from '@/presentation/components/features/admin/analytics/Ga4LiveBlock';
import { ClarityLiveBlock } from '@/presentation/components/features/admin/analytics/ClarityLiveBlock';
import { VercelLiveBlock } from '@/presentation/components/features/admin/analytics/VercelLiveBlock';

export function SiteAnalyticsSection() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Site Analytics</h3>
        <p className="text-xs text-[#A0A0A0] mt-1">
          Live traffic and UX signals from GA4, Microsoft Clarity, and Vercel Web Analytics.
        </p>
      </div>

      <Ga4LiveBlock />
      <ClarityLiveBlock />
      <VercelLiveBlock />
    </div>
  );
}
