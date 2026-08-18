/**
 * Admin Analytics Dashboard
 *
 * URL: /admin/analytics
 * Protected: admin role only (guarded here, redirects otherwise — same
 * pattern as /admin).
 *
 * First-cut layout: left sidebar + main content area, section switched
 * client-side. Sections implemented in Sprint 1: Overview, Members.
 * Everything else is a "Coming soon" placeholder so the navigation
 * shape is set before content lands.
 */

'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  BarChart3,
  Users,
  TrendingUp,
  Mail,
  Globe,
  Megaphone,
  ClipboardList,
  LayoutGrid,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { OverviewSection } from '@/presentation/components/features/admin/analytics/OverviewSection';
import { MembersSection } from '@/presentation/components/features/admin/analytics/MembersSection';
import { TeamLogSection } from '@/presentation/components/features/admin/analytics/TeamLogSection';
import { GrowthSection } from '@/presentation/components/features/admin/analytics/GrowthSection';
import { SiteAnalyticsSection } from '@/presentation/components/features/admin/analytics/SiteAnalyticsSection';
import { AdsSection } from '@/presentation/components/features/admin/analytics/AdsSection';
import { ProfileCompletenessSection } from '@/presentation/components/features/admin/analytics/ProfileCompletenessSection';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'profile', label: 'Profile Health', icon: UserCheck },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
  { id: 'hubspot', label: 'HubSpot CRM', icon: Mail, comingSoon: true },
  { id: 'site', label: 'Site Analytics', icon: Globe },
  { id: 'ads', label: 'Ads', icon: LayoutGrid },
  { id: 'outreach', label: 'Outreach', icon: Megaphone, comingSoon: true },
  { id: 'team-log', label: 'Team Daily Log', icon: ClipboardList },
];

function ComingSoon({ label }) {
  return (
    <div className="flex items-center justify-center h-96 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      <div className="text-center">
        <p className="text-lg font-semibold text-white mb-1">{label}</p>
        <p className="text-sm text-[#A0A0A0]">Coming soon.</p>
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const router = useRouter();
  const { user, loading: authLoading, profileLoading, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/admin/analytics');
      } else if (user?.role !== 'admin') {
        router.replace('/');
      }
    }
  }, [authLoading, profileLoading, isAuthenticated, user, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1B2B]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent" />
          <p className="mt-4 text-[#A0A0A0]">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') return null;

  const active = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="min-h-screen bg-[#0F1B2B] pt-[calc(var(--navbar-height)+16px)]">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Analytics Dashboard
          </h2>
          <p className="text-sm text-[#A0A0A0]">
            Platform metrikleri, üye yaşam döngüsü ve büyüme paneli.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6">
          {/* Sidebar */}
          <aside className="md:sticky md:top-[calc(var(--navbar-height)+24px)] md:self-start rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30'
                        : 'text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.04)] border border-transparent',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{section.label}</span>
                    {section.comingSoon && (
                      <span className="text-[10px] uppercase tracking-wider text-[#606060]">
                        soon
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main */}
          <main>
            {active.id === 'overview' && <OverviewSection />}
            {active.id === 'members' && <MembersSection />}
            {active.id === 'profile' && <ProfileCompletenessSection />}
            {active.id === 'team-log' && <TeamLogSection />}
            {active.id === 'growth' && <GrowthSection />}
            {active.id === 'site' && <SiteAnalyticsSection />}
            {active.id === 'ads' && <AdsSection />}
            {active.comingSoon && <ComingSoon label={active.label} />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#0F1B2B]">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
