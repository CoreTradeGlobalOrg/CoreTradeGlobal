/**
 * Advertising Page
 *
 * Rendered at /advertising. Split out of /pricing so the advertising
 * pitch can live as its own reachable page from the navbar dropdown.
 *
 * Contents:
 *   1. Grow Your Brand Globally — the AD_TIERS row layout with an
 *      in-page mockup per placement (Featured Product, Hero,
 *      Carousel, Featured Company).
 *   2. Bottom CTA — Get in touch → /pricing/inquire.
 *
 * All styling stays inside the brand palette so this page visually
 * matches /pricing and the rest of the site without introducing a new
 * theme.
 */

'use client';

import Link from 'next/link';
import { Check, ArrowRight, Search, Image as ImageIcon } from 'lucide-react';
import { AD_TIERS } from '@/core/constants/adTypes';

export default function AdvertisingPage() {
  return (
    <main className="pt-[calc(var(--navbar-height)+8px)] pb-4 bg-radial-navy min-h-screen text-white">
      <Advertising />
      <BottomCTA />
    </main>
  );
}

function Advertising() {
  return (
    <section id="advertising" className="px-5 pt-2 pb-6 md:pt-4 md:pb-10 scroll-mt-[calc(var(--navbar-height)+16px)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Grow Your Brand Globally</h2>
          <p className="text-[#c8d3e0] text-base md:text-lg max-w-2xl mx-auto">
            Optional advertising placements to reach our qualified global B2B audience.
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
                  <AdMockup type={tier.mockup} tierId={tier.id} />
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
 *
 * Picks a mockup by tierId first (so we can dedicate a distinct visual
 * to Featured Company even though it shares the `featured` mockup key
 * with Featured Product in AD_TIERS), then falls back to the mockup
 * type string.
 */
function AdMockup({ type, tierId }) {
  if (tierId === 'featured_company') return <FeaturedCompanyMockup />;
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

/**
 * Featured Company mockup — mirrors the top-left hero data card layout
 * on desktop / the mobile ad card row so visitors instantly recognize
 * where their spot will appear. Same brand palette + gold framing as
 * the actual sponsored slot on the homepage hero.
 */
function FeaturedCompanyMockup() {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.95)] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
      {/* Fake homepage hero context — small title bar so the "sponsored"
          card is anchored in a recognizable page shell. */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 text-[9px] text-[#c8d3e0] font-semibold">
          <span className="text-[#FFD700]">✦</span>
          <span>CoreTradeGlobal — Homepage</span>
        </div>
        <span className="text-[8px] text-[#A0A0A0]">Hero Section</span>
      </div>

      {/* Two-column mock of the hero left cards. Left card = the paid
          Featured Company slot (highlighted). Right card = organic
          Latest RFQ, dimmed so the sponsored slot is the visual anchor. */}
      <div className="grid grid-cols-2 gap-2">
        {/* Featured Company — advertised slot */}
        <div className="rounded-lg overflow-hidden border-2 border-[#FFD700]/70 bg-[rgba(15,27,43,0.85)] flex flex-col">
          <div className="bg-[#FFD700] px-1.5 py-1 text-center">
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#0F1B2B' }}>
              Featured Company
            </span>
          </div>
          <div className="w-full h-16 flex items-center justify-center bg-[rgba(255,215,0,0.06)]">
            <div className="w-10 h-10 rounded-md bg-[rgba(255,215,0,0.15)] border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] font-extrabold text-xs">
              CO
            </div>
          </div>
          <div className="p-2">
            <div className="text-[9px] font-bold text-white truncate">Your Company Here</div>
            <div className="text-[7px] text-[#A0A0A0] mb-1">Verified Supplier</div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] text-[#FFD700] font-semibold">Front-page brand slot</span>
              <span className="text-[7px] px-1 py-0.5 rounded bg-[#FFD700] font-bold whitespace-nowrap" style={{ color: '#0F1B2B' }}>
                Visit
              </span>
            </div>
          </div>
        </div>

        {/* Organic Latest RFQ neighbour — dimmed so the paid slot pops */}
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] flex flex-col opacity-70">
          <div className="px-1.5 py-1 text-center bg-[rgba(255,255,255,0.05)]">
            <span className="text-[8px] font-bold uppercase tracking-wider text-[#A0A0A0]">
              Latest RFQ
            </span>
          </div>
          <div className="w-full h-16 flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
            <div className="text-[8px] text-[#A0A0A0]">📋</div>
          </div>
          <div className="p-2">
            <div className="text-[9px] font-bold text-white truncate">500 MT Deformed Steel</div>
            <div className="text-[7px] text-[#A0A0A0] mb-1">Qty: 500 TNE</div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] text-[#c8d3e0]">Check Details ▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend line so the mockup reads even without a hover state */}
      <p className="mt-3 text-[9px] text-[#A0A0A0] leading-relaxed text-center">
        Your logo and tagline sit in the top-left hero slot on desktop and the mobile CTA row — every visitor sees it before scrolling.
      </p>
    </div>
  );
}

function BottomCTA() {
  return (
    <section className="px-5 pt-4 pb-2 md:pt-6 md:pb-4">
      <div className="max-w-3xl mx-auto text-center rounded-2xl border border-[rgba(255,215,0,0.15)] bg-gradient-to-br from-[rgba(255,215,0,0.05)] to-[rgba(255,215,0,0.02)] p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Ready to advertise?</h2>
        <p className="text-[#c8d3e0] text-base md:text-lg mb-8">
          Tell us which placement fits and we'll get back to you with dates + next steps.
        </p>
        <Link
          href="/pricing/inquire"
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
