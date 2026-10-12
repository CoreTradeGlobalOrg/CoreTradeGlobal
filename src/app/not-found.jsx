/**
 * Custom 404 page.
 *
 * Rendered for unknown URLs and for notFound() calls in any route without a
 * closer not-found file. It sits directly under the root layout (no (main)
 * layout around it), so it brings its own Navbar and Footer.
 *
 * Links set color inline: the global `a { color }` rule in globals.css
 * overrides Tailwind text colors on anchors.
 */

import Link from 'next/link';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export const metadata = {
  title: 'Page Not Found | CoreTradeGlobal',
  robots: { index: false, follow: true },
};

const QUICK_LINKS = [
  { href: '/products', label: 'Products' },
  { href: '/requests', label: 'RFQs' },
  { href: '/categories', label: 'Categories' },
  { href: '/fairs', label: 'Trade Fairs' },
];

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-radial-navy text-white flex items-center justify-center px-5 pt-[calc(var(--navbar-height)+24px)] pb-16">
        <div className="w-full max-w-xl text-center">
          <p
            className="text-[96px] sm:text-[128px] font-extrabold leading-none tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #FFD700 0%, #FDB931 55%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </p>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Page not found</h1>
          <p className="mt-3 text-[#A0A0A0]">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FDB931] font-bold shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] transition-all"
              style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
            >
              Go to Homepage
            </Link>
            <Link
              href="/request/new"
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] font-bold shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(59,130,246,0.4)] transition-all"
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            >
              Get Free Quotes
            </Link>
          </div>

          <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <p className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-3">Or browse</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-4 py-2 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-sm font-medium hover:border-[rgba(255,215,0,0.4)] transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
