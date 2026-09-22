/**
 * Advertising Page
 *
 * Rendered at /advertising. Post-consolidation the platform sells one
 * package (SPONSORED) at a single monthly price — this page frames that
 * offer and routes the visitor to /pricing/inquire?type=sponsored.
 *
 * The old page grew a 4-tier grid + custom SVG mockup per placement.
 * That's been retired in favour of a single hero card that surfaces
 * the four surfaces the package covers (hero left, hero right, homepage
 * showcase, /products directory).
 */

'use client';

import Link from 'next/link';
import { Check, ArrowRight, Sparkles, LayoutDashboard, Grid, Package } from 'lucide-react';
import { AD_TIERS } from '@/core/constants/adTypes';

const TIER = AD_TIERS[0];

// Which surfaces the package covers. Icon + heading + one-liner keeps
// the "here's what you're paying for" visual density high without
// needing a full pixel-perfect mockup per surface.
const SURFACES = [
  {
    icon: Sparkles,
    title: 'Hero Product Card',
    body: 'Homepage hero, top-left. Your product is the first thing every visitor sees.',
  },
  {
    icon: LayoutDashboard,
    title: 'Hero Company Card',
    body: 'Homepage hero, top-right. Your brand card sits beside the product ad.',
  },
  {
    icon: Grid,
    title: 'Sponsored Company Showcase',
    body: 'Dedicated homepage section — your logo, description, and 3 featured products.',
  },
  {
    icon: Package,
    title: '/products Directory Slot',
    body: 'Top of the products grid. Buyers browsing the catalogue land on your product first.',
  },
];

export default function AdvertisingPage() {
  return (
    <main className="pt-[calc(var(--navbar-height)+8px)] pb-4 bg-radial-navy min-h-screen text-white">
      <SponsoredHero />
      <BottomCTA />
    </main>
  );
}

function SponsoredHero() {
  return (
    <section id="promote" className="px-5 pt-4 pb-6 md:pt-6 md:pb-10 scroll-mt-[calc(var(--navbar-height)+16px)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Grow Your Brand Globally</h2>
          <p className="text-[#c8d3e0] text-base md:text-lg max-w-2xl mx-auto">
            One package, four surfaces — the whole site works for you for a full month.
          </p>
        </div>

        <div className="rounded-3xl border border-[rgba(255,215,0,0.25)] bg-gradient-to-br from-[rgba(26,40,59,0.9)] to-[rgba(15,27,43,0.98)] p-6 md:p-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0F1B2B] bg-gradient-to-r from-[#FFD700] to-[#FDB931] px-2.5 py-1 rounded-full mb-4">
                Sponsored Package
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">{TIER.title}</h3>
              <p className="text-sm md:text-base text-[#c8d3e0] leading-relaxed mb-5">{TIER.desc}</p>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl md:text-5xl font-extrabold bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
                  ${TIER.monthlyPrice}
                </span>
                <span className="text-[#A0A0A0] text-sm font-semibold">/ month</span>
              </div>

              <ul className="space-y-2 mb-6">
                {TIER.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#c8d3e0]">
                    <Check className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing/inquire?type=sponsored"
                style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm hover:shadow-[0_10px_25px_rgba(255,215,0,0.35)] transition-all no-underline"
              >
                {TIER.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SURFACES.map((s) => (
                <div
                  key={s.title}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <s.icon className="w-5 h-5 text-[#FFD700] mb-2" />
                  <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="px-5 pt-4 pb-2 md:pt-6 md:pb-4">
      <div className="max-w-3xl mx-auto text-center rounded-2xl border border-[rgba(255,215,0,0.15)] bg-gradient-to-br from-[rgba(255,215,0,0.05)] to-[rgba(255,215,0,0.02)] p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Ready to advertise?</h2>
        <p className="text-[#c8d3e0] text-base md:text-lg mb-8">
          Pick a month, pick your products, we&apos;ll do the rest.
        </p>
        <Link
          href="/pricing/inquire?type=sponsored"
          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-base hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] hover:-translate-y-0.5 transition-all no-underline"
        >
          Get in touch
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
