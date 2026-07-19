/**
 * Bulk Upload — Learn/Guide page
 *
 * URL: /bulk-upload
 *
 * Marketing-style landing that explains how the self-serve CSV bulk
 * upload works, then routes to the actual /product/bulk action page.
 * Linkable from onboarding, the profile "Upload help" card, admin
 * emails, etc. Content is intentionally more instructive than sales-y
 * since users landing here already have intent (they have a product
 * catalog to import).
 */

'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Timer,
  UploadCloud,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const STEPS = [
  {
    icon: Download,
    title: '1. Download the template',
    body: "Grab the CSV file with the exact columns we expect — Product Name, Category, Price, Currency, Quantity, Unit, Description, Image URLs. Don't rename the headers.",
  },
  {
    icon: FileSpreadsheet,
    title: '2. Fill it in Excel or Google Sheets',
    body: 'One product per row. Prices as numbers, currencies as 3-letter codes (USD, EUR, TRY…). Paste image URLs comma-separated — we fetch and store them for you.',
  },
  {
    icon: UploadCloud,
    title: '3. Upload and review',
    body: 'Drop the file back on the upload page. We parse it in your browser and show a row-by-row check — valid ✅, needs-category ⚠️, invalid ❌. Fix any issues inline, then hit Publish.',
  },
];

const BENEFITS = [
  { icon: Timer, title: 'Minutes, not hours', body: 'A 100-product catalog goes live in about a minute of your time.' },
  { icon: ShieldCheck, title: 'Nothing publishes broken', body: 'Every row is validated in-browser before anything hits our database.' },
  { icon: Sparkles, title: 'Images auto-fetched', body: 'Give us public image URLs — we download, store and attach them to each product.' },
];

const FAQ = [
  {
    q: "What if my category isn't in your list?",
    a: 'You can leave the Category column blank and pick from a dropdown per-row on the review screen. Unmatched categories never block the upload — they just wait for your click.',
  },
  {
    q: 'What formats work for images?',
    a: 'Any publicly reachable URL that returns a JPG/PNG/WebP. Comma-separate multiple URLs in the Image URLs column and we\'ll pull them into your product gallery.',
  },
  {
    q: 'Can I upload thousands at once?',
    a: 'Self-serve uploads are capped at 100 products per file so image fetches finish within the request window. Need more? Split the file, or use "Request Help" and our team will handle bigger catalogs.',
  },
  {
    q: 'What happens if a row fails?',
    a: "Only the valid rows publish — invalid rows are listed with the exact reason so you can fix them and re-upload. Nothing partially breaks.",
  },
];

export default function BulkUploadGuidePage() {
  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-5">
        {/* Hero */}
        <section className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Add hundreds of products in seconds. <span className="bg-gradient-to-r from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">Not hours.</span>
          </h1>
          <p className="text-[#c8d3e0] text-lg max-w-2xl mx-auto mb-8">
            Skip the one-by-one form. Upload a CSV, we validate every row in your browser, you fix anything red and hit publish.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/product/bulk"
              style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-base hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] transition-all no-underline"
            >
              Start Bulk Upload
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-sm font-semibold hover:bg-[rgba(255,255,255,0.05)] transition-colors no-underline"
              style={{ color: '#ffffff' }}
            >
              How does it work?
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Benefits row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.6)] to-[rgba(15,27,43,0.85)] p-5">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,215,0,0.12)] border border-[rgba(255,215,0,0.3)] flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#FFD700]" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">{b.title}</h3>
                <p className="text-[#A0A0A0] text-sm">{b.body}</p>
              </div>
            );
          })}
        </section>

        {/* Steps */}
        <section id="how-it-works" className="mb-16">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-8 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(253,185,49,0.05)] border border-[rgba(255,215,0,0.35)] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#FFD700]" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-[#c8d3e0] text-sm leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CSV Format snippet */}
        <section className="mb-16">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4 text-center">What the CSV looks like</h2>
          <div className="rounded-2xl border border-[rgba(255,215,0,0.25)] bg-[#0B1523] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
              <span className="text-xs font-mono text-[#A0A0A0]">coretradeglobal-product-template.csv</span>
              <span className="text-[10px] uppercase tracking-wider text-[#FFD700] font-bold">Preview</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[#FFD700] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="text-left px-3 py-2 whitespace-nowrap">Product Name</th>
                    <th className="text-left px-3 py-2 whitespace-nowrap">Category</th>
                    <th className="text-left px-3 py-2 whitespace-nowrap">Price</th>
                    <th className="text-left px-3 py-2 whitespace-nowrap">Currency</th>
                    <th className="text-left px-3 py-2 whitespace-nowrap">Quantity</th>
                    <th className="text-left px-3 py-2 whitespace-nowrap">Unit</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  <tr className="border-b border-[rgba(255,255,255,0.04)]">
                    <td className="px-3 py-2 whitespace-nowrap">Organic Cotton T-Shirt</td>
                    <td className="px-3 py-2 whitespace-nowrap">Textile</td>
                    <td className="px-3 py-2 whitespace-nowrap">12.50</td>
                    <td className="px-3 py-2 whitespace-nowrap">USD</td>
                    <td className="px-3 py-2 whitespace-nowrap">1000</td>
                    <td className="px-3 py-2 whitespace-nowrap">piece</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap">Steel Rebar Grade 60</td>
                    <td className="px-3 py-2 whitespace-nowrap">Steel</td>
                    <td className="px-3 py-2 whitespace-nowrap">720</td>
                    <td className="px-3 py-2 whitespace-nowrap">USD</td>
                    <td className="px-3 py-2 whitespace-nowrap">50</td>
                    <td className="px-3 py-2 whitespace-nowrap">ton</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-xl md:text-2xl font-extrabold mb-6 text-center">Common questions</h2>
          <div className="space-y-3 max-w-3xl mx-auto">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-4 cursor-pointer"
              >
                <summary className="flex items-center justify-between text-white font-semibold list-none">
                  <span>{item.q}</span>
                  <ChevronDown className="w-4 h-4 text-[#A0A0A0] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-[#c8d3e0] text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center rounded-3xl border border-[rgba(255,215,0,0.3)] bg-gradient-to-br from-[rgba(255,215,0,0.1)] to-[rgba(253,185,49,0.03)] px-6 py-10">
          <h3 className="text-2xl md:text-3xl font-extrabold mb-2">Ready to import your catalog?</h3>
          <p className="text-[#c8d3e0] mb-6 max-w-lg mx-auto text-sm">
            The upload page walks you through it. If anything breaks, you can always come back here or ask our team.
          </p>
          <Link
            href="/product/bulk"
            style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-base hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] transition-all no-underline"
          >
            Start Bulk Upload
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}
