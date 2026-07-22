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

/**
 * Featured Product mockup — two stacked scenes showing the SAME
 * "Your Product Here" placeholder in both surfaces where the ad
 * actually renders: the homepage hero (top-left desktop card / mobile
 * ad card) and the top of the products directory. Numbered ①/② labels
 * make the "two placements per booking" pitch visible in one glance.
 */
function FeaturedMockup() {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.95)] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] space-y-3">
      {/* ① Homepage hero slot */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4 h-4 rounded-full bg-[#FFD700] text-[#0F1B2B] text-[9px] font-extrabold flex items-center justify-center flex-shrink-0">
            1
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            Homepage Hero
          </span>
          <span className="text-[9px] text-[#A0A0A0]">— top-left card</span>
        </div>
        <div className="rounded-lg overflow-hidden border-2 border-[#FFD700]/70 bg-[rgba(15,27,43,0.85)]">
          <div className="bg-[#FFD700] px-1.5 py-1 text-center">
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#0F1B2B' }}>
              Featured Product
            </span>
          </div>
          <div className="flex items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-md bg-[rgba(255,215,0,0.12)] border border-[#FFD700]/40 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4 text-[#FFD700]/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-white truncate">Your Product Here</div>
              <div className="text-[7px] text-[#c8d3e0] truncate">Front-page product spotlight</div>
              <div className="text-[7px] text-[#FFD700] font-semibold mt-0.5">Visit →</div>
            </div>
          </div>
        </div>
      </div>

      {/* ② Products directory slot — existing grid layout, condensed */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4 h-4 rounded-full bg-[#FFD700] text-[#0F1B2B] text-[9px] font-extrabold flex items-center justify-center flex-shrink-0">
            2
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            Products Directory
          </span>
          <span className="text-[9px] text-[#A0A0A0]">— first spot</span>
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-bold text-[10px]">Latest Products</div>
            <div className="text-[8px] text-[#A0A0A0]">View All →</div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {/* Advertised slot */}
            <div className="rounded-md overflow-hidden border-2 border-[#FFD700]/70 bg-[rgba(15,27,43,0.85)] flex flex-col">
              <div className="bg-[#FFD700] px-1 py-0.5 text-center">
                <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: '#0F1B2B' }}>
                  Your Ad
                </span>
              </div>
              <div className="w-full h-10 flex items-center justify-center bg-[rgba(255,215,0,0.05)]">
                <ImageIcon className="w-4 h-4 text-[#FFD700]/50" />
              </div>
              <div className="p-1">
                <div className="text-[7px] font-bold text-white truncate">Your Product</div>
                <div className="text-[6px] text-[#FFD700] font-semibold">$ -- / UNIT</div>
              </div>
            </div>
            {/* Real slot 1 */}
            <div className="rounded-md overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] flex flex-col">
              <div className="w-full h-10 flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
                <ImageIcon className="w-4 h-4 text-[#A0A0A0]/40" />
              </div>
              <div className="p-1">
                <div className="text-[7px] font-bold text-white truncate">Fresh Banana</div>
                <div className="text-[6px] text-[#c8d3e0]">$ 5.35 / SET</div>
              </div>
            </div>
            {/* Real slot 2 */}
            <div className="rounded-md overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] flex flex-col">
              <div className="w-full h-10 flex items-center justify-center bg-[rgba(255,255,255,0.02)]">
                <ImageIcon className="w-4 h-4 text-[#A0A0A0]/40" />
              </div>
              <div className="p-1">
                <div className="text-[7px] font-bold text-white truncate">Red Apples</div>
                <div className="text-[6px] text-[#c8d3e0]">$ 1.24 / PCE</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-[#A0A0A0] leading-relaxed text-center pt-1">
        One booking — two on-site placements. Same product card shape on both surfaces.
      </p>
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
 * Featured Company mockup — a scaled-down mobile phone frame showing
 * the homepage hero exactly the way a visitor sees it on their phone:
 * search bar → CTAs → Featured Product card (left) + Featured Company
 * card (right). The Featured Company card is highlighted so the ad
 * spot is the obvious visual anchor.
 */
function FeaturedCompanyMockup() {
  return (
    <div className="flex justify-center">
      {/* Phone shell */}
      <div
        className="relative rounded-[28px] border-[6px] border-[#0a1220] bg-[#0F1B2B] shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden"
        style={{ width: 260 }}
      >
        {/* Fake notch */}
        <div className="mx-auto mt-1.5 mb-2 h-1 w-16 rounded-full bg-[#050a12]" />

        {/* Fake nav row */}
        <div className="flex items-center justify-between px-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#FFD700] text-[10px]">✦</span>
            <span className="text-[8px] text-white font-semibold">CoreTradeGlobal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#FFD700]/30" />
            <div className="w-2 h-2 rounded-full bg-[#FFD700]/30" />
          </div>
        </div>

        {/* Rates ticker */}
        <div className="flex justify-center gap-2 py-1 text-[6px] text-[#A0A0A0] font-mono border-b border-[rgba(255,255,255,0.04)]">
          <span>EUR/USD 1.14</span>
          <span>GBP/TRY 63.4</span>
        </div>

        {/* Slogan */}
        <div className="px-3 pt-3 text-center">
          <p className="text-[9px] font-bold text-white leading-tight">
            Global Trade, Simplified: <br />Navigate the Complex Markets.
          </p>
        </div>

        {/* Search + switch inline */}
        <div className="px-3 mt-3">
          <div className="flex items-center gap-1 rounded-full bg-[rgba(15,27,43,0.7)] border border-[#FFD700]/40 px-1 py-1">
            <div className="flex items-center rounded-full bg-transparent overflow-hidden">
              <span className="px-1.5 py-0.5 rounded-full bg-[#FFD700] text-[7px] font-bold" style={{ color: '#0F1B2B' }}>
                Products
              </span>
              <span className="px-1.5 py-0.5 text-[7px] text-white/70">RFQs</span>
            </div>
            <span className="flex-1 text-[7px] text-white/40 pl-1">Search products…</span>
            <div className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
              <Search className="w-2.5 h-2.5" style={{ color: '#0F1B2B' }} />
            </div>
          </div>
        </div>

        {/* Globe silhouette (compressed) */}
        <div className="flex justify-center py-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <span className="text-[16px] opacity-30">🌐</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="px-3 space-y-1.5">
          <div className="rounded-full text-center py-1.5 text-[8px] font-bold bg-gradient-to-r from-[#FFD700] to-[#FDB931]" style={{ color: '#0F1B2B' }}>
            Add Product
          </div>
          <div className="rounded-full text-center py-1.5 text-[8px] font-bold bg-[#3B82F6] text-white">
            Add Request
          </div>
        </div>

        {/* Mobile hero ad card row — THIS is where Featured Company lives */}
        <div className="px-3 mt-2 mb-3">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Featured Product neighbour (dimmed for contrast) */}
            <div className="rounded-lg border border-[rgba(255,215,0,0.35)] bg-[rgba(15,27,43,0.7)] p-1.5 opacity-60">
              <div className="rounded-md aspect-[5/2] bg-[rgba(255,215,0,0.08)] flex items-center justify-center mb-1">
                <ImageIcon className="w-3 h-3 text-[#FFD700]/40" />
              </div>
              <div className="text-[6px] font-bold uppercase text-[#FFD700] tracking-wider">Featured Product</div>
              <div className="text-[7px] font-bold text-white leading-tight">Product Ad</div>
              <div className="text-[6px] text-[#FFD700] font-bold mt-0.5">Visit →</div>
            </div>

            {/* Featured Company — highlighted (the paid slot) */}
            <div className="rounded-lg border-2 border-[#FFD700] bg-[rgba(15,27,43,0.9)] p-1.5 shadow-[0_0_16px_rgba(255,215,0,0.25)] relative">
              <div className="rounded-md aspect-[5/2] bg-[rgba(255,215,0,0.15)] border border-[#FFD700]/40 flex items-center justify-center mb-1">
                <div className="w-6 h-6 rounded bg-[rgba(255,215,0,0.25)] border border-[#FFD700]/60 flex items-center justify-center text-[#FFD700] font-extrabold text-[7px]">
                  CO
                </div>
              </div>
              <div className="text-[6px] font-bold uppercase text-[#FFD700] tracking-wider">Featured Company</div>
              <div className="text-[7px] font-bold text-white leading-tight truncate">Your Brand Here</div>
              <div className="text-[6px] text-[#FFD700] font-bold mt-0.5">Visit →</div>
              {/* Little "your ad" pointer chip */}
              <span className="absolute -top-2 -right-1 bg-[#FFD700] text-[#0F1B2B] text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow-md tracking-wider">
                Your Ad
              </span>
            </div>
          </div>
        </div>

        {/* Legend footer inside the phone */}
        <div className="px-3 pb-3">
          <p className="text-[7px] text-[#A0A0A0] text-center leading-tight">
            Above the fold on every mobile visit.
          </p>
        </div>
      </div>
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
