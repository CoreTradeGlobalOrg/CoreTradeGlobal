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

import {
  Activity,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  Info,
  Users2,
  XCircle,
} from 'lucide-react';

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || null;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || null;

function StatusPill({ ok, label }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border',
        ok
          ? 'text-green-400 border-green-400/30 bg-green-400/5'
          : 'text-amber-400 border-amber-400/30 bg-amber-400/5',
      ].join(' ')}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function ProviderCard({
  icon: Icon,
  title,
  connected,
  statusText,
  description,
  bulletPoints,
  dashboardUrl,
  dashboardLabel = 'Open dashboard',
  footer,
}) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-[#FFD700]" />
          <h4 className="text-base font-semibold text-white">{title}</h4>
        </div>
        <StatusPill ok={connected} label={statusText} />
      </div>

      <p className="text-xs text-[#A0A0A0] mb-3">{description}</p>

      {bulletPoints?.length > 0 && (
        <ul className="text-[11px] text-[#A0A0A0] space-y-1 mb-4">
          {bulletPoints.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="text-[#606060] mt-[3px]">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-[10px] text-[#606060] truncate">{footer}</div>
        {dashboardUrl ? (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.14)] border border-[rgba(255,215,0,0.2)] text-[11px] text-[#FFD700] transition-colors whitespace-nowrap"
          >
            {dashboardLabel}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-[11px] text-[#606060]">Dashboard link unavailable</span>
        )}
      </div>
    </div>
  );
}

export function SiteAnalyticsSection() {
  const clarityConnected = !!CLARITY_PROJECT_ID;
  const gaConnected = !!GA_MEASUREMENT_ID;

  const clarityDashboardUrl = clarityConnected
    ? `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard`
    : null;

  // GA4 doesn't accept a Measurement ID in a property-scoped URL — the
  // universal analytics.google.com landing lets the admin pick their
  // property from the account switcher. Good enough until GA4 Data
  // API lands and we render inline.
  const gaDashboardUrl = 'https://analytics.google.com/';

  const vercelAnalyticsUrl = 'https://vercel.com/dashboard';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Site Analytics</h3>
        <p className="text-xs text-[#A0A0A0] mt-1">
          GA4 + Microsoft Clarity + Vercel Analytics — connection status, quick links to each dashboard,
          and what each provider tracks.
        </p>
      </div>

      {/* Info banner on the deferred inline dashboard */}
      <div className="rounded-2xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-[#A0A0A0]">
          <p className="text-white font-semibold mb-1">Why no numbers here yet?</p>
          <p>
            The GA4 Data API and Clarity Export API both require service-account
            or paid-tier work — pulling inline charts in is its own sprint. For now
            this panel acts as a <strong>control tower</strong>: it shows the
            connections are healthy and jumps you into each dashboard in one click.
            <br />
            <br />
            <span className="text-[#606060]">
              After the backend migration (own API), GA4 data will be pulled locally
              via cron and inline charts will land here.
            </span>
          </p>
        </div>
      </div>

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProviderCard
          icon={Eye}
          title="Microsoft Clarity"
          connected={clarityConnected}
          statusText={clarityConnected ? 'Connected' : 'Missing env var'}
          description={
            clarityConnected
              ? 'Session recordings, heatmaps, rage/dead clicks. Signed-in members are tagged via identify() — per-user filtering is live.'
              : 'NEXT_PUBLIC_CLARITY_PROJECT_ID environment variable is missing. Add it in Vercel dashboard → Environment Variables.'
          }
          bulletPoints={[
            'Session recording — user screen activity',
            'Heatmap — click / scroll density',
            'Rage & dead click detection',
            'Custom user tags: role, companyType, verified, country',
            'JavaScript error tracking',
          ]}
          dashboardUrl={clarityDashboardUrl}
          dashboardLabel="Open Clarity"
          footer={
            clarityConnected ? `Project: ${CLARITY_PROJECT_ID}` : '—'
          }
        />

        <ProviderCard
          icon={BarChart3}
          title="Google Analytics 4"
          connected={gaConnected}
          statusText={gaConnected ? 'Connected' : 'Missing env var'}
          description={
            gaConnected
              ? 'Traffic sources, page views, conversion funnels. gtag() lazy-loaded from layout.js.'
              : 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID environment variable is missing.'
          }
          bulletPoints={[
            'Traffic source (organic / direct / referral / social)',
            'Per-page views + session duration',
            'Bounce rate, average session length',
            'Device, browser, and OS breakdown',
            'Geographic visitor map',
          ]}
          dashboardUrl={gaDashboardUrl}
          dashboardLabel="Open GA4"
          footer={
            gaConnected ? `Measurement ID: ${GA_MEASUREMENT_ID}` : '—'
          }
        />

        <ProviderCard
          icon={Activity}
          title="Vercel Analytics"
          connected
          statusText="Connected"
          description="Speed Insights + Web Analytics: real-user Core Web Vitals + simple traffic. @vercel/analytics + @vercel/speed-insights are wired in layout."
          bulletPoints={[
            'Real-user LCP / INP / CLS measurement',
            'Per-path traffic (visible in the Vercel dashboard only)',
            'Device breakdown',
            'Geography (from edge logs)',
          ]}
          dashboardUrl={vercelAnalyticsUrl}
          dashboardLabel="Open Vercel"
          footer="Analytics tab on the team dashboard"
        />
      </div>

      {/* Clarity identify explainer */}
      <div className="rounded-2xl border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.03)] p-5">
        <div className="flex items-start gap-3">
          <Users2 className="w-5 h-5 text-[#FFD700] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Per-User Clarity Filtering — live
            </h4>
            <p className="text-xs text-[#A0A0A0] mb-3">
              Every signed-in member's Clarity session is tagged with
              `identify(uid, email)` plus custom tags (role, companyType,
              verified, country, joinDate). Result — inside the Clarity dashboard:
            </p>
            <ul className="text-[11px] text-[#A0A0A0] space-y-1 mb-3">
              <li className="flex items-start gap-2">
                <span className="text-[#606060] mt-[3px]">•</span>
                <span>
                  Filter → <code className="text-[#FFD700]">CustomUserId = &lt;uid&gt;</code> to see one member's sessions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#606060] mt-[3px]">•</span>
                <span>
                  Segment → tag filters like <code className="text-[#FFD700]">verified = yes</code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#606060] mt-[3px]">•</span>
                <span>
                  Members → Activity table has a direct Clarity link on every row (that user's recordings)
                </span>
              </li>
            </ul>
            <p className="text-[10px] text-[#606060]">
              Note: Clarity's free plan retains recordings for 30 days. To review older sessions, upgrade to Clarity Pro.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder for future inline metrics */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-[#606060] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Inline metrics (roadmap)
            </h4>
            <p className="text-xs text-[#A0A0A0]">
              Once the GA4 Data API and Clarity Export API are wired in, this
              section will grow: daily traffic trend, top 10 landing pages,
              source breakdown, device split, LCP/INP/CLS distribution, and a
              rage-click hot-spot list. All will slot in without touching the
              section shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
