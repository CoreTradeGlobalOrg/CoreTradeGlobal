/**
 * Inquiry Thank-You Page
 *
 * URL: /pricing/inquire/thank-you
 *
 * Confirms the ad inquiry landed and gives the visitor two productive
 * exits — back to Pricing (compare tiers again) or into the platform
 * to explore products/RFQs while they wait for the team to reach out.
 */

'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight, LayoutGrid } from 'lucide-react';

export default function InquiryThankYouPage() {
  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-5 pt-8 md:pt-16 text-center">
        <div className="w-20 h-20 rounded-full bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-[#FFD700]" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Inquiry Received</h1>
        <p className="text-[#c8d3e0] text-base md:text-lg mb-2">
          Thanks for reaching out — your advertising inquiry is now on our team's desk.
        </p>
        <p className="text-[#A0A0A0] text-sm md:text-base mb-10">
          A member of the CoreTradeGlobal team will follow up within <strong className="text-white">1 business day</strong> with pricing, availability, and next steps.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/pricing"
            style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] transition-all no-underline"
          >
            Back to Pricing
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/products"
            style={{ color: '#ffffff' }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] font-semibold text-sm hover:bg-[rgba(255,255,255,0.1)] transition-all no-underline"
          >
            <LayoutGrid className="w-4 h-4" />
            Explore Products
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] p-5 md:p-6 text-left">
          <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-2">While you wait</p>
          <p className="text-[#c8d3e0] text-sm leading-relaxed">
            Feel free to browse the platform, list your products, and post RFQs. Everything on CoreTradeGlobal is free forever — the placement is an optional boost, not a gate.
          </p>
        </div>
      </div>
    </main>
  );
}
