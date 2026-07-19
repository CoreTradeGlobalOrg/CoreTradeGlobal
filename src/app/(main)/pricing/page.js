/**
 * Pricing Page
 *
 * Rendered at /pricing. Sections in order:
 *   1. Hero — headline "Completely Free. No Commissions. No Limits."
 *   2. Comparison — CTG vs Traditional B2B feature table
 *   3. FAQ accordion
 *   4. Bottom CTA — Register Free
 *
 * The advertising placements ("Grow Your Brand Globally" section) used
 * to live below the comparison table but were split into their own
 * page at /advertising so both live under the navbar Pricing dropdown.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, ChevronDown } from 'lucide-react';

const COMPARISON_ROWS = [
  { feature: 'Annual Membership Fee', ctg: '$0 (Free Forever)', trad: '$3,000 – $10,000+' },
  { feature: 'Transaction Commission', ctg: '0% (None)', trad: '2% – 15% per deal' },
  { feature: 'Product Listings', ctg: 'Unlimited', trad: 'Capped / paid tiers' },
  { feature: 'Direct Messaging & Contact', ctg: 'Unlocked', trad: 'Paywalled' },
  { feature: 'RFQ Posting & Bidding', ctg: 'Free & Unlimited', trad: 'Credit-based' },
  { feature: 'Manual Trust Verification', ctg: 'Included', trad: 'Add-on / paid' },
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
];

export default function PricingPage() {
  return (
    <main className="pt-[calc(var(--navbar-height)+8px)] pb-4 bg-radial-navy min-h-screen text-white">
      <Hero />
      <Comparison />
      <FAQ />
      <BottomCTA />
    </main>
  );
}

function Hero() {
  return (
    <section className="px-5 pt-2 pb-6 md:pt-4 md:pb-10">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
          Completely Free.
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
            <div className="hidden sm:block px-5 py-4 bg-[rgba(255,255,255,0.03)] font-semibold text-[#FFD700] uppercase tracking-wider text-xs">CoreTradeGlobal</div>
            <div className="hidden sm:block px-5 py-4 bg-[rgba(255,255,255,0.03)] font-semibold text-[#A0A0A0] uppercase tracking-wider text-xs">Traditional B2B</div>
            {COMPARISON_ROWS.map((row) => (
              <div key={row.feature} className="contents">
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] font-semibold text-white">{row.feature}</div>
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] text-[#FFD700] font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{row.ctg}</span>
                </div>
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] text-[#A0A0A0] flex items-center gap-2">
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
    <section className="px-5 pt-4 pb-2 md:pt-6 md:pb-4">
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
