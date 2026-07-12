/**
 * Pricing Page
 *
 * Rendered at /pricing. Six sections in order:
 *   1. Hero — headline "Completely Free — No Commissions. No Limits."
 *   2. Comparison — CTG vs Traditional B2B feature table
 *   3. Biz-Model — 4 tiles explaining how we stay free (Logistics /
 *      Insurance / 2FA / Verification)
 *   4. Advertising Tiers — 3 cards linking to /pricing/inquire?type=...
 *   5. FAQ accordion — 5 items
 *   6. Bottom CTA — Register Free
 *
 * The Register Free CTA and advertising tiers are the two conversion
 * paths; everything else supports the value pitch. All styling uses the
 * existing brand palette (gold #FFD700, deep navy #0F1B2B, radial navy
 * bg) so it visually matches the rest of the site without a new theme.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  Truck,
  Shield,
  Lock,
  BadgeCheck,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Search,
  Image as ImageIcon,
} from 'lucide-react';

const COMPARISON_ROWS = [
  { feature: 'Annual Membership Fee', ctg: '$0 (Free Forever)', trad: '$3,000 – $10,000+' },
  { feature: 'Transaction Commission', ctg: '0% (None)', trad: '2% – 15% per deal' },
  { feature: 'Product Listings', ctg: 'Unlimited', trad: 'Capped / paid tiers' },
  { feature: 'Direct Messaging & Contact', ctg: 'Unlocked', trad: 'Paywalled' },
  { feature: 'RFQ Posting & Bidding', ctg: 'Free & Unlimited', trad: 'Credit-based' },
  { feature: 'Manual Trust Verification', ctg: 'Included', trad: 'Add-on / paid' },
];

const BIZ_MODEL_TILES = [
  {
    icon: Truck,
    title: 'Logistics Support',
    desc: 'Optional freight quotes from vetted partners with a small placement fee.',
  },
  {
    icon: Shield,
    title: 'Cargo Insurance',
    desc: 'Optional coverage that funds the platform via referral partnerships.',
  },
  {
    icon: Lock,
    title: 'Advanced Security',
    desc: '2FA + audit trails included; enterprise tiers subsidize the base platform.',
  },
  {
    icon: BadgeCheck,
    title: 'Verification Vetting',
    desc: 'Manual trust badging is free for members; enterprise deep-vetting is paid.',
  },
];

const AD_TIERS = [
  {
    id: 'featured',
    tag: 'Featured Products',
    title: 'Featured Product Ads',
    price: '$100',
    priceSuffix: '/week',
    desc: 'Top-of-directory placement in front of active B2B buyers actively searching for direct trade listings.',
    features: [
      'Featured at the top of the B2B product directory',
      '1,500–2,500 active weekly B2B buyers',
      'Shown across 25+ global shipping routes and markets',
    ],
    cta: 'Inquire About Featured Ads',
    mockup: 'featured',
  },
  {
    id: 'hero',
    tag: 'Hero Spotlight',
    title: 'Hero Section Spotlights',
    price: '$100',
    priceSuffix: '/week',
    desc: 'Prime attention slot on the homepage and category search results — the highest-conversion surface on the platform.',
    features: [
      '3,000+ daily decision-makers and trade executives',
      'Reach sourcing agents from 35+ countries',
      'Highest-conversion spotlight on home and search pages',
    ],
    cta: 'Inquire About Hero Ads',
    mockup: 'hero',
  },
  {
    id: 'carousel',
    tag: 'Carousel Brand',
    title: 'Carousel Brand Spotlights',
    price: '$100',
    priceSuffix: '/week',
    desc: 'Interactive horizontal brand showcase on the landing pages — great for brand awareness campaigns.',
    features: [
      '2,000–3,000 direct B2B importers & exporters weekly',
      'Shown to active traders across 30+ countries',
      'Interactive carousel showcase on the landing pages',
    ],
    cta: 'Inquire About Carousel Ads',
    mockup: 'carousel',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Why is CoreTradeGlobal free?',
    a: 'We believe B2B matching and messaging should be 100% free to support global trade. We sustain operations through optional integrated trade services (logistics, insurance, legal) and advertising options that target our qualified B2B importer/exporter audience.',
  },
  {
    q: 'Are there any hidden transaction fees or commissions?',
    a: 'No. There are no commissions, transaction cuts, or processing percentages taken by CoreTradeGlobal. Negotiations, payments, and contracts happen directly between the buyer and supplier under their own terms.',
  },
  {
    q: 'Is there a limit on product listings or RFQ posts?',
    a: 'No. Free accounts get unlimited product listings and can publish or respond to unlimited RFQs. We want you to list your entire catalog to maximize matches without worrying about credits.',
  },
  {
    q: 'Is manual trust verification mandatory?',
    a: 'Yes. To keep the B2B network clear of anonymous listings and potential fraud vectors, every registered company undergoes manual vetting by our team. Vetting is completed quickly and once approved, a "Verified Badge" is appended to your profile.',
  },
  {
    q: 'Am I forced to use the logistics or insurance tools?',
    a: 'Not at all. The logistics quotes, cargo insurance, and legal support are optional conveniences. You are welcome to use your own external shipping brokers and consultants for deals made on our platform.',
  },
];

export default function PricingPage() {
  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <Hero />
      <Comparison />
      <BizModel />
      <Advertising />
      <FAQ />
      <BottomCTA />
    </main>
  );
}

function Hero() {
  return (
    <section className="px-5 pt-6 pb-8 md:pt-10 md:pb-12">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
          Completely Free —
          <br />
          <span className="bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
            No Commissions. No Limits.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-[#c8d3e0] max-w-3xl mx-auto mb-6 leading-relaxed">
          Say goodbye to thousands of dollars in membership fees, locked B2B directories, and transaction commissions. CoreTradeGlobal lets exporters, importers, and global brands connect, message, list products, and trade directly — completely free.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-base hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] hover:-translate-y-0.5 transition-all no-underline"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#comparison"
            style={{ color: '#ffffff' }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] font-semibold text-base hover:bg-[rgba(255,255,255,0.1)] transition-all no-underline"
          >
            Compare Platforms
          </a>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section id="comparison" className="px-5 py-6 md:py-10 scroll-mt-[calc(var(--navbar-height)+16px)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Why pay to showcase your business?</h2>
          <p className="text-[#c8d3e0] text-base md:text-lg">CoreTradeGlobal vs Traditional B2B platforms — side by side.</p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] shadow-[0_25px_50px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] text-sm md:text-base">
            <div className="hidden sm:block px-5 py-4 bg-[rgba(255,255,255,0.03)] font-semibold text-[#A0A0A0] uppercase tracking-wider text-xs">Feature</div>
            <div className="hidden sm:block px-5 py-4 bg-[rgba(255,255,255,0.03)] font-semibold text-[#FFD700] uppercase tracking-wider text-xs text-center">CoreTradeGlobal</div>
            <div className="hidden sm:block px-5 py-4 bg-[rgba(255,255,255,0.03)] font-semibold text-[#A0A0A0] uppercase tracking-wider text-xs text-center">Traditional B2B</div>
            {COMPARISON_ROWS.map((row) => (
              <div key={row.feature} className="contents">
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] font-semibold text-white">{row.feature}</div>
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] text-center text-[#FFD700] font-semibold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{row.ctg}</span>
                </div>
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] text-center text-[#A0A0A0] flex items-center justify-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{row.trad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BizModel() {
  return (
    <section className="px-5 py-6 md:py-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">How is it free?</h2>
          <p className="text-[#c8d3e0] text-base md:text-lg max-w-2xl mx-auto">
            We sustain the platform through optional integrated services and advertising placements.
            The core B2B experience stays free forever.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BIZ_MODEL_TILES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] p-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-[rgba(255,215,0,0.1)] flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-[#FFD700]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Advertising() {
  return (
    <section id="advertising" className="px-5 py-6 md:py-10 scroll-mt-[calc(var(--navbar-height)+16px)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Grow Your Brand Globally</h2>
          <p className="text-[#c8d3e0] text-base md:text-lg max-w-2xl mx-auto">
            Three optional advertising placements to reach our qualified global B2B audience.
          </p>
        </div>

        {/* Alternating rows: text ↔ mockup */}
        <div className="space-y-8 md:space-y-10">
          {AD_TIERS.map((tier, idx) => {
            const reverse = idx % 2 === 1;
            return (
              <div
                key={tier.id}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] p-6 md:p-8"
              >
                <div className={reverse ? 'lg:order-2' : ''}>
                  <span className="inline-block px-2.5 py-1 rounded-full bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] text-[#FFD700] text-[10px] uppercase tracking-wider font-semibold mb-3">
                    {tier.tag}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">{tier.title}</h3>
                  <p className="text-sm md:text-base text-[#c8d3e0] leading-relaxed mb-4">{tier.desc}</p>
                  <ul className="space-y-2 mb-5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[#c8d3e0]">
                        <Check className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/pricing/inquire?type=${tier.id}`}
                    style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm hover:shadow-[0_10px_25px_rgba(255,215,0,0.3)] transition-all no-underline"
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className={reverse ? 'lg:order-1' : ''}>
                  <AdMockup type={tier.mockup} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Detailed in-page mockups showing each ad placement in context. Pure
 * markup (no image assets) so nothing to load, and the mockups scale
 * cleanly across viewport sizes.
 */
function AdMockup({ type }) {
  if (type === 'featured') return <FeaturedMockup />;
  if (type === 'hero') return <HeroMockup />;
  return <CarouselMockup />;
}

function FeaturedMockup() {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.95)] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-bold text-sm">Latest Products</div>
        <div className="text-[10px] text-[#A0A0A0]">View All Products →</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* Advertised slot */}
        <div className="relative rounded-lg overflow-hidden border-2 border-[#FFD700]/70 bg-[rgba(15,27,43,0.85)] flex flex-col">
          <div className="bg-[#FFD700] px-1.5 py-1 text-center">
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#0F1B2B' }}>
              Advertise Here
            </span>
          </div>
          <div className="w-full h-14 flex items-center justify-center bg-[rgba(255,215,0,0.05)]">
            <ImageIcon className="w-6 h-6 text-[#FFD700]/50" />
          </div>
          <div className="p-1.5">
            <div className="text-[8px] font-bold text-white truncate">Your Product Here</div>
            <div className="text-[7px] text-[#A0A0A0] mb-1">Featured Spot</div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] text-[#FFD700] font-semibold">$ -- / UNIT</span>
              <span className="text-[7px] px-1 py-0.5 rounded bg-[#FFD700] font-bold" style={{ color: '#0F1B2B' }}>
                Book Spot
              </span>
            </div>
          </div>
        </div>
        {/* Real slot 1 */}
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] flex flex-col">
          <div className="w-full h-14 flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
            <ImageIcon className="w-6 h-6 text-[#A0A0A0]/40" />
          </div>
          <div className="p-1.5">
            <div className="text-[8px] font-bold text-white truncate">Fresh Banana</div>
            <div className="text-[7px] text-[#A0A0A0] mb-1">Agriculture &amp; Food</div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] text-[#c8d3e0]">$ 5.35 / SET</span>
              <span className="text-[7px] px-1 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-white font-semibold">
                View
              </span>
            </div>
          </div>
        </div>
        {/* Real slot 2 */}
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] flex flex-col">
          <div className="w-full h-14 flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
            <ImageIcon className="w-6 h-6 text-[#A0A0A0]/40" />
          </div>
          <div className="p-1.5">
            <div className="text-[8px] font-bold text-white truncate">Red Apples</div>
            <div className="text-[7px] text-[#A0A0A0] mb-1">Agriculture &amp; Food</div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] text-[#c8d3e0]">$ 1.24 / PCE</span>
              <span className="text-[7px] px-1 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-white font-semibold">
                View
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.95)] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
      {/* Fake browser navbar */}
      <div className="flex items-center gap-3 pb-2 mb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
        </div>
        <div className="flex items-center gap-2 text-[7px] text-[#c8d3e0] font-semibold">
          <span className="text-[#FFD700]">✦</span>
          <span>CoreTrade Global</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[7px] text-[#A0A0A0]">
          <span>Marketplace</span>
          <span>Services</span>
          <span>News</span>
          <span>Tools</span>
        </div>
        <span className="ml-auto text-[7px] text-[#A0A0A0]">Account</span>
      </div>
      {/* Rates ticker */}
      <div className="flex justify-center gap-3 text-[6px] text-[#A0A0A0] font-mono mb-2">
        <span>EUR/USD 1.1441</span>
        <span>USD/EUR 0.8749</span>
        <span>GBP/USD 1.3441</span>
      </div>
      {/* Big title */}
      <div className="text-center mb-2">
        <div className="text-[8px] font-bold text-white leading-tight">The Operating System for Trade:</div>
        <div className="text-[8px] font-bold text-white leading-tight">A Future-Ready, Data-Driven B2B Experience.</div>
      </div>
      {/* Tabs + search */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="px-2 py-0.5 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/40 text-[7px] text-[#FFD700] font-semibold">Products</div>
        <div className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[7px] text-[#A0A0A0]">RFQs</div>
      </div>
      <div className="flex items-center gap-1.5 mx-6 mb-2">
        <div className="flex-1 h-4 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center px-2 gap-1">
          <Search className="w-2 h-2 text-[#A0A0A0]" />
          <span className="text-[6px] text-[#A0A0A0]">Search for products, companies…</span>
        </div>
      </div>
      <div className="flex justify-center gap-2 mb-3 text-[6px] text-[#A0A0A0]">
        <span>Marble</span>
        <span>Steel</span>
        <span>Textile</span>
        <span>Machinery</span>
      </div>
      {/* 2x2 mini cards */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-1.5">
          <div className="text-[6px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Latest Product</div>
          <div className="text-[7px] font-bold text-white">Black pepper</div>
          <div className="text-[6px] text-[#A0A0A0]">$ 6 / KGM</div>
        </div>
        <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-1.5">
          <div className="text-[6px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Latest Fair</div>
          <div className="text-[7px] font-bold text-white">Glasstech Mexico</div>
          <div className="text-[6px] text-[#A0A0A0]">Jul 15 · Guadalajara</div>
        </div>
        <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-1.5">
          <div className="text-[6px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Latest RFQ</div>
          <div className="text-[7px] font-bold text-white">500 MT Deformed Steel</div>
          <div className="text-[6px] text-[#A0A0A0]">Qty: 500 TNE</div>
        </div>
        {/* Featured Brand */}
        <div className="rounded-md border-2 border-[#FFD700]/70 bg-[rgba(255,215,0,0.05)] p-1.5">
          <div className="text-[6px] text-[#FFD700] uppercase tracking-wider mb-0.5 font-bold">★ Featured Brand</div>
          <div className="text-[7px] font-bold text-white">Your Brand Here</div>
          <div className="text-[6px] text-[#FFD700]">Book Spot Now →</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 1:1 port of `.mock-carousel-container` from
 * other_items/coretradeglobal-pricing.html:773+ — every measurement
 * (perspective, translateZ, scale, rotateY) preserved so the layered
 * 3D framing is identical.
 */
function CarouselMockup() {
  const CARD_BASE = {
    background: 'rgba(13, 23, 42, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: '0.75rem',
    position: 'absolute',
    width: 130,
    height: 165,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
  };

  const nameStyle = {
    fontSize: '0.62rem',
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 0.25rem 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.15rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
    lineHeight: 1.1,
  };

  const textStyle = {
    fontSize: '0.5rem',
    color: '#c8d3e0',
    lineHeight: 1.4,
    marginBottom: 'auto',
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textAlign: 'left',
    padding: '0 2px',
  };

  const buttonBase = {
    width: '100%',
    padding: '0.3rem 0',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#c8d3e0',
    borderRadius: 4,
    fontSize: '0.52rem',
    fontWeight: 700,
    marginTop: '0.4rem',
  };

  const buttonPrimary = {
    ...buttonBase,
    background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)',
    color: '#050a12',
    border: 'none',
  };

  const logoSmall = {
    width: 28,
    height: 28,
    background: 'rgba(255,255,255,0.85)',
    color: '#000',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.42rem',
    fontWeight: 800,
    marginBottom: '0.4rem',
    flexShrink: 0,
  };

  const logoCenter = {
    ...logoSmall,
    background: '#ffffff',
    padding: 2,
  };

  return (
    <div
      className="relative w-full flex flex-col items-center overflow-hidden"
      style={{
        background: '#060b13',
        borderRadius: 12,
        padding: '1.5rem',
        minHeight: 290,
        border: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      <h4
        style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#ffffff',
          margin: '0 0 0.15rem 0',
          letterSpacing: '-0.5px',
        }}
      >
        Featured Companies
      </h4>
      <span
        style={{
          fontSize: '0.62rem',
          color: '#3b82f6',
          marginBottom: '1.5rem',
        }}
      >
        Want to see your company here? View Advertising Options ›
      </span>

      {/* Track — perspective + 3D transforms replicate the .mock-carousel-track layout */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: 180, perspective: 600, zIndex: 10 }}
      >
        {/* Left card */}
        <div
          style={{
            ...CARD_BASE,
            transform: 'translateX(-105px) translateZ(-60px) rotateY(25deg)',
            opacity: 0.35,
            zIndex: 1,
          }}
        >
          <div style={logoSmall}>CTG</div>
          <h5 style={nameStyle}>CoreTradeGlobal</h5>
          <p style={textStyle}>Connecting verified global B2B exporters and importers on our fast marketplace…</p>
          <div style={buttonBase} className="text-center">View Profile</div>
        </div>

        {/* Center card — focused + scaled */}
        <div
          style={{
            ...CARD_BASE,
            width: 135,
            height: 170,
            background: '#0e1929',
            borderColor: 'rgba(255, 215, 0, 0.25)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            transform: 'translateX(0) translateZ(30px) scale(1.15)',
            zIndex: 5,
          }}
        >
          <div style={logoCenter}>
            <span style={{ fontSize: '0.28rem', fontWeight: 800, color: '#111' }}>CTG</span>
          </div>
          <h5 style={nameStyle}>
            <Check style={{ width: 8, height: 8, color: '#FFD700', flexShrink: 0 }} strokeWidth={3.5} />
            CoreTradeGlobal
          </h5>
          <p style={textStyle}>
            CoreTradeGlobal is an end-to-end B2B trade ecosystem bringing exporters, importers, and international businesses together on a single digital platform.
          </p>
          <div style={buttonPrimary} className="text-center">View Profile</div>
        </div>

        {/* Right card */}
        <div
          style={{
            ...CARD_BASE,
            transform: 'translateX(105px) translateZ(-60px) rotateY(-25deg)',
            opacity: 0.35,
            zIndex: 1,
          }}
        >
          <div style={logoSmall}>CTG</div>
          <h5 style={nameStyle}>CoreTradeGlobal</h5>
          <p style={textStyle}>Access cargo logistics, secure insurance, and direct messaging facilities…</p>
          <div style={buttonBase} className="text-center">View Profile</div>
        </div>
      </div>

      {/* Orbital plate — flat elliptical outline at the bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 25,
          width: 250,
          height: 60,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          transform: 'rotateX(75deg)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section className="px-5 py-6 md:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Frequently Asked Questions</h2>
        </div>
        <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={item.q} className={`border-b last:border-b-0 border-[rgba(255,255,255,0.06)] ${isOpen ? 'bg-[rgba(255,215,0,0.03)]' : ''}`}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <span className="font-semibold text-white text-base pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#FFD700] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-[#c8d3e0] text-sm leading-relaxed">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="px-5 py-10 md:py-16">
      <div className="max-w-3xl mx-auto text-center rounded-2xl border border-[rgba(255,215,0,0.15)] bg-gradient-to-br from-[rgba(255,215,0,0.05)] to-[rgba(255,215,0,0.02)] p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Ready to trade globally?</h2>
        <p className="text-[#c8d3e0] text-base md:text-lg mb-8">
          Zero setup fees. Zero commissions. Zero hidden costs. Just direct trade.
        </p>
        <Link
          href="/register"
          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-base hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] hover:-translate-y-0.5 transition-all no-underline"
        >
          Create Free Account
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
